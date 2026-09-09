# WAKE-INDEX

## Purpose

After crash or queue loss, answer: **who must wake next, and at what World Time?** without scanning every resident every second.

The wake index is a **rebuildable projection**, not Truth.

## Candidate Fields Per Resident (conceptual)

```text
WakeCandidate {
  worldId
  residentId
  wakeWorldTime
  wakeReason
    | ACTIVITY_DUE
    | NEED_THRESHOLD
    | WORK_BOUNDARY
    | REPLAN_DEFER
    | EVENT_INTEREST      # future
    | HUMAN_INTERACTION   # future
    | INSTITUTION_DUE     # future M6
  priorityClass
  sourceRef             # activityInstanceId / need key / defer id
  sourceWorldSeq        # projection cursor
}
```

Global order key (aligned with RES-M3-003 / PRE-AL-07 research):

```text
(wakeWorldTime, priorityClass, residentId, wakeReason, decisionEpoch)
```

Exact freeze is `PENDING_PRE_AL_07`.

## Storage Options Compared

| Option | Pros | Cons | M8 stance |
| ------ | ---- | ---- | --------- |
| **A. Priority queue in memory** | O(log n) pop; simple | Lost on crash; multi-instance hard | Cache only |
| **B. DB indexed due rows** | Durable; rebuildable; SQL batch | Write amplification; index care | **Primary durable candidate** |
| **C. Hierarchical timing wheel** | Excellent at high due density | Complexity; still needs durable backup | Later scale probe |
| **D. In-memory scheduler + periodic flush** | Fast | Dual-write risk; flush lag | Only with idempotent rebuild |
| **E. Hybrid: DB truth + memory cache** | Fast path + recovery | Cache invalidation | **Recommended direction** |

### Recommendation

**E (Hybrid)** for long-term:

- PostgreSQL holds rebuildable due-work projection (or can recompute from runtime + schedules + need anchors).
- In-memory priority structure is a disposable accelerator.
- Redis may hold lease/queue **only**, never truth.

M8 v1 does **not** require a new table in this research. It requires the **rebuild algorithm**.

## Rebuild Sources (authoritative)

| Source | Yields |
| ------ | ------ |
| `resident_runtime_states` | `ACTIVITY_DUE` at `activityDueAtWorldTime` |
| Need anchors + policy | `NEED_THRESHOLD` analytic crossings |
| Employment fixture / future M6 | `WORK_BOUNDARY` edges |
| Replan defer targets (ephemeral until durable) | `REPLAN_DEFER` — see gap below |
| Future M4 interest subscriptions | `EVENT_INTEREST` |

### Known gap

`m3-replan-v1` defer decisions are currently **not durable World Facts** (ADR-0010). If a process crashes after DEFER and before the next wake is recorded, rebuild must either:

1. Re-derive defer from last decision cycle durable traces (if any), or
2. Treat missing defer as “re-observe soon” with bounded delay policy, or
3. Future: persist a non-fact `wake_cursors` / due-work projection (rebuildable, not ledger).

This is a `PENDING_PRE_AL_07` / formal M8 contract point — **not resolved here**.

## Rebuild Algorithm

```text
function rebuildWakeIndex(worldId):
  world = loadWorld(worldId)
  clearAcceleratorCache(worldId)

  # 1. activities
  for row in runtime where world_id = worldId and activity is TRAVELING|SLEEPING:
    insert WakeCandidate(ACTIVITY_DUE, row.due, row.residentId)

  # 2. needs
  for each resident anchor:
    t = nextNeedThresholdCrossing(anchor, needPolicy)
    if t: insert WakeCandidate(NEED_THRESHOLD, t, residentId)

  # 3. work
  for employed resident:
    for edge in nextWorkEdges(schedule, world.worldTime, horizon):
      insert WakeCandidate(WORK_BOUNDARY, edge)

  # 4. replan defer (if durable projection exists)
  loadDeferTargets(worldId)

  sort by (wakeWorldTime, priorityClass, residentId, ...)
  return index
```

After rebuild, scheduler pops due candidates ≤ current World Time in order.

## Not a Giant Resident Tick Table

Anti-pattern:

```text
resident_ticks (resident_id, next_tick_second, ...)  -- wall-clock seconds
```

Wrong because:

- Wall clock ≠ World Time
- Encourages full scan
- Becomes second truth

Correct: World-Time due candidates, rebuildable, event-jump friendly.

## Multi-World Isolation

Index is **world-scoped**. Never a global cursor mixing worlds.

## Fairness

When many candidates share `wakeWorldTime`, stable `residentId` order prevents starvation (`FAIRNESS.md`).

## Relationship to Scheduler Queue

| Artifact | Durable? | Truth? |
| -------- | -------- | ------ |
| In-memory queue | No | No |
| Redis lease/queue | No (must be droppable) | No |
| Wake index projection | Rebuildable; optional durable cache | No |
| Event Ledger / runtime states | Yes | **Yes** |

Invariant: delete queue + index → rebuild → same due work.

## Formal M8 Note

M8 research recommends the **contract** (fields, rebuild, ordering, world-scoping) and defers physical schema to formal M8 after PRE-AL-07. Do not implement tables in this package.
