# ADR-0009 PRE-AL-05 MOVE / SLEEP Action Semantics

- 状态：Accepted
- 日期：2026-09-09
- 范围：PRE-AL-05

## 背景

PRE-AL-04 established `resident_runtime_states` as the durable authority for
current semantic location and activity, with `state_version` for future
Kernel-controlled optimistic concurrency. The Action Contract already defines
`MOVE` with `{ destinationId }` and `SLEEP` with `{}`. The remaining blocker was
the absence of a formal lifecycle for actions whose world-time effect is not
instantaneous.

## Decision

1. `MOVE` keeps the existing payload `{ destinationId }`; `SLEEP` keeps the
   existing empty payload `{}`. No Action Contract version bump is required.
2. The only new runtime activities are `TRAVELING` and `SLEEPING`. Active
   activity metadata is limited to `activity_instance_id`, target location for
   travel, start World Time, and due World Time. No generic workflow JSON is
   added.
3. `MOVE` and `SLEEP` are two-phase Kernel operations:
   `STARTED → COMPLETED`. Start keeps the current location unchanged and
   changes activity to `TRAVELING` or `SLEEPING`. Completion changes activity
   to `IDLE`; `MOVE` then changes current location to its destination.
4. `m3-action-semantics-v1` is the deterministic policy version. Travel time is
   selected by the centralized first-street semantic location-kind matrix.
   Arbitrary duration is not accepted in a request. Sleep is allowed only at a
   `HOME` location and has a fixed 480 World Minute duration.
5. Completion is an explicit Kernel command, currently exposed as
   `completeResidentAction`. It succeeds only when the persisted World Time is
   at or after the activity due time. It does not create a scheduler, timer,
   worker, automatic wake, or autonomous loop.
6. A resident with non-`IDLE` activity cannot start another `MOVE` or `SLEEP`.
   Same-location `MOVE` is rejected as `KERNEL_INVALID_LOCATION`. Invalid,
   cross-world, and unreachable destinations are rejected without a World
   Event or `world_seq` increment.
7. The Kernel locks the world and runtime row in the same transaction and
   evaluates `expectedActorVersion` against the durable runtime
   `state_version`. A successful start and completion each increment the
   version once. Stale concurrent requests return durable `CONFLICT`.
8. The initial ActionRequest creates one `*_STARTED` event and one committed
   Kernel Action Outcome. Completion appends one `*_COMPLETED` event to that
   same outcome through the existing ordered `0 / 1 / N` association. Rejected
   and conflict starts create zero events and do not advance `world_seq`.
9. SLEEP completion does not set `RestPressure` directly. The Life Engine
   exports a pure accepted-result adapter that re-anchors the existing
   `NeedAnchor` from the awake value at sleep start, applies the existing
   `RESTING` lazy derivation through completion, and returns an `AWAKE` anchor.
   No Need table, high-frequency event, or direct Life Engine database write is
   introduced.
10. Lifecycle event payloads carry the action request ID, activity instance ID,
    source/destination references, start/due/completion World Time, duration,
    and policy version. Replay validates these payloads as replay-ready input;
    full resident runtime projection replay remains a later gate.

## Consequences

- Resident location and activity remain Kernel-owned facts. Life Engine,
  Observation, ActorRef, and ResourceReadPort have no runtime write path.
- `PAUSED` and `MAINTENANCE` do not complete activities. A due completion
  while the world is not `RUNNING` returns `REJECTED / WORLD_NOT_RUNNING` and
  leaves the committed start outcome and runtime unchanged; retry after resume
  is explicit and deterministic.
- Duplicate start requests reuse the existing outcome. Duplicate completion
  calls reuse the already completed outcome. A failed runtime mutation rolls
  back the request, events, outcome, `world_seq`, and runtime state together.
- EAT, WORK, TALK, and BUY execution, bounded replan, scheduler/driver,
  automatic Life Engine submission, 30×30 autonomous simulation, and full
  resident/domain replay remain outside this ADR.

## Database impact

Migration `packages/db/drizzle/0008_curvy_tony_stark.sql` adds the minimum
active-activity columns and replaces the PRE-AL-04 `IDLE`-only check constraint.
Existing bootstrap rows remain valid `IDLE` rows. No prior migration is edited.

## Verification

The implementation was verified with contract, policy, replay, Needs, full
workspace, clean PostgreSQL, and PRE-AL-05 integration tests. The dedicated
integration suite covers lifecycle, duration boundaries, pause/maintenance,
busy state, destination validation, idempotency, optimistic conflict,
world isolation, concurrent starts, start/completion rollback, Observation,
Need anchor behavior, 30 MOVE actions, 30 SLEEP actions, and transition-only
event counts.
