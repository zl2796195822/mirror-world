# 09 Scheduler and Due/Wake Extension

## Reuse, do not fork

The implementation extends `DeterministicSimulationDriver` and the
`m3-scheduler-v1` behavior under the versioned extension policy
`m3-scheduler-v2`. It does not create a second scheduler, generic job queue,
timer loop, or Redis truth.

The scheduler still means:

```text
Scheduler = WHEN
Life Engine = WHAT
World Kernel = CAN / COMMIT
```

## Activity due work

The due source remains `resident_runtime_states` with a bounded query on
`worldId`, active activity, and `activityDueAtWorldTime`. The activity domain is
extended from `TRAVELING|SLEEPING` to
`TRAVELING|SLEEPING|EATING|WORKING|TALKING`.

Each accepted start registers no separate job row: the active runtime row is
the due source. The due item carries the request/activity instance id, source
state version, source world sequence, resident id, and due World Time.

For TALK, both residents have the same activity instance. The due reader
coalesces duplicate rows by activity instance id and emits one canonical work
item owned by the initiator request. Completion locks both rows. A duplicate
participant row is not a second processed activity and cannot produce a second
event.

## Wake work

Existing wake reasons remain:

- `ACTIVITY_COMPLETED`: returned only after Kernel completion;
- `DEFERRED_REPLAN`: durable registration from PRE-AL-06;
- `INITIAL_DECISION`: initial observation boundary;
- `WORK_BOUNDARY`: shift start/next shift boundary.

Wake data says WHEN and WHY, not WHAT. A wake is consumed by a fresh
Observation → Decision pass. Wake reads remain at-least-once and rebuildable;
re-reading one cannot mutate World Truth.

## Ordering and progress

The existing stable ordering is retained:

```text
(dueWorldTime, resident UUID bytes, wake reason, decision epoch,
 activity/wake identity)
```

Activity completion is processed before decision wakes at the same boundary.
The step limit remains `<= 30` work items. A step never recursively processes
new output. A stale or poison item becomes one bounded machine-readable failure
and does not starve other residents.

## Work boundary registrations

For each employed resident, the action loop registers a deterministic
`WORK_BOUNDARY` wake for the next shift start. Registration uses a dedupe key
containing world, resident, shift-start World Time, and scheduler policy. No
work wake is registered for unemployed residents. After a completed or missed
shift, the next weekday boundary is the next registration; the current shift
is never replayed as a new one.

## Pause and restart

`PAUSED` and `MAINTENANCE` do not advance World Time, process due activity, or
consume backoff. On driver restart, active runtime rows and durable wakes are
queried again. Lease/fence checks remain the first boundary, and a lost fence
stops processing before any Kernel commit.
