# DETERMINISTIC-ORDERING

## Requirement

When multiple residents are due at the same World Time, processing order must be **stable and deterministic**.

Otherwise:

- Replay hashes diverge
- Catch-up ≠ realtime
- Fairness becomes wall-clock lottery

## Inherited Ordering (RES-M3-003 / PRE-AL-07 research)

```text
(nextWakeWorldTime, residentId bytes, wakeReason, decisionEpoch)
```

Optional priority class if formalized:

```text
(dueWorldTime, priorityClass, residentId, wakeReason, decisionEpoch)
```

### Candidate priority classes (research only)

| Class | Examples |
| ----- | -------- |
| P0 world integrity | clock advance, lease fence |
| P1 activity completion | MOVE/SLEEP due |
| P2 critical needs | hunger/rest thresholds |
| P3 work obligations | shift edges |
| P4 social/routine | talk, leisure |
| P5 optional cognition | deep LLM |

Final freeze: `PENDING_PRE_AL_07`.

## Rules

1. **No** `Array.sort` without explicit comparator on stable keys.
2. **No** dependence on DB `RETURNING` order, UUID generation order at process time, or hash map order.
3. Resident IDs used in sort must be the durable logical IDs (seed-stable), not display names.
4. Same World Time + same reason → same resident order every run.

## Catch-up Ordering

Catch-up must use the **same** ordering key as realtime driver.

Special case: batch of activity completions at `T`:

```text
sort by (dueWorldTime=T, residentId)
complete each via Kernel
```

World Time advance to `T` happens before or as part of reaching that boundary; completions then apply at `T`.

## Parallelism vs Determinism

Future parallel compute (research):

```text
parallel evaluate decisions
  → deterministic commit order by ordering key
```

Never: commit order = thread finish order.

M8 v1 does not require parallelism (`POPULATION-SCALING.md`).

## Verification (future Gate)

- Shuffle input resident supply order → same semantic hash
- Reverse batch boundaries within equivalence → same canonical state
- Repeat same manifest N times → identical hashes or `DETERMINISM_FAILURE`

## Anti-Patterns

| Pattern | Problem |
| ------- | ------- |
| `Promise.all` then push in completion order | Non-deterministic |
| Order by `created_at` of runtime row | Insertion artifact |
| Order by wall clock of process wake | Offline ≠ realtime |
