# EVENT-JUMP-SIMULATION

## Problem

User leaves for 30 days. World is RUNNING. Naive catch-up:

```
30 days × 1440 minutes × 10000 residents = 432M ticks
```

Forbidden. Unnecessary. Wrong architecture.

## Solution: Jump to Next Meaningful Boundary

From current World Time `T`, compute the earliest future boundary `T' ≤ target` where something durable or decision-relevant happens. Advance to `T'`, commit, recompute.

```text
T ──jump──▶ T'₁ ──jump──▶ T'₂ ──…──▶ target
```

Each jump is one or a few Kernel transactions, not N minutes × M residents.

## Boundary Catalog (M8 v1 + extensions)

### Already grounded in M3 foundation

| Boundary | How to compute next |
| -------- | ------------------- |
| MOVE due | `activityDueAtWorldTime` on `TRAVELING` runtime rows |
| SLEEP due | `activityDueAtWorldTime` on `SLEEPING` runtime rows |
| Need threshold | Analytic solve for Hunger/Rest/Social crossing action thresholds from anchor + rates |
| Work obligation edges | Employment schedule (UTC Mon–Fri 09:00–17:00) vs World Time |
| Replan defer | `DEFER_UNTIL_WORLD_TIME` target from policy |

### Future (contracts only)

| Boundary | Owner |
| -------- | ----- |
| Conversation / social routine | M3/M4 |
| Payroll / rent | M6 |
| Institutional open/close | future |
| External fact arrival | `EXTERNAL-INPUTS.md` |

## Need Threshold Scheduling (research)

Needs are lazy:

```
value(t) = clamp(anchor + rate × (t − anchor.t) − relief, 0, 100)
```

If action threshold is `θ`, next crossing can be solved:

```
t_cross = anchor.t + (θ − current + relief) / rate   (when rate > 0 and path crosses)
```

Then wake at `t_cross` instead of evaluating every minute.

Constraints:

- Hysteresis (activation vs release) must be respected — compute both directions.
- Profile/seed stable variation already in rates — still analytic per resident.
- Relief events reset the path — recompute after each committed meal/sleep/talk.
- **Do not modify M3 Needs** — this is a scheduler consumer of existing lazy semantics.

## Scheduled Activity Jump

Runtime already stores:

```
currentActivity ∈ {IDLE, TRAVELING, SLEEPING}
activityDueAtWorldTime
```

Catch-up:

```sql
-- conceptual; not a migration
SELECT resident_id, activity_due_at_world_time
FROM resident_runtime_states
WHERE world_id = $1
  AND current_activity IN ('TRAVELING','SLEEPING')
  AND activity_due_at_world_time <= $target
ORDER BY activity_due_at_world_time, resident_id
LIMIT batch;
```

Then `completeResidentAction` for each in deterministic order.

## Work Obligation Wake Points

Not every minute of a shift:

| Point | Meaning |
| ----- | ------- |
| Shift start − travel slack | Decision: leave for work |
| Shift start | Late/absent classification (derived) |
| Shift end | Completion / free time |

Emit work-related World Events only at these edges (future), not `WORK_DUE` every minute.

## Algorithm Sketch

```text
function nextMeaningfulBoundary(world, target):
  candidates = []

  # due activities
  candidates += earliest runtime due ≤ target

  # need threshold crossings (per resident, analytic)
  candidates += earliest need wake ≤ target

  # work edges
  candidates += next work boundary ≤ target

  # deferred replans
  candidates += earliest defer target ≤ target

  if candidates empty: return null  # jump straight to target

  return min(candidates) by (worldTime, priorityClass, residentId)
```

## Ordering at Equal World Time

See `DETERMINISTIC-ORDERING.md`. Event-jump must not depend on:

- DB insertion order
- Hash map iteration
- `Promise` completion order
- Locale-sensitive sort

## Anti-Patterns

| Anti-pattern | Replacement |
| ------------ | ----------- |
| Per-minute need evaluation | Analytic threshold |
| Per-minute sleep scan | Due-time index |
| Per-minute `WORK_DUE` event | Shift edges only |
| Random “something happens” filler | Only real Kernel decisions |

## Relationship to Simulation Fidelity

Event-jump with exact Kernel commits = **S0 exact event simulation**. This is the M8 v1 requirement. Aggregated fidelity is deferred (`CATCHUP-FIDELITY.md`).

## PENDING_PRE_AL_07

Final driver loop, lease/fence, and exact ordering key are owned by PRE-AL-07. M8 event-jump consumes that driver’s `runUntil` / `processDueActivities` surface; it does not fork a second due-queue implementation.
