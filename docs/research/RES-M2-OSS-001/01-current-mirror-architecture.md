# 01 - 镜界当前架构实况核验报告 (Current Mirror Architecture)

- **评估基线**: Git Commit `b96c04982486f34aeedb07eb2c4265c4ff024076`（M2-T04 通过状态）
- **核验方式**: 真实代码与数据库 Migration 逐行核对（绝不以未来文档规划替代真实实现）
- **目标**: 彻底清点镜界在进入 M2 开源研究节点时，哪些链路已经真正落地，哪些链路仅停留在规格设计。

---

## 1. 真实代码执行链路全景图

根据当前仓库中的真实源码（`packages/world-kernel`、`packages/contracts`、`packages/db`），当前已落地的执行链路如下：

```mermaid
flowchart TD
    subgraph Client / Caller Layer
        Input[外部调用 / 领域调用]
    end

    subgraph Contracts Layer [@mirror/contracts]
        AC[Action Contract / Zod Schema]
        Input -->|safeParseActionRequest| AC
    end

    subgraph World Kernel Layer [@mirror/world-kernel]
        WC[World Clock / advanceWorldClock]
        KV[Kernel Validator / validateActionRequest]
        FP[Fingerprint / SHA-256 Canonical JSON]
        ARStore[Action Request Store / persistValidatedActionRequest]
        EVStore[Event Ledger Store / commitWorldStateWithEvent]

        AC -->|ActionRequest| KV
        WC -.->|注入当前 worldTime| KV
        KV -->|Validation Success| FP
        FP --> ARStore
    end

    subgraph Database Layer [PostgreSQL 16]
        WTable[(worlds 表)]
        ARTable[(action_requests 表)]
        EVTable[(world_events 表)]
        Triggers[DB Triggers: 防修改/防删除/防跳序]

        WC <-->|SELECT FOR UPDATE / UPDATE| WTable
        ARStore <-->|INSERT ON CONFLICT| ARTable
        EVStore <-->|SELECT FOR UPDATE / INSERT event + UPDATE world_seq| EVTable
        EVStore <-->|更新 world state| WTable
        Triggers -.->|强制约束| EVTable
        Triggers -.->|强制递增 1| WTable
    end

    classDef done fill:#d4edda,stroke:#28a745,color:#155724;
    classDef partial fill:#fff3cd,stroke:#ffc107,color:#856404;
    classDef missing fill:#f8d7da,stroke:#dc3545,color:#721c24;

    class AC,WC,KV,FP,ARStore,EVStore,WTable,ARTable,EVTable,Triggers done;
```

---

## 2. 核心模块已实现与未实现状态细目表

| 核心组件                   | 真实代码文件                                                                                              | 当前实现状态 | 真实能力与边界说明                                                                                                                                                                                                                                                                                                                                           | 尚未实现的内容                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **World Clock**            | `packages/world-kernel/src/world-clock.ts`<br>`world-clock-store.ts`                                      | **已实现**   | 1. 显式注入 wall-clock。<br>2. 支持 `RUNNING`、`PAUSED`、`MAINTENANCE`。<br>3. 开发态倍率支持 1x/10x/100x，生产态强制 1x 且禁止回拨。<br>4. 时间实际推进通过 PostgreSQL 行锁事务提交，并生成 `WORLD_TIME_ADVANCED` 账本事件。                                                                                                                                | 1. 无常驻后台 tick 循环（目前依赖 API 主动触发或测试调用）。<br>2. 无追赶模拟（catch-up）机制。                                                      |
| **Action Contract**        | `packages/contracts/src/action-contract.ts`                                                               | **已实现**   | 1. 严格 Zod 4.5.4 校验。<br>2. 覆盖 `MOVE`、`EAT`、`SLEEP`、`WORK`、`TALK`、`BUY` 六类参数结构。<br>3. 严格拒绝未知字段（`.strict()`）。<br>4. 包含 `id`、`worldId`、`actorId`、`requestedBy`、`idempotencyKey`、`traceId`、`expectedActorVersion`。                                                                                                         | 1. 不包含业务前置条件（纯格式与数值边界）。<br>2. 仅有 6 种基础动作，无扩展动作。                                                                    |
| **Action Request 表**      | `packages/db/src/schema.ts`<br>`0002_wandering_moonstone.sql`                                             | **已实现**   | 1. 保存已验证请求元数据、完整 payload 与 SHA-256 指纹。<br>2. `(world_id, idempotency_key)` 唯一索引。<br>3. 字段 check constraints 约束枚举。                                                                                                                                                                                                               | 1. 不保存执行状态（无 `status` 字段记录 PENDING/EXECUTED/FAILED）。<br>2. 不保存关联生成的事件 ID。                                                  |
| **Kernel Validator**       | `packages/world-kernel/src/action-validator.ts`                                                           | **已实现**   | 1. 纯函数设计，依赖显式传入的只读 Snapshot（world, actors, locations, items）。<br>2. 严格按序校验：World ID -> Actor 存在与 ACTIVE -> Requester 权限 -> World RUNNING -> 动作世界时间 <= worldTime -> Actor 版本一致性 -> 领域能力/空间/资源/资金。                                                                                                         | 1. 领域事实（居民、地点、背包、商店）**尚未落库**，当前仅靠调用方显式提供内存 Snapshot 进行测试。<br>2. 校验与持久化未合成单一原子入口。             |
| **Idempotency & Conflict** | `packages/world-kernel/src/action-request-store.ts`                                                       | **已实现**   | 1. 规范化 JSON 排序后计算 SHA-256 fingerprint。<br>2. 在 PG 事务中利用唯一约束进行原子插入。<br>3. 相同 key 相同 fingerprint 返回 `KERNEL_DUPLICATE_REQUEST`。<br>4. 相同 key 不同 fingerprint 返回 `KERNEL_CONFLICT`。                                                                                                                                      | 1. 重复请求无法获取既往执行结果（ActionResult），仅能返回已拒绝重复。                                                                                |
| **Event Ledger**           | `packages/world-kernel/src/world-events-store.ts`<br>`packages/db/src/schema.ts`<br>`0003_cold_viper.sql` | **已实现**   | 1. `world_events` append-only 表。<br>2. `world_seq` 单世界严格单调连续自增。<br>3. `WORLD_EVENT_TYPES` 包含 14 种事件类型注册。<br>4. 强制 `payload.schemaVersion >= 1`。<br>5. 数据库 Trigger 物理拦截 UPDATE 与 DELETE。<br>6. Trigger 校验事件插入序号必须为 `world_seq + 1`，世界序号更新每次只能 +1，并在事务提交期检查 `world_seq = max(event.seq)`。 | 1. 目前仅时钟推进自动生成 `WORLD_TIME_ADVANCED`，领域动作尚未生成真实事件。<br>2. `world_events` 表无 `causation_id` 字段（仅有 `correlation_id`）。 |
| **ActionResult**           | 无                                                                                                        | **未实现**   | 架构文档提及概念。                                                                                                                                                                                                                                                                                                                                           | 真实代码中完全不存在 `action_results` 表或返回类型。                                                                                                 |
| **Checkpoint**             | 无                                                                                                        | **未实现**   | 架构文档提及 M2-T05。                                                                                                                                                                                                                                                                                                                                        | 数据库无 `world_checkpoints` 表，Kernel 无快照保存与加载代码。                                                                                       |
| **Deterministic Replay**   | 无                                                                                                        | **未实现**   | 架构文档提及 M2-T05。                                                                                                                                                                                                                                                                                                                                        | 无从事件账本顺序回溯状态的代码，无状态哈希对比验证机制。                                                                                             |
| **Domain State Tables**    | 无                                                                                                        | **未实现**   | 文档提及 `residents`, `locations`, `items`, `accounts`。                                                                                                                                                                                                                                                                                                     | 数据库仅有 `users`, `worlds`, `action_requests`, `world_events` 4张表。领域持久化尚未建立。                                                          |
| **Simulator / Tick Loop**  | 无                                                                                                        | **未实现**   | 架构文档提及。                                                                                                                                                                                                                                                                                                                                               | 无后台 1Hz/20Hz 循环驱动器，无调度队列。                                                                                                             |
| **AI Agent Runtime**       | 无                                                                                                        | **未实现**   | 属于 M3/M5 范围。                                                                                                                                                                                                                                                                                                                                            | 无 LLM 接口、无记忆检索、无决策 Loop。                                                                                                               |

---

## 3. 当前架构中极其重要的事实确认

1. **Replay 尚未存在**：
   未来文档虽然定义了基于事件账本和 Checkpoint 的确定性回放，但在当前 M2-T04 代码基线上，**Replay 机制一行代码都未实现**。我们拥有的只是具备 World-Local Seq 和防篡改约束的 `world_events` 表。
2. **领域事实表尚未建立**：
   目前 PostgreSQL 数据库仅包含系统地基表（`users`、`worlds`、`action_requests`、`world_events`）。诸如居民位置、饥饿值、金钱、物品等，在数据库中**没有任何实体表**。`action-validator.ts` 之所以能工作，是因为它设计为接收调用方传入的内存 Snapshot。
3. **ActionRequest 与 Event 的当前脱节**：
   当前代码中，`persistValidatedActionRequest` 只是将通过校验的请求记入 `action_requests` 表；而 `commitWorldStateWithEventInTransaction` 只是用于将 `worlds` 状态变化和事件一起写入。**当前尚未形成“ActionRequest 消费 -> 产生领域状态变更 -> 记录领域 Event”的闭环驱动管道**。这一步正是后续任务的核心。
4. **幂等存储缺少结果缓存**：
   当同一个 `idempotencyKey` 重复提交时，系统能正确识别出 `duplicate`，但由于当前未持久化执行结果或事件关联，调用方无法知道该请求此前产生的具体事件是什么。
