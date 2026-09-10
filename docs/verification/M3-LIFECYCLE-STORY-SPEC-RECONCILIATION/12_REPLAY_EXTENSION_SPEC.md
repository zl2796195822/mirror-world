# 12 Replay Extension Specification

## Equivalence contract

For one immutable manifest and event history:

```text
live projection == full replay == checkpoint suffix replay
             == replay after checkpoint deletion and genesis rebuild
```

Equality is canonical JSON/hash equality, not a visual comparison and not
merely equality of event counts.

## Projection fields

The v2 resident projection retains all current fields and adds:

```text
activity: IDLE | TRAVELING | SLEEPING | EATING | WORKING | TALKING
activityTargetResidentId: UUID | null
foodUnits: non-negative integer
resourceVersion: non-negative integer
lastAteAtWorldTime: ISO time | null
lastSocialContactAtWorldTime: ISO time | null
completedWorkShiftKeys: sorted string array
```

These are projections of seed facts and committed events. They are not a
replacement for the event ledger and are not written by Life Engine.

## Reducer rules

- EAT STARTED validates idle activity and source location, applies the exact
  resource before/after delta, and sets `EATING`.
- EAT COMPLETED validates the activity instance, records `lastAteAtWorldTime`,
  and returns the resident to `IDLE`.
- WORK STARTED validates the shift key and sets `WORKING`.
- WORK COMPLETED adds the shift key exactly once and returns to `IDLE`.
- TALK STARTED validates both resident projections are idle and co-located,
  then sets both to `TALKING` with reciprocal target ids.
- TALK COMPLETED validates both sides and clears both atomically.
- MOVE/SLEEP reducers retain their current semantics unchanged.
- `WORLD_TIME_ADVANCED` changes only replay World Time and must connect exactly
  to the previous time.

Replay sorts by world sequence, requires a contiguous full-world sequence, and
fails on unknown type, wrong world, missing actor, bad payload, invalid
transition, or future checkpoint state.

## Need and story inputs

The replay report derives Need values from the same accepted completion facts,
seed/profile, World Time, and versioned policies. It never re-runs a scheduler
or asks an LLM. EAT/TALK relief is read from the versioned event effect;
WORK completion is an obligation fact and has no payroll effect.
