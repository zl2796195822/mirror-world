# 10 - 重试策略、双重超时机制与快照陈旧防御 (Retry, Timeout & Stale Defense)

## 1. 严格区分三层重试边界 (Three-Level Retry Taxonomy)

在复杂分布式与大模型系统中，“遇到错误就重试”是一种极度危险的野蛮做法。若不加区分地重试，会导致大模型账单翻倍、加剧数据库死锁、甚至在账户余额不足时引发连锁拒绝风暴。

镜界建立**三层严格隔离的受限重试体系（Bounded Retry Policy）**：

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 第一层: 提供商级重试 (Provider Retry)                                  │
│ - 针对: 瞬态网络断连、HTTP 502/503、HTTP 429 速率限制                  │
│ - 策略: 指数退避加抖动 (Exponential Backoff with Jitter)               │
│ - 硬上限: 最多 2 次重试 (Max Retries = 2)                             │
├────────────────────────────────────────────────────────────────────────┤
│ 第二层: 操作级重试 (Operation / Intent Regeneration Retry)            │
│ - 针对: 大模型输出无法被 JSON 解析、格式缺失字段、不满足 Zod Schema     │
│ - 策略: 将 Schema 校验错误信息反馈给模型进行定向修复 (Prompt Repair) │
│ - 硬上限: 最多 1 次再生 (Max Retries = 1)                             │
├────────────────────────────────────────────────────────────────────────┤
│ 第三层: 动作级重规划 (Action / Kernel Level Replan)                    │
│ - 针对: 内核返回 KERNEL_CONFLICT (实体版本跃迁) 或 资源不足受阻         │
│ - 策略: 绝对禁止原样重试！必须重新拉取最新观察快照进行全新规划        │
│ - 硬上限: 单轮决策最多 1 次重规划 (Max Replan = 1)                    │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.1 三层重试全场景仲裁矩阵

| 异常现象 / 错误码                    | 所属层级      | 允许重试？ | 重试机制与策略                                       | 耗尽重试后的兜底行为 (Fallback)                |
| :----------------------------------- | :------------ | :--------- | :--------------------------------------------------- | :--------------------------------------------- |
| **HTTP 502 / Socket Hangup**         | **Provider**  | **是**     | 退避重试：等待 500ms $\to$ 1500ms（加随机抖动）      | 判定 `FAILED`，记录告警，居民转入常规惯性动作  |
| **HTTP 429 Rate Limit**              | **Provider**  | **是**     | 依据响应头 `Retry-After` 退避重试，最多 1 次         | 自动降级为本地轻量小模型 (SLM) 或规则模型      |
| **JSON Parse Error / 截断乱码**      | **Operation** | **是**     | 带错误提示重新生成：仅补发 Schema 规范，限 1 次      | 放弃大模型推理，退回 Life Engine 确定性动作    |
| **Zod Schema 字段类型不匹配**        | **Operation** | **是**     | 带具体的 Field Error 重新生成，限 1 次               | 放弃大模型推理，退回 Life Engine 确定性动作    |
| **`KERNEL_CONFLICT` (快照版本滞后)** | **Action**    | **有条件** | **禁止原样重试！**重新拉取最新快照重新规划，限 1 次  | 放弃本次意图，保持原状等待下一个 Tick          |
| **`KERNEL_INSUFFICIENT_FUNDS`**      | **Action**    | **严禁**   | **绝对不重试！**资金不足是客观事实，重复提交毫无意义 | 触发“买不起”心理标记，转入离开或浏览其他廉价品 |
| **`KERNEL_INVALID_LOCATION`**        | **Action**    | **有条件** | 重新进行 A\* 寻路避障重规划，限 1 次                 | 居民停在原地并标记“道路受阻”                   |
| **`KERNEL_PERMISSION_DENIED`**       | **Action**    | **严禁**   | **绝对不重试！**属于越权违规行为                     | 强行终止并记入安全审计日志                     |

---

## 2. 双重超时体系：现实时钟 vs 世界时钟 (Dual Timeout Architecture)

在数字社会中，**物理现实时间（Wall Time）**与**世界虚拟时间（World Time）**具有截然不同的物理意义，超时控制必须严密解耦。

```mermaid
flowchart TD
    subgraph WallTimeDomain [物理现实时间域 (Wall Time - 基础设施与网络治理)]
        W1[HTTP 连接建立] -->|Provider Timeout (8s)| W2[AbortSignal 强行断开]
        W3[任务入队等待] -->|Queue Deadline (15s)| W4[超时丢弃并报警]
    end

    subgraph WorldTimeDomain [虚拟世界时间域 (World Time - 物理社会时序因果)]
        T1[意图生成时刻: WT=10:00:00] -->|携带 expiresAtWorldTime: 10:00:15| T2[网关与内核检查]
        T2 -->|当前世界时钟 WT=10:00:20| T3[判定过期, 拒绝执行 (TIMED_OUT)]
    end
```

### 2.1 物理现实时间超时 (Wall-Clock Timeout)

- **目标**：防止第三方大模型服务卡死导致 Node.js 事件循环或 Worker 线程池资源耗尽。
- **参数控制**：
  - `PROVIDER_TIMEOUT_MS = 8000` (8 秒)：单次调用大模型的网络硬上限，通过 `AbortController.abort()` 强制中断。
  - `OPERATION_QUEUE_DEADLINE_MS = 15000` (15 秒)：任务在 BullMQ 中排队等待的最大现实时间。若由于并发峰值排队超 15 秒，任务直接作废，不执行过期计算。

### 2.2 虚拟世界时间超时 (World-Time Expiry)

- **目标**：防止“在现实世界中排队延误的意图”跨越了虚拟世界的社会有效时间。
- **机制**：
  - 每一个 `ActionIntent` 包含可选的 `expiresAtWorldTime: string`（如设定为当前世界时间 + 15 秒虚拟时间）。
  - 当 ActionRequest 到达 World Kernel 事务准备裁决时，内核比对当前 `world.worldTime`。
  - 若 `world.worldTime > expiresAtWorldTime`，内核判定该动作在世界中已经“时过境迁”（例如：商店已经打烊、电梯已经关门关走了），返回拒绝状态，**绝不强行执行过期的历史意图**。

---

## 3. 快照陈旧版本栅栏机制 (Snapshot Fencing & Conflict Resolution)

### 3.1 为什么必须设置版本栅栏？

设想以下时序：

1. **$T_0$**：林默看到便利店货架上有最后一份便当（快照版本 $N$，实体版本 $V=1$）。
2. **$T_0 \sim T_5$**：林默的 Agent 正在后台耗时 5 秒思考“要不要买便当”。
3. **$T_2$**：另一位居民张伟走入商店，发起 `BUY` 动作，内核执行扣款并买走了这份便当，林默的实体版本被周围事件波及或世界事件推进至 $V=2$。
4. **$T_5$**：林默的 Agent 思考完成，向内核发出 `BUY` 意图。

**若无版本栅栏**：内核可能直接根据陈旧的记忆去执行扣款，若校验不细致将导致库存超卖，或林默以 5 秒前的认知强行购买已经不存在的商品。

### 3.2 栅栏解决流程规范 (Fencing Protocol)

1. **快照盖戳**：Agent 开始思考时，快照锁死基准版本：`basedOnActorVersion = actor.version`（值 $= 1$）。
2. **意图透传**：产出的 `ActionIntent` 必须将该值带给网关，转换为 `ActionRequest.expectedActorVersion = 1`。
3. **内核事务原子核验**：
   ```typescript
   // packages/world-kernel/src/action-validator.ts:127-131
   if (
     request.expectedActorVersion !== undefined &&
     request.expectedActorVersion !== actor.version
   ) {
     return reject("KERNEL_CONFLICT");
   }
   ```
4. **确定性降落**：
   - 当内核发现当前实体的真实版本已跃迁（$V = 2 \ne 1$），无条件抛出 `KERNEL_CONFLICT`。
   - 物理世界没有任何脏写入。
   - Agent 收到结果后，丢弃原意图，重新读取包含“便当已卖空”的最新快照，重新规划是改买面包还是离开。
