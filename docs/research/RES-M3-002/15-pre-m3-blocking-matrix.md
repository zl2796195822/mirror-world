## 矩阵

| 问题                                  | P 级        | T01 前                       | Action Loop 前     | M3 Gate 前              | 后续                      |
| ------------------------------------- | ----------- | ---------------------------- | ------------------ | ----------------------- | ------------------------- |
| ActionResult/committed event feedback | P1          | 不阻塞纯 fixture             | 必须               | 必须                    | —                         |
| Observation Snapshot/query port       | P1          | 不阻塞纯 fixture             | 必须               | 必须                    | —                         |
| Resident→ActorRef mapping             | P1 boundary | T01 必须冻结，不需 migration | 必须接入           | 必须                    | —                         |
| cash/food read boundary               | P1 boundary | 不阻塞 fixture wealth        | 必须只读 adapter   | 必须证明无 Life 写      | 正式 owner M6             |
| Needs 4/6/7                           | P2          | 不阻塞                       | T02 前 ADR         | 测试口径必须冻结        | money_pressure 与 M6 对齐 |
| MOVE/SLEEP semantics                  | P1 behavior | 不阻塞                       | 必须冻结           | 必须 integration/replay | —                         |
| Event payload schema                  | P2          | 不阻塞                       | 领域 event 前      | M3 event 必须覆盖       | M6 继续扩展               |
| causation_id                          | P2          | 不阻塞                       | 单步可暂缓         | 有 cascade 才提前       | M6 cascade 前             |
| scheduler/heartbeat/lease             | P2          | 不阻塞                       | continuous loop 前 | 30×30 Gate 必须         | —                         |
| bounded replan/backoff                | P1 behavior | 不阻塞                       | 必须               | 必须 fault injection    | —                         |
| full resident/domain replay           | P1 Gate     | 不阻塞                       | 可先 contract test | 必须                    | —                         |
| manifest mismatch                     | P3          | 不阻塞                       | 不阻塞             | 不阻塞                  | backlog                   |

## 最小 blocker 集合

开始 T01：没有 code blocker，只需冻结 `residentId/worldId/identityKind/actorRef` 边界。开始真实 Action Loop：必须先有 ActionResult、Observation、ActorRef 接入、readonly resource boundary、MOVE/SLEEP semantics、bounded replan 和 scheduler/driver。宣布 M3 Gate：还需 domain replay、versioned payload、pause/restart/fault evidence，且不冒充 M4/M6/M7/M10。
