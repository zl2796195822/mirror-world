# OFFLINE-CATCHUP

## Goal

After process downtime or world lag, advance a RUNNING world from `persistedWorldTime` to `targetWorldTime` by committing **real Kernel facts** — never by inventing narrative, never by minute-walking the full population.

## Inputs

```
Last durable world state (worlds row)
  → lastWorldTime, status, timeScale, worldSeq, seed
Offline elapsed / wall now
  → OfflineElapsed (derived input only)
World Time Policy
  → mode, downtimePolicy, catchupHorizonCap
Target World Time
  → computed under policy
Due-work candidates
  → rebuildable from PostgreSQL (runtime due times, need thresholds, work edges)
```

## High-Level Flow

```text
Last Durable World State
        ↓
Last World Time
        ↓
Wall Clock elapsed
        ↓
World Time Policy
        ↓
Target World Time
        ↓
Catch-up Planner
        ↓
Next Meaningful Boundary ≤ Target
        ↓
Kernel commits (short transactions)
        ↓
Repeat until persistedWorldTime ≥ Target
        ↓
World enters BACKGROUND or ACTIVE
```

## Catch-up Planner (pseudo)

```text
function catchUp(worldId, wallNow):
  world = loadWorld(worldId)
  if world.status != RUNNING: return  // PAUSED/MAINTENANCE: no domain catch-up

  policy = loadWorldTimePolicy(worldId)
  target = computeTargetWorldTime(world, wallNow, policy)
  if target <= world.worldTime: return

  // bounded loop; each iteration is small
  while world.worldTime < target:
    if lagBudgetExhausted(worldId): break  // ops cap; not truth mutation

    next = nextMeaningfulBoundary(world, target)
    if next is null:
      // no due work until target: advance clock in large safe jumps
      advanceWorldClockTo(world, target)
      break

    if next.worldTime > world.worldTime:
      advanceWorldClockTo(world, min(next.worldTime, target))

    processBoundary(world, next)  // Kernel: complete activity / run decision / pay edge
    world = reloadWorld(worldId)

  maybeCheckpoint(worldId)
  publishLagMetrics(worldId)
```

## Meaningful Boundaries (event-jump)

| Boundary type | Source | Kernel effect |
| ------------- | ------ | ------------- |
| Activity due | `resident_runtime_states.activityDueAtWorldTime` | `completeResidentAction` |
| Need threshold | analytic `nextThresholdCrossingWorldTime` | decision wake (then ActionRequest) |
| Work shift start/end | employment schedule vs World Time | decision wake / obligation event |
| Deferred replan due | `DEFER_UNTIL_WORLD_TIME` target | re-observe + decide |
| Scheduled institution (future M6) | payroll/rent due | economic Kernel ops |
| Policy time-step ceiling | max jump size for observability | `WORLD_TIME_ADVANCED` only |

## What Catch-up Must NOT Do

| Forbidden | Why |
| --------- | --- |
| `for minute of 30d: for resident: tick()` | Explosion; violates P7/P8 |
| BEGIN; simulate 30 days; COMMIT | Mega-transaction; crash unsafe |
| LLM invent missing history | Violates P6 |
| Bypass Kernel to write runtime/events | Violates P5 |
| Advance World Time while PAUSED | Violates ADR-0002/0007 |
| Treat offline wall hours as automatic hunger | Violates ADR-0007 explicit rule |
| Hold world lock for entire catch-up | Violates short-transaction principle |

## Transaction Boundaries

Each of the following is a **separate short Kernel transaction**:

1. World Time advance (`WORLD_TIME_ADVANCED`)
2. Activity completion (`RESIDENT_*_COMPLETED` + runtime update)
3. Decision action start (`RESIDENT_*_STARTED` + outcome)
4. Future economic settlement

Crash between any two commits resumes from the last committed `worldSeq` / `worldTime`.

## Determinism Requirements

Catch-up must be deterministic given:

- Same genesis / seed
- Same ordered external inputs (none in pure offline case)
- Same policy versions (`m3-needs-v1`, `m3-action-semantics-v1`, `m3-replan-v1`, driver ordering version)
- Same due-work ordering rules (`PENDING_PRE_AL_07`)

See `REALTIME-CATCHUP-EQUIVALENCE.md`.

## Chunking and Caps

Long downtime may require multiple catch-up windows:

| Concept | Role |
| ------- | ---- |
| `maximum immediate catch-up horizon` | Cap one catch-up burst (ops/config) |
| `chunked catch-up` | Multiple bursts with metrics between |
| `background catch-up` | Run under W2 while product shows CATCHING_UP |
| `on-demand final catch-up` | Small residual jump when user arrives |

Cap is **operational**. It must not invent facts or silently freeze World Time while status is RUNNING. If world cannot reach target in one burst, lag remains visible (`WORLD-LAG-FRESHNESS.md`).

## Coarse Simulation Stance

M8 v1 recommendation: **exact deterministic event-driven catch-up only**.

Coarse/aggregated simulation (S1/S2 fidelity) is deferred — see `CATCHUP-FIDELITY.md`. Different fidelity producing different history is a product-truth hazard.

## Interaction with PRE-AL-07

| Concern | Owner |
| ------- | ----- |
| Serial due ordering / driver surface | PRE-AL-07 (`PENDING_PRE_AL_07`) |
| Offline/long-horizon jump planner | M8 research (this doc) |
| Kernel completion APIs | Already exist (MOVE/SLEEP) |
| Failure budgets during catch-up | `m3-replan-v1` (must be used, not reinvented) |

Catch-up is “driver runUntil(target)” with event-jump efficiency — not a second Life Engine.

## Observability (DEV/OPS)

Required metrics (not product HUD):

- `worldId`, `persistedWorldTime`, `targetWorldTime`
- `catchupLagMs` (world-time)
- `dueActivitiesProcessed`, `eventsCommitted`, `residentsAwakened`
- `errors`, `retries`, `checkpointAge`
- `chunkIndex`, `horizonCapHit`

## Failure During Catch-up

If one resident action keeps failing:

1. Apply `m3-replan-v1` budgets (submission/conflict/replan).
2. On terminal STOP for that resident cycle: isolate (see `FAILURE-ISOLATION-MATRIX.md`).
3. Continue other residents’ due work.
4. World-fatal only for true invariant corruption (seq gap, world lock poison, checksum break).

## Recommendation Summary

1. Adopt event-jump catch-up as the M8 offline strategy.
2. Reuse Kernel clock + completion + action paths exclusively.
3. Many short commits; never mega-transaction.
4. No LLM in the continuity path.
5. Cap is operational lag, not fabricated pause (unless world status is PAUSED).
6. Determinism/equivalence is a future Gate requirement.
