# CHECKPOINT-EVOLUTION

## Current State (M2-T05)

- `simulation_checkpoints(worldId, worldSeq, snapshot, checksum, schemaVersion)`
- Snapshot is thin: seed + worldTime + appliedSeq + historyDigest
- Rebuildable; not truth
- Suffix replay supported at ledger level
- Resident runtime is **not** inside checkpoint (durable separately)

## Long-Running World Problem

A 10-year world Event Ledger cannot replay from genesis on every restart.

Checkpoint evolution must accelerate restore **without** becoming a second mutable truth.

## Principles

1. Checkpoint remains deletable and rebuildable from seed + events (+ durable side tables).
2. Checkpoint never replaces Event Ledger.
3. Checkpoint version and schema version always recorded.
4. Suffix replay hash must equal full replay hash at same seq (when projection complete).
5. Corruption → drop checkpoint, not repair truth from snapshot.

## Evolution Stages (research)

### Stage 0 — Today

Ledger checkpoint (world clock digest). Runtime lives in `resident_runtime_states`.

### Stage 1 — Projection Checkpoint

Include rebuildable projections:

- Per-resident runtime summary checksum
- Need anchor checksum
- Wake index summary checksum (derived)

Still not a substitute for durable runtime table.

### Stage 2 — Suffix Chains

- Periodic checkpoints every N world hours or M events
- Keep recent dense, older sparse
- Boot: latest valid checkpoint + suffix events

### Stage 3 — Cold Archive Boundaries

- Very old ledgers to cold storage (see `EVENT-LEDGER-GROWTH.md`)
- Checkpoint at archive boundary + verified digest
- Hot path remains recent suffix

## Trigger Policy (candidates)

| Trigger | Pros | Cons |
| ------- |------|------|
| Every N events | Simple | Irregular world time |
| Every World Time interval | Stable ops | May over/under sample |
| Size threshold | Bounds storage | Complex |
| **Hybrid (recommended)** | Balance | Slightly more logic |

Hybrid example:

```text
checkpoint if:
  eventsSinceLast >= N
  OR worldMinutesSinceLast >= M
  OR boot after crash
```

## What Checkpoint Must Never Do

| Forbidden | Why |
| --------- | --- |
| Delete events after checkpoint | History is asset |
| Be the only copy of resident identity | Identity is durable elsewhere |
| Hide `world_seq` gaps | Integrity check must still run |
| Store wall-clock-only “state” without seq | Unverifiable |

## Interaction with Catch-up

Catch-up may checkpoint at chunk boundaries for ops convenience. That does not change target semantics.

## Formal M8 Note

M8 research recommends evolution **path**, not a new checkpoint system. Reuse `simulation_checkpoints` and extend snapshot schema via versioning when formalized.
