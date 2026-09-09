# 03 Current Main Baseline

## Immutable observation point

`origin/main = 2e526d3b22209ba949584abf4e1f9505a7469e37`，commit message `docs: finalize pre-al-07 verification`；其父提交 `a3581a5db6500bb44282b19ccc5ada03d5c4beeb` 是 PRE-AL-07 正式实现。四份冻结研究的 common baseline 仍是较早的 `b3229aef5b820fc261443c7f6d8a50f9c3b473c6`；因此本包同时保留“研究当时事实”和“当前正式事实”两条时间线，不回写冻结研究。

## Formal state at this point

| Area                          | Current formal result                                                                              | Reconciliation use                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| M0/M1/M2                      | PASS                                                                                               | durable foundation available                                                               |
| M3                            | IN_PROGRESS                                                                                        | later research ports are not implementation-ready                                          |
| PRE-AL-01..06                 | PASS                                                                                               | outcome/observation/actor/resource/runtime/action/replan facts available                   |
| M3-T04                        | `BLOCKED_BY_PRE_ACTION_LOOP_GATE`                                                                  | no autonomous 30×30 claim                                                                  |
| PRE-AL-07                     | `PASS`；`ADR-0010-pre-al-07-deterministic-scheduler.md` 与 `PRE-AL-07-report.md` 已在 current main | M3 v1 driver/due/wake boundary 可作为当前 formal fact；full Gate extensions remain pending |
| M4/M5/M6/M7/M8/M9/M10 runtime | not implemented                                                                                    | research only                                                                              |

## Current authority map

- World clock and `worlds` row are Kernel-controlled; PAUSED/MAINTENANCE do not advance.
- `world_events` is append-only, world-scoped, ordered by `worldSeq`; current reserved event names do not prove producers/reducers exist.
- `KernelActionOutcome` durable statuses are `COMMITTED | REJECTED | CONFLICT`; `REUSED`/`IDEMPOTENCY_CONFLICT` are call dispositions; timeout is policy signal, not durable outcome.
- Runtime state is world/resident scoped; MOVE/SLEEP are `STARTED → COMPLETED`; location changes only at MOVE completion.
- `m3-observation-v1` exposes bounded read capabilities; Life Engine has no world-fact write path.
- Checkpoints/projections/caches are rebuildable; full resident/domain replay and autonomous driver are not current facts.
- Resident seed is 30 deterministic `NATIVE` fixture residents; it is not a complete M9 identity source or M6 economy authority. Current scheduler data adds a rebuildable `scheduled_wake_registrations` projection and does not create a generic queue.

## Explicit exclusions

The main worktree boundary remains protected: this package did not read or touch any uncommitted content. The current `origin/main` has committed migration files 0000–0009 and the PRE-AL-07 formal result; any other worktree content remains `WORK_IN_PROGRESS_NOT_AUTHORITY`.

## Current scheduler fact used by this reconciliation

`origin/main` now establishes: `Scheduler/Driver = WHEN`, `Life Engine = WHAT`, `World Kernel = CAN / COMMIT`; one bounded serial driver; completion before decision-wake output; due activity and deferred wakes are world-scoped rebuildable sources; no timer, Redis queue, generic job table or direct driver fact write. It explicitly leaves world driver lease/fence, typed event registry/reducers, resident projection replay, canonical manifest/hash and full 30×30 action-loop evidence outside PRE-AL-07.
