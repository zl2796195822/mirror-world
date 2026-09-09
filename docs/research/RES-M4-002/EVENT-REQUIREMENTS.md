# EVENT-REQUIREMENTS

## 1. 分类标准

- **P1 BEFORE M4**：缺了就无法回答“谁对谁做了什么、在哪里”
- **P2 DURING M4**：可在 M4 实现中补齐
- **P3 LATER**：后续增强

## 2. 当前事件字段对 M4 的支撑

| 能力                           | 现状                                | 级别                                  |
| ------------------------------ | ----------------------------------- | ------------------------------------- |
| event type                     | 有；MOVE/SLEEP 已写，多类仅预留     | KEEP                                  |
| worldId / worldSeq             | 有                                  | KEEP                                  |
| actorId                        | 有（nullable）                      | P2 强化约定                           |
| targetId                       | 有（nullable；MOVE 用 destination） | P2                                    |
| location                       | **表列缺失**；仅 MOVE/SLEEP payload | **P1 RISK**                           |
| occurredAt world time          | 有                                  | KEEP                                  |
| correlationId                  | 有（常=request id）                 | KEEP                                  |
| causationId                    | 无                                  | P2→M4 决策见 CAUSATION 文档           |
| typed payload schema           | 仅 `schemaVersion` 通用校验         | P2                                    |
| interaction events (TALK etc.) | 无 executor                         | P1 scope dependency（非 schema 破坏） |

## 3. P1 architecture risk

若未来社交事件继续把 location 只塞进自由 payload，而没有稳定 envelope 约定：

- perception eligibility 无法统一解析
- memory lineage 的 where 不可靠
- relationship projection 难以审计

**建议（研究，不实现）**：

- 为领域事件定义 typed perception envelope 要求
- 或未来 migration 增加 `world_events.location_id`（nullable）
- 在此之前，M4 设计必须把 location extraction contract 写死

## 4. 不要求 PRE-AL-06 膨胀

本研究 **不要求** PRE-AL-06 为 M4 加功能。  
仅标记 future M4 prerequisite / P1 risk。
