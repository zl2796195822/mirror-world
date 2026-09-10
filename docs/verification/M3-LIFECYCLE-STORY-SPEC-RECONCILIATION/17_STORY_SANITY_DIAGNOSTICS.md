# 17 Story Sanity Diagnostics

Diagnostics are derived from the same run artifacts and are not World Truth.
They must be retained in the report even when zero. A non-zero diagnostic does
not override a Hard Gate; the report marks whether it is expected, actionable,
or anomalous.

## Anomaly classes

| Class                       | Predicate                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `STARVATION_RISK`           | Hunger is critical while an eligible food resource exists and no bounded EAT response is recorded.             |
| `RESOURCE_DEPLETION`        | Food reaches zero; report subsequent bounded unavailable/defer behavior.                                       |
| `SLEEP_RESPONSE_DELAY`      | Rest reaches critical before a completed or explicitly bounded sleep response.                                 |
| `SOCIAL_STARVATION`         | Social pressure is critical while a valid participant exists and no bounded TALK response is recorded.         |
| `WORK_ABSENCE`              | An employed shift reaches its boundary without a completed or explicitly missed-shift classification.          |
| `WORK_LATE_ATTEMPT`         | A WORK request is attempted after the shift start or with `LATE` obligation.                                   |
| `PERMANENT_DEFER`           | The same causal decision remains deferred beyond the existing bounded sequence without a new wake/observation. |
| `REPLAN_EXHAUSTION`         | Replan/conflict budget reaches terminal stop.                                                                  |
| `NO_ACTION_PROGRESS`        | No accepted completion or terminal bounded outcome occurs within the 1,440-minute stuck window.                |
| `INVALID_LOCATION_ACTIVITY` | Projection has an impossible location/activity/target combination.                                             |
| `REPLAY_MISMATCH`           | Any live/full/suffix/genesis canonical hash differs.                                                           |
| `DETERMINISM_MISMATCH`      | Same-manifest repeat digest differs or different-seed digest does not differ.                                  |
| `ISOLATION_VIOLATION`       | Any event/request/participant crosses world or resident scope, or self-TALK occurs.                            |
| `UNEXPECTED_BUY_EXECUTION`  | A BUY request commits or a purchase settlement event appears in an M3 run.                                     |
| `LLM_PATH_USED`             | Any model/LLM call, non-rule action source, or unrecorded external decision occurs.                            |

## Human notes

Human review may comment on action distributions, repeated routines,
different-seed variety, and whether the report is intelligible. It cannot
approve a run with any failed Hard Gate and cannot classify a missing event as
an acceptable visual impression.
