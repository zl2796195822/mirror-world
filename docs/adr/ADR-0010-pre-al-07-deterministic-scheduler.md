# ADR-0010 PRE-AL-07 Deterministic Scheduler / Simulation Driver

- 状态：Accepted
- 日期：2026-09-09
- 范围：PRE-AL-07

## Context

PRE-AL-05 established Kernel-owned `TRAVELING` and `SLEEPING` runtime
activities with durable `activity_due_at_world_time`. PRE-AL-06 established
bounded recovery and the ephemeral decision-cycle policy
`DEFER_UNTIL_WORLD_TIME`. The missing boundary was a deterministic caller that
advances a world to an explicit World Time and finds work without becoming a
second truth writer or a Rule Decision engine.

## Decision

1. `worlds.world_time` remains the World Time authority. The Kernel exposes
   `advanceWorldTimeTo`; it rejects a rewind, returns a defined no-op for the
   current time, and returns `BLOCKED` for `PAUSED` or `MAINTENANCE`. A running
   advance commits the existing `WORLD_TIME_ADVANCED` event through the normal
   Kernel transaction boundary. The driver never updates `worlds` directly.
2. M3 v1 uses a deterministic serial driver. It reads only the requested
   world, orders due work by `(dueWorldTime, residentId bytes, wakeReason,
decisionEpoch)` with explicit UUID-byte comparison, and commits one
   activity completion at a time. No timer, daemon, Redis queue, or distributed
   queue is introduced.
3. Activity completion is the only executable work in PRE-AL-07. A due MOVE or
   SLEEP item calls `completeResidentAction` with its action/request identity
   and state-version fence. The driver never writes runtime, resources, or
   events itself.
4. Decision wakes are orchestration output, not selected actions. A completed
   activity produces an `ACTIVITY_COMPLETED` wake; a persisted deferred,
   initial, or work-boundary registration produces a `DECISION_WAKE`. Neither
   contains a selected ActionRequest and PRE-AL-07 does not execute it.
5. Deferred wakes use the minimal durable
   `scheduled_wake_registrations` projection, keyed by `(world_id, dedupe_key)`.
   It is a rebuildable due source, not a generic job/retry table. PRE-AL-07
   does not acknowledge/delete a registration because the future decision
   boundary must own acknowledgement; repeated reads are therefore
   at-least-once wake delivery without a World Fact.
6. Each step has a maximum of 30 work items. It completes activities in a
   completion phase before returning decision wakes. If more work remains, a
   later bounded call re-queries durable state. Poison or stale items become a
   machine-readable failure item and cannot create an in-step infinite loop.
7. The due activity query is a world-scoped, read-only, bounded batch query
   over active runtime rows with `activity_due_at_world_time <= target`; it
   does not scan history and does not use JavaScript filtering. The next
   boundary is read from the same durable runtime/wake sources.
8. Kernel Action Outcome event references remain same-world and strictly
   increasing, but may contain a sequence gap when another action commits an
   event between two events associated with the same action. This is required
   for valid interleaved multi-resident serial execution.

## Boundary

```text
Scheduler/Driver: WHEN
Life Engine:      WHAT
World Kernel:     CAN / COMMIT
```

The driver does not call Needs/Goals to choose behavior, does not submit a new
ActionRequest, and does not implement M3-T04, an autonomous loop, or a 30-day
life simulation.

## Consequences

- Completion event `occurredAt` is the target World Time, never driver wall
  time; the existing Event Ledger assigns the world-local sequence.
- Re-query after a successful completion finds no active due row. Repeating a
  process step therefore cannot append a second completion event, increment a
  second world sequence, or update a second rest anchor.
- Clearing an in-memory work list cannot lose an activity or deferred wake:
  active runtime and wake registration remain the rebuild sources.
- A durable deferred registration remains visible until a future decision
  layer explicitly acknowledges it. A repeated wake result is safe because it
  is not a World Event or state mutation.
- Lease/fence ownership, full resident projection replay, canonical
  simulation manifests, and the resident Decision Loop remain outside this
  task and are reported as follow-up blockers.

## Database impact

Migration `packages/db/drizzle/0009_odd_killmonger.sql` adds the minimal
`scheduled_wake_registrations` table and indexes active runtime due lookup and
world/due wake lookup. No generic queue, job, retry, or Redis persistence is
added.

## Verification boundary

The dedicated PostgreSQL integration covers MOVE, SLEEP, exact due time,
future work, stable same-time order, duplicate/requery behavior, durable wake
rebuild, bounded batches, pause/maintenance, world isolation, and a 30-resident
mixed activity batch. It does not claim M3-T04, 30×30 autonomous acceptance,
or full resident/domain replay.
