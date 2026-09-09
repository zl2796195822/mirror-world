# FAIRNESS

## Problem

Resident A constantly generates due work; resident B never gets a turn. Catch-up or scheduler must not starve residents.

## Principles

1. **Every due resident is eventually processed** when their due time is reached.
2. **Order is deterministic**, not wall-clock opportunistic.
3. **One in-flight sustained action per resident/epoch** (already M3 constraint).
4. **Budget exhaustion is resident-scoped**, not world halt (unless world-fatal).

## M3 v1 Fairness Model (30 residents)

With serial deterministic scheduler:

```text
while due set non-empty:
  pick min by (dueWorldTime, residentId, ...)
  process one decision/completion
  recompute that resident's next due
```

Properties:

- No resident can jump the queue at an earlier due time
- Same-time ties broken by stable residentId
- Starvation only if a resident never becomes due (life rules), not because others are loud

## Catch-up Fairness

During offline catch-up:

- Process due work in World Time order, not “residents with most events first”
- Chunking must not abandon a resident mid-horizon without recording remaining due work
- Poison resident isolation must not silently drop others (`FAILURE-ISOLATION-MATRIX.md`)

## Cognition Fairness (future M5)

If some residents get I3 LLM and others I0:

- That is Intelligence LOD policy, not scheduler starvation
- World facts for I0 residents still occur (sleep completes, work edges fire)
- LLM budget exhaustion lowers LOD; does not freeze the resident out of existence

## Multi-World Fairness

Fairness is **within a world**. World A’s load must not block World B’s driver permanently (world-scoped workers).

## Metrics (ops)

- per-resident completions / world day
- max wait from due → processed
- defer count
- isolated failure count
- LOD distribution

## Non-Goals

- Equal event counts per resident (life is not uniform)
- Real-time fairness across human users (users are not world clocks)
