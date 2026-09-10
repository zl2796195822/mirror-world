# 10 Failure and Bounded Replan Specification

The existing `m3-replan-v1` contract and budgets remain authoritative. New
failure names are classifications, not unregistered World Event types.

## Failure matrix

| Condition                                              | Classification                                     | Directive                                                              |
| ------------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------- |
| world paused/maintenance                               | `WORLD_NOT_RUNNING`                                | `STOP(WORLD_NOT_RUNNING)`; future wake after resume                    |
| stale actor/runtime/resource version                   | `STALE_STATE`                                      | `REOBSERVE_NOW`, at most 2 conflict recoveries                         |
| resident already active                                | `STALE_STATE` or `PERMANENT_INVALID` after re-read | reobserve, then stop if unchanged                                      |
| wrong location/reachability/capability                 | `PERMANENT_INVALID`                                | alternate candidate/replan, max 2 replans                              |
| no food or food resource version unavailable           | `RESOURCE_UNAVAILABLE`                             | alternate candidate, otherwise defer 2/4/8/16/32 minutes, cap 60       |
| participant missing/inactive/busy/different world/self | `PERMANENT_INVALID`                                | alternate deterministic participant, otherwise bounded social defer    |
| reciprocal TALK race                                   | `STALE_STATE`                                      | stable winner; loser reobserves, max 2 recoveries                      |
| missed WORK start / `LATE` obligation                  | `PERMANENT_INVALID`                                | stop this shift and schedule next `WORK_BOUNDARY`; no same-shift retry |
| completion read before due                             | `TEMPORARY_NOT_DUE`                                | retain due source; no replan spin                                      |
| completion invariant/corrupt payload                   | `INTERNAL_ERROR`                                   | rollback and STOP; no partial release                                  |
| duplicate request/completion                           | success/reuse                                      | return existing outcome, no side effect                                |
| same idempotency key, different payload                | `IDEMPOTENCY_ERROR`                                | STOP and require reconciliation                                        |
| transport timeout                                      | `TRANSPORT_TIMEOUT`                                | reconcile outcome, retry same request within existing attempt budget   |

## Budget contract

For one decision epoch, the machine artifact records:

- submission attempts: maximum 2;
- conflict recoveries: maximum 2;
- replans: maximum 2;
- resource deferral sequence: 2, 4, 8, 16, 32 World Minutes, with any
  computed delay capped at 60 minutes.

Exhaustion is terminal for that decision epoch, not a world-global resident
death. The next legitimate scheduler wake may create a new epoch. No failure
path may silently convert a rejection into an accepted action.
