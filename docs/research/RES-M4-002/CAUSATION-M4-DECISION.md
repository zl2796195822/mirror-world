# CAUSATION-M4-DECISION

## 1. 现状

- `world_events.correlation_id` not null
- 当前 MOVE/SLEEP 将 ActionRequest id 作为 correlationId
- `causation_id` 列：**UNAVAILABLE**
- Outcome↔ordered events association 已能回答“这次 action 提交了哪些事件”

## 2. 问题

M4 是否必须有独立 `causation_id`？

### 已足够的部分

- Action causality：`action_requests.id ↔ kernel_action_outcomes ↔ events`
- 同一 action 的 STARTED/COMPLETED 已由 correlation/outcome 串联

### 仍不够的部分

- 事件之间的跨 action 因果（例如 TALK 传闻导致后续 MOVE）
- 未来 second-hand / conversation lineage
- 叙事级“因为 A 发生了 B”

## 3. 决策

**CAUSATION-M4-DECISION = P2 ACCEPTED RISK，但 M4 设计必须兼容未来 causation。**

- 不把“立刻加 causation_id”升为 M4 开工硬阻塞
- 也不继续把它当可忽略装饰
- M4 MemorySourceRef / relationship lineage 必须允许未来补 causation 而不推翻模型

### 分级

| 场景                           | 需要                                       |
| ------------------------------ | ------------------------------------------ |
| 同一 ActionRequest 内事件链    | 现有 correlation/outcome **足够**          |
| 跨事件认知因果（记忆为何形成） | memory source lineage 自建                 |
| 世界事件因果图                 | future `causation_id` 或 typed parent refs |

## 4. 结论

- PRE-AL-05 后 **不必**因 causation 阻塞 M4 架构研究
- 正式 M4 前若要做 narrative causality，应在 event envelope ADR 中一并裁决
- 当前继续记 P2，避免无必要膨胀 M3
