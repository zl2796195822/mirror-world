# TYPED-EVENT-MATRIX

## 1. 现实

- 通用约束：payload 必须含 `schemaVersion >= 1`
- 无按 event type 的 registry schema
- MOVE/SLEEP 在 executor 内手工构造 versioned payload（`m3-action-semantics-v1`）

## 2. 矩阵

| Event                    | schemaVersion     | 是否 typed enough for M4 | 缺口                                 |
| ------------------------ | ----------------- | ------------------------ | ------------------------------------ |
| WORLD_TIME_ADVANCED      | 有                | 可（非社交源）           | 低                                   |
| RESIDENT_MOVE_STARTED    | 1 + policyVersion | 基本可                   | location 在 payload 非列             |
| RESIDENT_MOVE_COMPLETED  | 1 + policyVersion | 基本可                   | 同上                                 |
| RESIDENT_SLEEP_STARTED   | 1                 | 可（private）            | —                                    |
| RESIDENT_SLEEP_COMPLETED | 1                 | 可（private）            | —                                    |
| CONVERSATION_COMPLETED   | 未实现            | 不可                     | participants/content/location 未定义 |
| PURCHASE_COMPLETED       | 未实现            | 不可                     | item/amount/location                 |
| WORK/WAGE/RENT           | 未实现            | 不可                     | 经济语义                             |
| RELATIONSHIP_CHANGED     | 仅名字            | **v1 不应使用**          | 见 RELATIONSHIP-MODEL-V2             |
| MEMORY_CREATED           | 仅名字            | **v1 不应使用**          | 认知态非世界事实                     |

## 3. M4 前要求

在实现社交/经济事件时：

- 每个 type 有 versioned payload contract
- 明确 actor/target/location/participants
- 明确 public vs private fields
- replay-ready validation

## 4. 裁决

- **KEEP** `schemaVersion` 起步
- **P2 DURING M4**：typed event payload matrix 扩展到真实互动事件
- 不在本研究修改正式 Event schema
