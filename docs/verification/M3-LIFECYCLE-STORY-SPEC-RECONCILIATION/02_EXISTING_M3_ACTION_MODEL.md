# 02 Existing M3 Action Model

## Current interfaces and facts

The current main branch provides:

- `ActionRequest` as a strict discriminated union for `MOVE`, `EAT`, `SLEEP`,
  `WORK`, `TALK`, and `BUY`.
- `KernelActionOutcome` with `COMMITTED`, `REJECTED`, and `CONFLICT`, linked to
  the request and its ordered event references.
- `resident_runtime_states` as the location/activity authority.
- Current activity values `IDLE`, `TRAVELING`, and `SLEEPING`.
- `m3-action-semantics-v1`: deterministic travel and 480 World Minute sleep.
- `m3-scheduler-v1`: `ACTIVITY_COMPLETION` and `DECISION_WAKE`, durable due/wake
  reads, and stable ordering.
- `m3-domain-event-registry-v1` and a resident projection replay for World Time,
  MOVE, and SLEEP events.
- `m3-needs-v1`: `HungerPressure`, `RestPressure`, and `SocialPressure` as
  derived values; `EnergyLevel` is derived, not a second Need.
- `m3-goals-v1`: hunger, rest, work obligation, social, return-home goals.
- `m3-rule-decision-v1`: executable candidate actions are currently only MOVE
  and SLEEP. Hunger/social goals currently degrade to infeasible candidates;
  work currently produces only MOVE-to-workplace.
- `m3-replan-v1`: bounded attempts, conflict recovery, replans, deferral, and
  terminal stop.

## Existing lifecycle to reuse

The executable resident path is:

```text
ActionRequest
  -> Kernel validation and idempotent request persistence
  -> STARTED event + active runtime state
  -> durable due item
  -> Kernel completion transaction
  -> COMPLETED event + IDLE runtime state
  -> outcome/event projection
  -> fresh Observation
```

The completion event is appended to the existing committed outcome. The
request id is the activity instance id for MOVE/SLEEP and remains so for the
new actions. No new lifecycle enum such as `REQUESTED` is introduced.

## Ownership rule

```text
Observation -> Needs -> Goals -> Candidate -> Rule Decision
-> ActionRequest -> World Kernel -> KernelActionOutcome
-> typed events -> projection/replay -> next Observation
```

Life Engine may evaluate and propose. It cannot change location, activity,
food, attendance, participant occupancy, Need anchors, or world time. The
scheduler may decide WHEN to process a due item. It cannot choose WHAT or
mutate facts. Only the Kernel commits facts.

## Compatibility interpretation

Adding the three activity kinds and the paired TALK occupancy is an extension
of the existing runtime authority, not a second authority. It must be made as
one versioned runtime/schema extension and must preserve the current MOVE and
SLEEP rows and replay behavior. The corresponding ADR gate is listed in
[23](./23_ADR_REQUIREMENT_MATRIX.md).
