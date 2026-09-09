# WORLD-BOOT-RECOVERY

Service start / process restart flow for a persistent world. Research proposal — not implemented.

## Flow

```text
1. Load world row
2. Load / check checkpoint (optional accelerator)
3. Verify ledger continuity (world_seq, event chain)
4. Replay or suffix-replay if projection cold
5. Rebuild projections (runtime already durable; derived needs on demand)
6. Rebuild due-work / wake index
7. Resume World Time (Kernel clock sync under policy)
8. Catch up if lag > 0 and status RUNNING
9. Enter execution LOD (ACTIVE or BACKGROUND)
```

## Step Detail

### 1. Load world row

Read: `id, seed, status, timeScale, worldTime, clockAnchorAt, worldSeq`.

If world missing → refuse boot for that world (fail-closed).

### 2. Checkpoint check (optional)

- Find latest checkpoint `atOrBeforeSeq ≤ worldSeq`
- Verify worldId, schemaVersion, checksum, `appliedSeq ≤ worldSeq`
- Invalid checkpoint → ignore; continue with full verification path
- Checkpoint is never required for correctness (ADR-0006)

### 3. Ledger continuity

Checks:

- `worlds.world_seq` ≥ 0
- Events exist for seq 1..worldSeq (or checkpoint + suffix)
- No gaps; types in registry; payload schemaVersion valid

Failure → world-fatal diagnostic; do not invent missing events.

### 4. Replay

| Mode | When |
| ---- | ---- |
| Full replay from genesis | Cold verification / audit |
| Suffix replay from checkpoint | Fast warm start |
| No replay (trust DB runtime + ledger head) | Normal boot if invariants pass |

Replay today reconstructs **world clock history digest** primarily; full resident projection replay is `PENDING` (RES-M3-003, PRE-AL-07 gate). M8 must not claim full cognitive/runtime replay exists before those land.

### 5. Projections

| Projection | Source |
| ---------- | ------ |
| Runtime location/activity | Durable table (authoritative) |
| Needs values | Lazy from anchors + World Time |
| Wake index | Rebuild (`WAKE-INDEX.md`) |
| Digest cursors | Product state store |

### 6. Due-work rebuild

As in `WAKE-INDEX.md`. Discard any recovered in-memory queue.

### 7. Resume World Time

```text
if status == RUNNING:
  offlineElapsed = now - clockAnchorAt   # wall
  worldDelta = policy.map(offlineElapsed, statusHistory)
  target = worldTime + worldDelta
  # actual advance via Kernel WORLD_TIME_ADVANCED in catch-up, not a silent field poke
else:
  # PAUSED/MAINTENANCE: re-anchor only; no domain backfill (ADR-0002)
  sync anchor without worldTime advance
```

### 8. Catch up

If `target > worldTime` and status RUNNING → `OFFLINE-CATCHUP.md`.

### 9. Enter LOD

| Condition | Level |
| --------- | ----- |
| Humans present / interactive | W0 ACTIVE |
| No humans, world current | W1 BACKGROUND |
| Still catching up | W2 until lag cleared |

## Seed World Note

Current seed world is **PAUSED** at bootstrap (`status: PAUSED`). Boot recovery must honor that: no catch-up until status becomes RUNNING (dev control or formal ops).

## Multi-World Boot

Boot is per-world. Parallel worlds may boot concurrently; each has isolated lock, seq, catch-up, digest.

## Fail-Closed Rules

| Condition | Action |
| --------- | ------ |
| Ledger gap | Halt world; alert; no catch-up |
| Checkpoint checksum fail | Drop checkpoint; continue if ledger OK |
| Runtime version anomaly | Halt resident or world per matrix |
| Policy version missing | Halt decision path; world time may still advance |
| LLM provider down | Ignore — continuity does not need LLM |

## Artifacts to Log at Boot (ops)

- `worldId`, baseline `worldSeq`, `worldTime`, status
- checkpoint used / ignored
- rebuild counts (wake candidates)
- catch-up plan horizon
- execution LOD entered
- errors / isolated residents
