# ADR-0011 M3 EAT Kernel Consumable Capability

Status: Accepted
Date: 2026-09-10
Milestone: M3 Behavioral Lifecycle Extension prerequisite
Decision ID: `ADR-M3-EAT-KERNEL-CONSUMABLE-CAPABILITY`

## Context

The frozen M3 Lifecycle & Story Sanity specification requires:

```text
EAT(itemId, quantity)
  -> STARTED / EATING
  -> 30 World Minutes
  -> COMPLETED / Hunger relief input
```

The current main branch has the strict EAT ActionRequest shape and a
read-only `ResidentResourceSnapshot`/`ResourceReadPort`, but it has no durable
food mutation authority. The T01 seed resource is a deterministic fixture and
cannot become a mutable source of World Truth. The accepted Kernel Outcome,
Event Ledger, runtime, scheduler, and replay boundaries already provide the
required transaction and lifecycle seams.

This decision is the formal prerequisite for implementation. It does not
implement EAT, add a migration, or claim M3 Story Sanity completion.

## Evidence reviewed

- Frozen input: `docs/verification/M3-LIFECYCLE-STORY-SPEC-RECONCILIATION/04_EAT_FORMAL_SPEC.md`.
- Frozen boundary: `.../03_LIFECYCLE_COMMON_CONTRACT.md`, `11_EVENT_REGISTRY_EXTENSION.md`, and `12_REPLAY_EXTENSION_SPEC.md`.
- Existing authority: `docs/adr/ADR-0004-m2-t03-kernel-validation-idempotency.md`, `ADR-0005-m2-t04-event-ledger.md`, `ADR-0008-pre-al-01-kernel-action-outcome.md`, and `ADR-0009-pre-al-05-action-semantics.md`.
- Current code audit: `ResourceReadPort` is read-only and seed-backed; the
  Kernel executor is the existing action mutation boundary.

No reviewed source requires a second inventory truth, a multi-actor request,
or a change to the core Event Ledger structure.

## Decision

### 1. Resource truth owner

The durable food fact is owned by the World Kernel's canonical resource owner,
backed by PostgreSQL and represented by one world/resident/item resource state.
The implementation migration must establish the single authoritative seam
(working physical name: `resident_resource_states`) with at least:

- `world_id`, `resident_id`, and `item_id` as the world-scoped identity;
- non-negative `food_units`;
- non-negative `resource_version`;
- world/resident foreign-key and uniqueness constraints.

This is a bounded consumable resource capability, not an M3 inventory or
economy model. If an authoritative M6 resource table or adapter exists before
implementation, it must be adopted as this same seam; an additional competing
quantity table is prohibited.

The current seed `ResidentResourceSnapshot` remains a fixture/read model until
the canonical durable resource is connected. `ResourceReadPort` remains a
read-side port and receives no mutation method. A narrow Kernel-only command
capability is named:

```text
consumeFood(worldId, residentId, itemId, quantity, expectedResourceVersion)
  -> beforeUnits, afterUnits, beforeVersion, afterVersion
```

Life Engine cannot call this command and cannot mutate a resource.

### 2. Request and version inputs

The frozen ActionRequest transport is retained without a version bump:

```text
parameters = { itemId, quantity }
expectedActorVersion = runtime state fence
```

The expected food version comes from the immutable resource observation used
for the decision and is passed to the Kernel execution context; it is not a
new Life-owned write field or a second request contract. The Kernel re-reads
the canonical resource row under lock and rejects a stale expected version.
The accepted STARTED event records the authoritative before/after units and
versions, so the durable history contains the CAS evidence.

`itemId` must resolve to a food item in the same world at the current
EAT-capable location. `quantity` is a positive safe integer. The M3 fixture
uses quantity `1` for rule candidates.

### 3. Start transaction and consumption point

The Kernel start transaction is all-or-nothing:

1. check the simulation-driver fence when present;
2. lock the world row;
3. lock the actor runtime row;
4. lock the canonical food resource row;
5. re-read world status/time, resident activity/location, item capability,
   expected actor version, and expected resource version;
6. perform the food CAS and increment `resource_version`;
7. append `RESIDENT_EAT_STARTED` and persist the `COMMITTED` Kernel Outcome;
8. set runtime activity to `EATING` with due time `start + 30` World Minutes.

The exact SQL/table helper may be selected during implementation, but these
effects must remain in one PostgreSQL transaction through the existing Kernel
Outcome/Event Ledger path. Any error rolls back resource, runtime, outcome,
event, and world sequence together.

Successful START consumes the units immediately. It is not an uncommitted
reservation waiting for completion. This prevents another request from
spending the same food during the 30-minute activity.

### 4. Completion and need effect

The due completion reuses the existing `m3-scheduler-v1`/future v2 driver and
calls the Kernel completion boundary. It locks the world and actor runtime,
revalidates the activity instance, due World Time, fence, and committed start
outcome, then atomically:

- appends `RESIDENT_EAT_COMPLETED` to the same Kernel Outcome;
- records `lastAteAtWorldTime` as replayable projection state;
- records the versioned need input
  `HUNGER_PRESSURE_RELIEF`, `55 * quantity`, clamped to zero;
- clears `EATING` to `IDLE` and increments the runtime state version.

`HungerPressure` remains derived. No `HUNGER_CHANGED` event or direct Need
write is introduced. The completion effect uses
`m3-need-effects-v1`; replay uses the policy reference in the event rather
than mutable current configuration.

There is no M3 resident STOP/cancellation transition for an active EAT. A
completion failure does not refund food: the start consumed it by decision.
An internal completion failure rolls back the attempted completion and leaves
the active runtime state for explicit bounded reconciliation. A future
cancellation/refund policy would require a separate accepted ADR and an
explicit compensating event; it cannot be inferred here.

### 5. Idempotency and recovery

- Same `(worldId, idempotencyKey)` and same fingerprint returns `REUSED`; it
  never performs a second CAS or event append.
- Same key with a different payload returns `IDEMPOTENCY_CONFLICT`; it never
  receives a new key automatically.
- A completion requery uses the original request/activity identity and the
  existing outcome. A completed outcome is `REUSED`; an early completion is
  `NOT_DUE`; no duplicate resource decrement or completion event is allowed.
- Stale actor/resource versions classify as `CONFLICT` and use the existing
  bounded `REOBSERVE_NOW` policy.
- Resource unavailable, invalid item/location, busy resident, paused world,
  timeout reconciliation, and terminal internal errors use the existing
  `m3-replan-v1` classes and budgets. No new retry loop is created.

### 6. Replay and checkpoint

The expanded run uses the versioned M3 event registry/replay extension; the
core Event Ledger remains unchanged. `RESIDENT_EAT_STARTED` applies the exact
food before/after delta and sets `EATING`. `RESIDENT_EAT_COMPLETED` validates
the activity identity, records `lastAteAtWorldTime` and the need-effect input,
then returns the resident to `IDLE`.

Full replay, checkpoint suffix replay, and genesis rebuild must include food
units, resource version, last-ate time, activity, event references, and policy
versions. Unknown types, wrong-world references, invalid deltas, invalid
transitions, and future/corrupt checkpoints fail closed. A checkpoint remains
deletable acceleration state and never becomes resource truth.

Historical `m3-domain-event-registry-v1` and its MOVE/SLEEP projection are not
rewritten. The future v2 registry is an additive typed-event/reducer
extension; it does not alter old event meanings or world sequence rules.

## Alternatives considered and rejected

- **Life Engine mutation:** rejected; it violates the WHAT versus CAN/COMMIT
  boundary and cannot provide durable CAS evidence.
- **Mutating `ResourceReadPort`:** rejected; the read port would become a
  hidden write authority and would mix fixture reads with committed facts.
- **Event-only aggregate scan without a canonical current row:** rejected;
  it makes CAS/version locking unnecessarily fragile and does not reuse the
  resource read seam.
- **A separate M3 inventory table:** rejected; it creates two quantities that
  M6 would later have to reconcile.
- **Refund on every failed completion:** rejected; M3 has no cancellation
  semantics, and automatic refund would rewrite the meaning of an accepted
  consumable start.

## Authority boundary and future M6 compatibility

M3 owns only the minimal Kernel food-consumption capability and its
event-backed need input. It does not own price, merchant, buyer/seller
accounts, payment, journal, payroll, market, stock settlement, or `BUY`.

M6 may extend this single canonical resource owner with economic inventory and
settlement or replace its adapter through a versioned migration/cutover. It
must preserve the meaning of committed EAT events and cannot run a second
food quantity as Truth. `RESIDENT_EAT_COMPLETED` is a consumption fact, not a
purchase event.

## Migration impact

`IMPLEMENTATION_MIGRATION_REQUIRED`. This governance task creates no
migration. The implementation must add or adopt the single canonical
world/resident/item food state, backfill only from an explicit deterministic
seed policy, and preserve existing MOVE/SLEEP data. No existing migration is
edited and no schema change is applied by this ADR task.

## Consequences

Positive:

- EAT has a single durable owner, atomic conservation, and replayable before/
  after evidence.
- The existing ActionRequest, Outcome, Event Ledger, runtime, scheduler, and
  bounded replan seams remain usable.
- M6 receives a clear compatibility seam without inheriting M3 settlement.

Negative:

- Implementation must add durable resource state and a migration before EAT
  can be executable.
- The seed read bridge cannot be reused as the mutation implementation.
- Consumed food is not refunded by an unmodelled cancellation path.

## Required tests

The implementation must prove, with clean PostgreSQL and unit contracts:

- world/resident/item isolation and non-negative conservation;
- stale resource CAS, actor version conflict, and concurrent same-food starts;
- exact `30` World Minute due boundary and pause/maintenance behavior;
- duplicate request, duplicate completion, timeout reconciliation, and
  idempotency conflict;
- rollback of resource/runtime/event/outcome on start and completion failure;
- EAT event payload/reducer negative cases and full/suffix/genesis replay;
- `55 * quantity` hunger effect without a Life Engine resource write;
- BUY remains non-executable and no economic settlement event appears.

This ADR is accepted as a governance decision only. It does not mean any of
these tests or the EAT implementation has run.

## Documents to update

- `docs/PROJECT_STATE.md` and `MEMORY.md` with the accepted ADR and registered
  next task, without claiming implementation or M3 PASS.
- `docs/adr/README.md` with this decision ID and status.
- `docs/tasks/task-registry.json` and the M3 task documents.
