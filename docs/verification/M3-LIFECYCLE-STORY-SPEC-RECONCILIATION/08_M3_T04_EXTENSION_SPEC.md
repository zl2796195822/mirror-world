# 08 M3-T04 Extension Specification

## Policy boundary

The current `m3-rule-decision-v1` remains valid for historical MOVE/SLEEP
evidence. The implementation task introduces
`m3-rule-decision-v2`; it does not silently change the meaning of v1.

The decision chain remains:

```text
Observation -> Needs -> Goals -> Candidate Actions
-> hard constraints -> deterministic score/order -> ActionRequestDraft
```

No LLM, random resident selection, direct state write, or scheduler-owned
decision is permitted.

## Candidate extension matrix

| Goal                      | Candidate when                                                           | Action path              | Hard constraints                                                       |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------ | ---------------------------------------------------------------------- |
| `SATISFY_HUNGER`          | A food item is available at the current EAT-capable location             | `EAT(itemId, 1)`         | same world/item, food, capability, quantity, resident idle             |
| `SATISFY_HUNGER`          | Food is not local but a deterministic EAT-capable location/item is known | `MOVE(destinationId)`    | reachable, destination differs, resident idle                          |
| `REST`                    | At home                                                                  | `SLEEP`                  | home, SLEEP capability, idle                                           |
| `REST`                    | Away from home                                                           | `MOVE(homeLocationId)`   | reachable, destination differs, idle                                   |
| `FULFILL_WORK_OBLIGATION` | At the employed workplace at exact shift start                           | `WORK(workplaceId)`      | employed, same workplace, `DUE`, exact start, idle, not completed      |
| `FULFILL_WORK_OBLIGATION` | The shift boundary is approaching and travel can arrive by start         | `MOVE(workplaceId)`      | employed, known workplace, reachable, deterministic travel slack, idle |
| `MAKE_SOCIAL_CONTACT`     | A valid nearby participant is available                                  | `TALK(participantId)`    | same world, distinct resident, same location, both active and idle     |
| `MAKE_SOCIAL_CONTACT`     | No valid nearby participant but a deterministic social venue is known    | `MOVE(socialLocationId)` | reachable, destination differs, idle                                   |

M3 never turns a hunger goal into an executable BUY. A local-context source
must provide food items and nearby residents; if it cannot, the capability is
`UNAVAILABLE` and the candidate is infeasible rather than fabricated.

## Hard constraints

The v2 candidate record adds these explicit constraint codes to the current
set: `FOOD_AVAILABLE`, `EAT_CAPABLE`, `WORK_OBLIGATION_DUE`,
`WORKPLACE_MATCH`, `SHIFT_START_BOUNDARY`, `SHIFT_NOT_COMPLETED`,
`PARTICIPANT_KNOWN`, `PARTICIPANT_ACTIVE`, `PARTICIPANT_SAME_WORLD`,
`PARTICIPANT_DIFFERENT`, `PARTICIPANT_SAME_LOCATION`, and
`PARTICIPANT_IDLE`. A candidate is feasible only when every applicable
constraint passes.

## Score and ordering

Existing v1 weights are retained. v2 adds no arbitrary action-count bonus.
The score is:

```text
goalScore + needUrgency/10 + 5 * locationAffinity - infeasiblePenalty
```

`infeasiblePenalty=1000` remains the existing policy. Feasible candidates are
ordered by:

```text
score desc -> needUrgency desc -> goal priority desc -> stableKey asc
```

`stableKey` is a canonical string containing action type, target location,
item id, participant id, and reason code. UUIDs use byte order. Participant
ordering is by resident UUID bytes, never input order or random choice.

The only new action candidates are EAT, WORK, and TALK. MOVE remains the
transport candidate used to reach an action location.

## Evidence and request creation

The decision result must retain the complete candidate list, all hard
constraints, score breakdown, selected candidate, source `worldSeq`, decision
epoch, and deterministic request seeds. The action loop creates the existing
strict ActionRequest and submits it to the Kernel. If the selected candidate
is infeasible, the result is `NO_FEASIBLE_CANDIDATE` and goes through the
existing bounded replan policy.
