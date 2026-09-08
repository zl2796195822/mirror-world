## 判定规则

依据 `origin/main@6d123bc9eb797a15a6d382d0f1e91c5c747a70aa` 的实际代码、migration、M2 报告和 ADR。`AVAILABLE` 仅表示该 M2 能力存在，不表示 M3 领域能力存在。

| 能力                      | 判定      | 证据                                                                                | 限制                                                |
| ------------------------- | --------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| World Clock               | AVAILABLE | `world-clock.ts:31-66`、`world-clock-store.ts:40-125`、ADR-0002、M2-T01 integration | pull-driven；无 scheduler/lease                     |
| Action Contract           | AVAILABLE | `packages/contracts/src/action-contract.ts:1-75`、M2-T02 15 tests                   | 只校验 request shape                                |
| Kernel Validator          | AVAILABLE | `action-validator.ts:45-258`、稳定 KernelReasonCode、M2-T03 tests                   | 只消费调用方 snapshot，无原子 execution             |
| ActionRequest Persistence | AVAILABLE | `action-request-store.ts:48-110`、migration `0002_wandering_moonstone.sql`          | 只存 metadata/payload/fingerprint                   |
| Idempotency               | AVAILABLE | `(world_id,idempotency_key)` unique、相同 fingerprint duplicate                     | duplicate 不返回历史 outcome                        |
| Concurrent Duplicate      | AVAILABLE | `action-request.integration.test.mjs:93-101`                                        | 只验证请求行，不验证事实执行竞争                    |
| Conflict                  | AVAILABLE | 同 key 不同 fingerprint → conflict/KERNEL_CONFLICT                                  | 不是完整 execution conflict                         |
| Event Ledger              | AVAILABLE | `world-events-store.ts:91-172`、`0003_cold_viper.sql`、ADR-0005                     | payload 只有通用 schemaVersion                      |
| world_seq                 | AVAILABLE | world row lock + DB trigger 连续递增                                                | 无 resident/domain reducer                          |
| Checkpoint                | AVAILABLE | `world-checkpoint-store.ts:34-136`、`0004_old_ares.sql`                             | 仅 M2 replay snapshot                               |
| Full Replay               | AVAILABLE | `replayWorldEvents()`、`world-replay.ts:221-267`                                    | 非时间领域事件是 no-op                              |
| Checkpoint Suffix Replay  | AVAILABLE | `replayFromCheckpoint()`、`world-replay.ts:329-338`                                 | 无居民/资源/action result reducer                   |
| Stable Hash               | AVAILABLE | canonical SHA-256、M2-T05 report                                                    | 是 replay state hash，不是完整 ledger identity hash |
| World Isolation           | AVAILABLE | 所有 store 按 worldId 查询；wrong-world/A-B tests                                   | 无 actor/resident FK/query model                    |

## 关键解释

`ActionRequestPersistenceResult.accepted` 来自 `insert(actionRequests).returning()`，含义是“请求 metadata 已落库”，不是 ActionResult accepted、事实提交或事件产生。当前没有把 `action_requests` 串到 `commitWorldStateWithEventInTransaction()` 的 action executor。

M2 replay 对 `RESIDENT_MOVED`、`NEED_CHANGED`、`WORK_SHIFT_COMPLETED` 等非时间事件只做 schema 校验并保留 history digest，不改变 replay state；这是 M2-T05 明确边界，不能升级为居民事实 replay。

当前 schema 只有 `users`、`worlds`、`action_requests`、`world_events`、`simulation_checkpoints`；没有 actors、residents、locations、resources、action_results 或 observation_snapshots。

结论：M2 基础 Kernel/Replay 能力可用，执行反馈、durable observation、domain mutation 和 domain replay 仍是 PARTIAL/NOT AVAILABLE。可支持纯 fixture T01，不支持真实 Life Engine Action Loop。
