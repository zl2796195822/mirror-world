# 16 Story Sanity Hard Gates

There are **15 Hard Gates**. Only these predicates determine the formal
result.

|   # | Gate                        | Machine predicate                                                                                                                                                                                                                                                      |
| --: | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Run endpoint                | Manifest is 30 residents, 43,200 World Minutes, exact target World Time, and no due activity remains at the endpoint.                                                                                                                                                  |
|   2 | Fixture integrity           | All 30 T01 residents and their world-local ActorRefs are present; fixture/config/policy hashes match the manifest.                                                                                                                                                     |
|   3 | Accepted action coverage    | Every resident has at least one completed SLEEP, EAT, and TALK; every employed resident has at least one completed WORK; every resident has at least one MOVE completion; every employed resident has a completed commute to workplace and a completed return to home. |
|   4 | Causal chain                | Every accepted M3 action has one ordered evidence row linking Observation, Need, Goal, Candidate constraints/score, ActionRequest, Kernel outcome, typed events, and next Observation. No accepted action is unexplained.                                              |
|   5 | Need response               | Each eligible `HungerPressure`, `RestPressure`, or `SocialPressure` threshold episode has a corresponding accepted action or an explicitly bounded unavailable-resource/participant path; no critical episode is silently ignored.                                     |
|   6 | Need effect                 | Every completed EAT lowers the next hunger evaluation by the versioned effect (clamped at zero); every completed TALK lowers the initiator and participant social pressure by the versioned effect; SLEEP preserves the existing rest-anchor transition.               |
|   7 | Work obligation             | Each employed completion has the matching same-day obligation and exact shift key; no WORK starts at `LATE`; unemployed residents have zero committed WORK outcomes; no payroll/cash/journal event is emitted.                                                         |
|   8 | Resource conservation       | Food never becomes negative; each accepted EAT has exactly one Kernel-owned before/after resource delta; duplicate request/completion does not consume twice; Life Engine performs zero resource writes.                                                               |
|   9 | TALK legality and atomicity | Every TALK has two distinct active residents in the same world/location, one initiator request, one shared activity instance, an atomic paired lock, and one completion; reciprocal race produces at most one committed contact.                                       |
|  10 | Bounded recovery            | Every rejection, conflict, defer, timeout, and replan is classified; attempt/recovery/replan budgets are not exceeded; no same request is retried after idempotency conflict.                                                                                          |
|  11 | Liveness                    | No resident is stuck with an eligible feasible action for more than the frozen 1,440-World-Minute stuck window; no resident remains active at endpoint; no critical rest episode is left without a bounded sleep response.                                             |
|  12 | Spatial/activity safety     | Every location change has a matching MOVE start/completion and valid edge; no teleport, overlapping single-resident activity, half-locked TALK pair, or invalid activity/location state exists.                                                                        |
|  13 | Replay equivalence          | Live projection hash equals full replay, checkpoint suffix replay, and deleted-checkpoint genesis rebuild; resource, activity, Need-relevant, work, and TALK fields are included.                                                                                      |
|  14 | Determinism                 | Same manifest and seed produce identical history/projection/story digest; a different seed produces a different fixture and behavior digest without changing the contract.                                                                                             |
|  15 | Isolation and scope         | No cross-world/resident reference, self-TALK, LLM call, accepted BUY, purchase settlement, relationship/memory mutation, or unowned report-to-world write occurs.                                                                                                      |

The `1,440`-minute liveness window is the explicit
`m3-story-sanity-v1` diagnostic/gate parameter: one World Day, long enough to
cover the longest M3 activity boundary while still detecting a permanent
decision loop. It is not a hidden scheduler retry count.

For Gate 5, a threshold episode starts when a Need changes from below its
versioned activation threshold to at-or-above it and ends at the first
accepted effect, the next policy-defined reset, or the run endpoint. “Eligible”
means that the current Observation exposes the required resource/location or
participant capability. An ineligible episode must have a bounded failure or
defer classification; missing evidence is a failure.
