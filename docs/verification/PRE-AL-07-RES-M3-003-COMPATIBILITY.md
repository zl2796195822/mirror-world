# PRE-AL-07 / RES-M3-003 Compatibility Review

## Scope

本文件只对照只读研究分支 `RES-M3-003` 的正式输入进行兼容性复核。
研究 commit 为 `46511b78f75b1250c780059402879e67598c2f93`，该分支保持
`FREEZE = ON`，没有被 merge、cherry-pick 或作为 production implementation
dependency。正式事实以当前 main 和本任务新增的 contract、migration、Kernel
path 与 integration evidence 为准。

## Compatibility matrix

| RES-M3-003 requirement                             | Status      | Current-main evidence / boundary                                                                                                                                                                 |
| -------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Explicit World-Time driver                         | `SATISFIED` | `DeterministicSimulationDriver.runUntil`, `advanceWorldBy`, `runForDays` 使用显式 `Date`；没有 wall-clock scheduler。                                                                            |
| Global deterministic serial scheduler              | `SATISFIED` | 单 world、serial completion；activity completion phase 先于 decision-wake phase。                                                                                                                |
| Due key and stable order                           | `SATISFIED` | `m3-scheduler-v1`；按 due World Time、UUID bytes、wake reason、decision epoch，并使用明确 tie-break。                                                                                            |
| Durable due activity source                        | `SATISFIED` | `resident_runtime_states.activity_due_at_world_time` 的 bounded、world-scoped、read-only query。                                                                                                 |
| MOVE/SLEEP due completion                          | `SATISFIED` | due item 只调用 `completeResidentAction`；不由 driver 直接更新 runtime、resource 或 event。                                                                                                      |
| Exact 30 World Day endpoint                        | `DEFERRED`  | 本任务验证 bounded scheduler boundary 和 30-resident mixed batch，不执行 30×30 autonomous run；未来 manifest/harness 必须固定 43,200 World Minutes。                                             |
| Deferred wake boundary                             | `SATISFIED` | `DEFERRED_REPLAN` 可注册、读取并转换为 `DECISION_WAKE`；不包含 selected action。                                                                                                                 |
| Durable deferred wake persistence                  | `SATISFIED` | `scheduled_wake_registrations` 以 `(world_id, dedupe_key)` 去重，可重查询；当前没有 ack/delete，留给未来 Decision boundary。                                                                     |
| PAUSED / MAINTENANCE                               | `SATISFIED` | 不推进 World Time、不处理 due activity、不产生 scheduler fact；沿用现有 World Clock/Kernel policy。                                                                                              |
| Fairness for current bounded source                | `SATISFIED` | due rows 使用稳定顺序，step 最多 30 项；重试从 durable source 重新读取，未出现 resident 永久被跳过的路径。完整 life-loop fairness 仍未验收。                                                     |
| No per-resident timer / daemon / distributed queue | `SATISFIED` | red-line scan 与依赖审计均无 `setInterval`、`setTimeout`、worker、BullMQ、Redis queue。                                                                                                          |
| Lost lease/fence stop-and-recover                  | `PARTIAL`   | completion 有 resident `state_version` fence；没有 world driver lease/heartbeat/fence owner，列为 PRE-AL-GATE blocker。                                                                          |
| Gate observability                                 | `PARTIAL`   | `SchedulerStepResult` 提供 world time/seq、work、outcome、wake、failure、next due；完整 manifest、policy content hash、trace、lease state、day/event checkpoint 尚未实现。                       |
| Manifest and semantic hash                         | `DEFERRED`  | 本任务没有建立 `SimulationManifest`、canonical state 或 full semantic resimulation hash。                                                                                                        |
| Same-manifest batch/timing perturbation            | `DEFERRED`  | 未执行 full simulation re-run；当前只证明相同输入的 stable serial order 和 event sequence。                                                                                                      |
| Initial / work-boundary wake producers             | `PARTIAL`   | contract 与 durable registration 支持 `INITIAL_DECISION`、`WORK_BOUNDARY`，本任务只提供 read/register boundary，不生成 T04 decision。                                                            |
| Completion-before-decision ordering                | `SATISFIED` | activity completions 单独先处理；decision wakes 只在 completion phase 完成后返回。                                                                                                               |
| World Time advance policy                          | `SATISFIED` | 采用研究允许的 A 方案：先通过 Kernel 将 world time 推到显式 target，再处理 `due <= target`；completion event 使用该 World Time，不使用 runner wall clock。                                       |
| WorldSeq determinism                               | `PARTIAL`   | serial completion 的 world-local seq/order 在 30-resident integration 中稳定；opaque random event IDs 与完整 manifest identity canonicalization 尚未纳入证明。                                   |
| Runtime projection replay                          | `DEFERRED`  | M2 Event Ledger replay 保持可用；从 resident genesis + typed domain events 重建 runtime projection 的 reducer 尚未实现。                                                                         |
| Typed event registry and reducers                  | `DEFERRED`  | 当前 lifecycle payload 有 `schemaVersion` 和 replay validation；完整 registry、版本兼容矩阵及 resident reducer 留待 PRE-AL-GATE。                                                                |
| Research invariant E-04 contiguous refs            | `CONFLICT`  | 旧研究文字要求同一 outcome refs contiguous；正式 main contract 已修正为同 world、严格递增，允许其他 resident action 交错产生的合法 seq gap。该冲突已由 `packages/contracts` contract test 固化。 |
| Resource mutation/replay                           | `DEFERRED`  | M3 仍是 fixture-only read bridge；本任务不执行 EAT/BUY mutation，也不宣称 Economy/replay proof。                                                                                                 |
| 30-resident scheduler validation                   | `SATISFIED` | clean PostgreSQL integration 覆盖 30 个 resident 的 15 MOVE + 15 SLEEP mixed due batch、stable completion order、runtime terminal state。                                                        |
| Full 30×30 milestone evidence                      | `DEFERRED`  | 不属于 PRE-AL-07；不得据此改变 M3 Gate 状态。                                                                                                                                                    |

## Result

当前 main 已满足 PRE-AL-07 可以独立建立的 scheduler/driver、due completion、
deferred wake、pause、stable ordering、bounded processing 和 rebuildable source
边界。研究分支中依赖未来 full Gate 的内容保持 `PARTIAL` 或 `DEFERRED`，不被
本任务吸收。唯一文字冲突为 E-04 contiguous event refs，正式 main contract
已经按交错多 resident commit 的实际语义修正。
