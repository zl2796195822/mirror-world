# 16 Scheduler / Wake Review

## What exists

The existing `m3-scheduler-v2` source contains deterministic `WORK_BOUNDARY` registration. `registerNextWorkBoundaryWakes` enumerates employed residents and deduplicates the next boundary. The action executor refreshes a future boundary after a WORK lifecycle. These are valid scheduler capabilities.

## What the failed run used

The Gate producer registers 30 `INITIAL_DECISION` wakes and does not call the batch `registerNextWorkBoundaryWakes` helper. Run-08 therefore records workplace-directed MOVE starts at or after 09:00, rather than a pre-shift wake that can start a real 10/15-minute commute. The exact boundary wake cannot solve that timing after the boundary has passed.

The artifact does not retain wake IDs/reasons or no-action decision rows. This supports a scheduler/preparation coverage gap at system level, but does not prove the exclusive per-resident branch for all 23 missed workers.

| Question                                                           | Finding                           |
| ------------------------------------------------------------------ | --------------------------------- |
| Does a deterministic boundary registration mechanism exist?        | yes, partial capability           |
| Is a bootstrap-wide/pre-shift preparation wake observed in run-08? | no                                |
| Is the current wake sufficient for commute-before-start?           | no                                |
| Is a new `WorkScheduler` needed?                                   | no; extend the existing scheduler |

## Required fix boundary

Integrate the existing scheduler's bootstrap-wide registration and a deterministic pre-shift preparation/commute trigger for each employed resident. The trigger must use world time and route duration, preserve deduplication/restart behavior, and never authorize late WORK. If the wake is present but the Life Engine declines a valid MOVE, that later evidence belongs to policy review; this run does not prove that secondary failure.

Source anchors: `packages/db/src/scheduled-wake.ts:153-296`, `packages/world-kernel/src/resident-action-executor.ts:952,1446`, and the absence of a registration call in `apps/api/scripts/m3-lifecycle-story-gate.mjs`.
