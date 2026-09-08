# 10 - 事件账本与重放能力专项审查报告 (Event Replay Review)

本专项审查旨在回答一个决定 M2 里程碑根基的关键问题：
**当前镜界已落地的 Event Ledger（M2-T04）是否包含足够的信息以支撑未来的确定性重放（Deterministic Replay）与状态快照（Checkpoint）？**

---

## 1. Event Ledger 字段与信息量逐项审查表

审查对象：`packages/db/src/schema.ts` 中的 `worldEvents` 表定义与 `packages/world-kernel/src/world-events-store.ts`。

| 审查维度                  | 当前代码实现事实                                                                           | 重放 (Replay) 支撑度评估                                                                                                                                                                      | 缺陷分级 (Gap Classification)                    | 改进与演进建议                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **1. Event Type**         | `world_events.type: text`<br>受 `WORLD_EVENT_TYPES` 14 种强类型联合字面量约束。            | **充足 (Sufficient)**。<br>事件类型划分细致（`RESIDENT_MOVED`、`WAGE_PAID`、`NEED_CHANGED` 等），重放器可通过模式匹配分发给不同领域 Reducer。                                                 | **PASS**                                         | 保持类型常量表收敛，新增类型必须修改登记。                                                           |
| **2. Payload**            | `world_events.payload: jsonb`<br>Kernel 强制校验 `schemaVersion` 为正整数。                | **充足 (Sufficient)**。<br>可容纳任意确定性状态演变所需的增量参数或全量字段。                                                                                                                 | **CAN WAIT** (待领域事件落地时补充具体 Zod 契约) | 领域事件（如位移、转账）的 Payload 内部字段目前未定义独立 Zod Schema，建议在各领域落地时补齐强类型。 |
| **3. World ID**           | `world_events.world_id: uuid`<br>外键引用 `worlds.id`，且建有 `(world_id, seq)` 唯一索引。 | **充足 (Sufficient)**。<br>多世界间事件物理强隔离，重放器可在单个世界内进行独立线性回放。                                                                                                     | **PASS**                                         | 保持现有唯一索引设计。                                                                               |
| **4. Actor / Target**     | `actor_id: uuid` (可选)<br>`target_id: uuid` (可选)                                        | **充足 (Sufficient)**。<br>明确指出行为主体与受体，便于重放器做基于 Actor 的局部状态投影。                                                                                                    | **PASS**                                         | 保持字段设计。                                                                                       |
| **5. World Time**         | `world_events.occurred_at: timestamp with time zone`                                       | **充足 (Sufficient)**。<br>代码中由 Kernel 保证使用推进后的世界时间（`next.worldTime`），而非机器现实时间，避免时钟倒退。                                                                     | **PASS**                                         | 严禁在事件写入时回退为物理时钟 `new Date()`。                                                        |
| **6. Sequence (序号)**    | `world_events.seq: bigint`<br>世界内从 1 开始单调连续递增，Trigger 拦截任何跳序或重复。    | **核心支柱 (Critical Pass)**。<br>绝对连续的整型序号是事件溯源（Event Sourcing）保证确定性全序（Total Ordering）的生命线。                                                                    | **PASS**                                         | 坚守当前数据库 Trigger 的单步递增校验。                                                              |
| **7. Request Relation**   | 当前表结构中**没有独立的 `request_id` 字段**。                                             | **基本满足，但存在工程隐患**。<br>目前依赖 `correlation_id` 存储外部 Request ID。虽可通过查询关联，但无法做物理外键约束。                                                                     | **CAN WAIT**                                     | 当前可通过契约约定 `correlationId = requestId`；建议在 M2-T05 或 M3 增加可选的 `request_id` 物理列。 |
| **8. Causation (因果链)** | 当前表结构中**没有 `causation_id` 字段**。                                                 | **尚不构成阻断**。<br>在 M2 单步动作模型下，一个 Request 对应一个 Event，`correlation_id` 兼具关联与因果；但在未来多步级联事件（如工作完成触发自动发薪）中，无法追溯是由哪个前序 Event 派生。 | **FUTURE OPTIMIZATION**                          | 随着复杂级联事件出现，再补充 `causation_id`。                                                        |
| **9. Correlation**        | `world_events.correlation_id: uuid NOT NULL`                                               | **充足 (Sufficient)**。<br>全链路分布式跟踪与请求聚合能力完备。                                                                                                                               | **PASS**                                         | 保持强制 NOT NULL 约束。                                                                             |
| **10. Schema Version**    | `payload.schemaVersion` 必须存在且 `>= 1`。                                                | **充足 (Sufficient)**。<br>为未来数月甚至数年后的 Event 结构演进（Schema Migration）与重放兼容预留了版本字段。                                                                                | **PASS**                                         | 保持校验器中的正整数检查。                                                                           |

---

## 2. 结论判定：是否能够支撑未来 Replay？

**核心结论：YES (完全能够支撑)**。

当前 M2-T04 落地的 Event Ledger 在物理存储层、一致性保护层（触发器防篡改、防删除、防跳序）和字段丰富度上，**已经具备了事件溯源确定性重放的全部数学与工程基础**：

1. 单世界内的连续单调序号 (`seq`) 保证了重放执行顺序的唯一性；
2. 记录的是 `occurred_at`（世界逻辑时间）而非机器物理时间，消除了服务器硬件时钟漂移；
3. `payload` 携带版本号与 JSON 结构，支持状态机确定性增量应用；
4. `worlds.seed` 为初始状态提供了可重现的随机数发生源。

---

## 3. 审查发现缺口的分级与处置时机

经过严密审查，发现的细节缺口均**不属于阻断 M2 Gate 的缺陷**：

### A. BLOCKER FOR M2 GATE: 0 项

- 无。当前数据结构与事务逻辑完全满足 M2-T04 定义之门禁标准。

### B. CAN WAIT (可在 M2 Gate 后、进入领域模型前处理): 2 项

1. **Request 与 Event 的直接反向指针**：
   - _现状_: `action_requests` 表没有记录成功执行后生成的 `event_id` 或 `event_seq`；`world_events` 没有独立的 `request_id` 强外键。
   - _影响_: 外部客户端重复查询某请求的结果时，需要通过 `correlation_id` 进行扫表匹配。
   - _建议_: 在 M2-T05 或 M3 数据字典完善时，统一建立规范或增加轻量索引。
2. **领域事件 Payload 的细粒度 Zod 契约**：
   - _现状_: 当前 Kernel 仅检查 `payload.schemaVersion`，未对具体 14 种事件的内部 Payload 结构写死 Zod 校验。
   - _影响_: 不影响底层时钟事件；但未来业务写入时若 Payload 字段不严谨可能影响重放稳定性。
   - _建议_: 随着具体业务开发（如 M3 居民移动、M4 记忆、M6 经济），逐一补充各领域事件的 Zod Schema。

### C. FUTURE OPTIMIZATION (未来规模化与级联演进优化): 1 项

1. **显式 `causation_id` 引入**：
   - _说明_: 当未来出现由系统事件自动触发连锁次生事件（Event Cascade）时，引入 `causation_id` 以构建完整的事件因果 DAG 图。
