## M2 已定义与未定义

`MOVE` contract 只有 `{destinationId}`；validator 检查同 world、非原地、reachable edge。正式规格预期 `RESIDENT_MOVED` payload 有 `from/to/travelMinutes`。M2 没有 executor、duration、busy lock、in-flight state、MOVE_STARTED/completion callback 或 location mutation；payload 只有通用 schemaVersion 检查。因此 reachable 不等于 travel 已实现。

## 方案比较

| 方案                                            | Kernel | Replay          | Life              | 3D/M7                     | 30×30/scale             |
| ----------------------------------------------- | ------ | --------------- | ----------------- | ------------------------- | ----------------------- |
| A Instant MOVE                                  | 最低   | 简单但时间失真  | 易写，易瞬移/重复 | 只能补动画                | 30 人简单，隐藏占用冲突 |
| B duration action                               | 中高   | 需完成时间/结果 | 语义清楚          | 能同步目标移动            | 可用但需 ActionResult   |
| C STARTED/COMPLETED                             | 高     | 最完整          | 复杂，易过度设计  | 最适合长期在线            | 不应 M3 v1 引入         |
| D discrete arrival + presentation interpolation | 中     | 只重放离散事件  | 只等待 arrival    | 20Hz 仅 projection/client | 最小可扩展              |

## 推荐

采用 **D 的表现边界 + B 的离散 Kernel completion**：

1. Life 只提交现有 `MOVE {destinationId}`。
2. Kernel 用固定 edge/travel rule 计算 `travelMinutes`；到达前不改变 authoritative location。
3. 到达时一次提交版本化 `RESIDENT_MOVED`，并返回 committed event/seq。
4. 完成前 outcome 可为 PENDING，完成后 COMMITTED；同一 resident 有 in-flight MOVE 时不得再发 MOVE。
5. M7/客户端可以按 from/to/travelMinutes 插值；20Hz/60Hz 位姿不得进入 Kernel/Event Ledger。

这不是本任务实现。SLEEP `{}` 的固定 world-minute cost 也必须在 Action Loop 前冻结，否则 sleep adequacy/replay 无法定义。
