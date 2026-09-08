# 09 - 内核执行结果闭环需求规格 (Kernel Action Outcome Requirements)

> **注**：本文件同时作为 `ACTION_OUTCOME_REQUIREMENTS.md` 归档。本研究不修改任何现有 M2/M3 代码，本文件旨在为 Pre-M3 / M5 动作反馈闭环提供确定性的契约需求输入。

---

## 1. 既有架构缺口回顾 (The ActionResult Gap)

在 `RES-M2-OSS-001`（发现 `MIRROR-FIND-001`）与 `RES-M3-002`（专题 03）的严格审查中，已确认当前镜界代码存在一个关键的**闭环断链**：

1. **当前代码现状 (`packages/world-kernel/src/action-request-store.ts`)**：
   - 当调用 `persistValidatedActionRequest` 时，系统仅将校验合法的请求写入 `action_requests` 表。
   - 当外部重试同一 `idempotencyKey` 时，系统仅能返回 `{ status: "duplicate", reasonCode: "KERNEL_DUPLICATE_REQUEST" }`。
2. **闭环缺失导致的灾难后果**：
   - **对于 M3 Life Engine**：居民发出了 `MOVE` 动作，但无法得知该动作究竟有没有被内核接纳并在世界中真正位移，导致下一 Tick 的作息规划无法对齐；
   - **对于 M5 Agent Runtime**：大模型费时 5 秒思考做出的决策，通过网关提交后变成了“黑盒黑洞”。Agent 既不知道请求是成功转化为客观事件、被内核规则拒绝、还是因为实体版本冲突而失效。这导致 Agent 无法感知失败原因，彻底丧失了重规划（Replanning）的能力。

---

## 2. KernelActionOutcome 概念契约需求规格

为了使 Agent Runtime 与 Life Engine 能够获得完备的因果闭环反馈，未来内核必须提供强类型的执行结果契约：

```typescript
/**
 * 世界内核动作执行结果契约 (KernelActionOutcome)
 * 供 Pre-M3 与 M5 动作执行引擎实现的推荐标准
 */
export type KernelActionOutcomeStatus =
  | "ACCEPTED" // 内核成功执行, 状态已变更, 事件已入账
  | "REJECTED" // 内核业务规则纯函数校验不通过 (如余额不足、不可达)
  | "CONFLICT" // 实体版本跃迁冲突 (expectedActorVersion 不匹配)
  | "DUPLICATE" // 命中历史幂等请求, 附带历史执行的真实结果
  | "TIMED_OUT"; // 请求在网关队列排队超时, 未能进入内核事务

export interface KernelActionOutcome {
  /** 关联的动作请求 ID (UUID) */
  readonly requestId: string;
  /** 所属世界 ID */
  readonly worldId: string;
  /** 行动者居民 ID */
  readonly actorId: string;
  /** 客户端指定的幂等 Key */
  readonly idempotencyKey: string;

  /** 执行状态结果 */
  readonly status: KernelActionOutcomeStatus;

  /** 机器可判定的稳定原因码 (仅在 REJECTED / CONFLICT / DUPLICATE 时存在) */
  readonly reasonCode?:
    | "KERNEL_INVALID_ACTION"
    | "KERNEL_ACTOR_NOT_FOUND"
    | "KERNEL_PERMISSION_DENIED"
    | "KERNEL_INVALID_LOCATION"
    | "KERNEL_INSUFFICIENT_FUNDS"
    | "KERNEL_INSUFFICIENT_RESOURCE"
    | "KERNEL_CONFLICT"
    | "KERNEL_DUPLICATE_REQUEST"
    | "WORLD_NOT_RUNNING"
    | "GATEWAY_QUEUE_TIMEOUT";

  /** 该失败是否允许重试/重规划 (Retryability Guide) */
  readonly isRetryable: boolean;

  /** 成功时关联的事实凭据 (仅在 ACCEPTED 或 DUPLICATE(ACCEPTED) 时存在) */
  readonly committedFacts?: {
    /** 本次动作产生的主事件 ID 列表 (如 RESIDENT_MOVED, PURCHASE_COMPLETED) */
    readonly committedEventIds: readonly string[];
    /** 提交时刻的世界单调事件序列号 */
    readonly committedWorldSeq: number;
    /** 动作完成时刻的世界时钟 */
    readonly committedWorldTime: string;
    /** 动作执行完成后的 Actor 最新版本号 */
    readonly resultingActorVersion: number;
  };

  /** 审计追踪元数据 */
  readonly traceId: string;
  readonly executedAtWallTime: string;
}
```

---

## 3. 六种状态场景的生命周期与处理指南

| 状态值          | 含义与底层原因                                   | 是否产生世界事件               | Agent Runtime 应对策略                                                           | Life Engine 应对策略                   |
| :-------------- | :----------------------------------------------- | :----------------------------- | :------------------------------------------------------------------------------- | :------------------------------------- |
| **`ACCEPTED`**  | 请求合法，内核事务原子提交，世界状态已变更。     | **产生** (写入 `world_events`) | 清理挂起标记，记录成功日记，等待下一次自然唤醒。                                 | 更新居民内部状态，推进下一个作息步骤。 |
| **`REJECTED`**  | 参数非法、权限不足或资源匮乏（如余额不足）。     | **不产生**                     | **不可盲目原样重试**。根据 `reasonCode` 触发单次重规划（如选择便宜商品）或放弃。 | 标记目标受挫，寻找替代资源或回家。     |
| **`CONFLICT`**  | 快照陈旧，在 Agent 思考期间实体版本已跃迁。      | **不产生**                     | **允许重新观察**。丢弃原有决策，拉取最新 `WorldObservationSnapshot` 重新思考。   | 直接刷新内存最新实体投影，重排动作。   |
| **`DUPLICATE`** | 网络重试命中已有请求，直接返回历史真实执行结果。 | 取决于历史结果                 | 解析其中的 `committedFacts`，如同正常完成一样收敛。                              | 同上。                                 |
| **`TIMED_OUT`** | 请求在排队期间世界时钟已前进，已失去时效性。     | **不产生**                     | 放弃本次意图，释放资源，转入空闲。                                               | 重新评估当前作息需求。                 |

---

## 4. 数据库持久化升级建议 (供 Pre-M3 数据库变更参考)

当前 `action_requests` 表（`packages/db/src/schema.ts`）缺少执行状态回写字段。为了在 Pre-M3 中支持真正的幂等闭环与结果溯源，建议在未来 Migration 中为 `action_requests` 增加如下可选字段：

```sql
-- 推荐未来扩充字段 (不在本研究执行，仅供前置规格参考)
ALTER TABLE action_requests ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'PENDING';
ALTER TABLE action_requests ADD COLUMN reason_code VARCHAR(64);
ALTER TABLE action_requests ADD COLUMN committed_event_id UUID REFERENCES world_events(id);
ALTER TABLE action_requests ADD COLUMN committed_world_seq BIGINT;
ALTER TABLE action_requests ADD COLUMN result_payload JSONB;
```

如此一来，当网络断连导致 Agent 再次发起相同请求时，系统可直接在 `action_requests` 表中点查出此前真实的执行结果直接返回，彻底消除重复扣款或未知状态风险。
