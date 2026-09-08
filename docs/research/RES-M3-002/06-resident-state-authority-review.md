## 权威分类

| 状态                                               | 分类                                | 权威归属                              | M3 v1                                     |
| -------------------------------------------------- | ----------------------------------- | ------------------------------------- | ----------------------------------------- |
| identity/residentId/worldId/identityKind           | authoritative profile               | Resident/Identity                     | T01 fixture；不合并 auth                  |
| locationId                                         | authoritative world fact            | World Kernel                          | 只读；由 committed MOVE/TRAVEL event 改变 |
| homeLocationId                                     | authoritative reference             | Resident/World config                 | T01 生成；Life 只读                       |
| employment/workplace                               | authoritative domain ref            | Employment/Kernel；正式经济 M6        | M3 只读 fixture/reference                 |
| work schedule                                      | schedule config                     | Routine/Employment                    | 只算 due，不表示 WORK 已发生              |
| cash/food/inventory                                | authoritative resource              | Economy/Kernel；正式账本 M6           | 只读，Life 不扣/补资源                    |
| energy/hunger/social/stress/money_pressure/purpose | derived signal with anchor          | Life/World projection；字段范围需 ADR | world time + anchor + events lazy compute |
| sleepPressure                                      | derived decision signal             | Life calculation                      | 旧研究字段；4/6/7 冲突前不列正式 schema   |
| safety                                             | environment signal or deferred Need | World/Kernel/后续领域                 | 不未经 ADR 扩大 T02                       |
| conditionBand                                      | derived                             | Life Engine                           | 不写事实                                  |
| currentActivity/busyUntil                          | projection                          | Kernel outcome + event/query          | 不由 Life 直接 set                        |
| due obligation                                     | derived                             | Schedule + World Clock                | 每次规划计算                              |
| activeGoal/attempt/backoff                         | Life runtime                        | Life Engine                           | T03 才需要；与 world fact 分离            |
| decisionEpoch                                      | deterministic cursor                | Life/run manifest                     | 参与 key，不等于 world_seq                |
| lastActionRequestId                                | correlation reference               | Life/Kernel adapter                   | 只能用于 query outcome                    |

“权威”不等于“每分钟写表”。Needs 可以由 world-time anchor lazy 求值；真正权威是 anchor、world time、events 和 resources。Goal/attempt/backoff 不得成为 Life 偷写世界的通道。stress/money_pressure/purpose 若留在 T02，M6 前必须标为 fixture-derived/read-only signal。
