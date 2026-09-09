# WORLD-LAG-FRESHNESS

## Definitions

```text
World Lag = targetWorldTime - persistedWorldTime
```

| Term | Meaning |
| ---- | ------- |
| `persistedWorldTime` | `worlds.world_time` (truth) |
| `targetWorldTime` | Policy-mapped world time that “should” exist now |
| Lag states | Operational classification of lag magnitude |

## Lag States (ops concept — thresholds not frozen)

| State | Meaning |
| ----- | ------- |
| `CURRENT` | Lag ≈ 0 (within small epsilon) |
| `MINOR_LAG` | Small catch-up, likely invisible |
| `CATCHING_UP` | Active catch-up in progress |
| `SEVERELY_BEHIND` | Large downtime / horizon cap hit |

## World Execution Status (product-facing, research)

| Status | User interaction |
| ------ | ---------------- |
| `CURRENT` | Normal |
| `CATCHING_UP` | Read-only or restricted writes (see below) |
| `DEGRADED` | Limited features; honesty required |
| `MAINTENANCE` | Restricted |

Exact product copy and thresholds are later product work.

## Freshness Contract Recommendation (M8 v1)

**Interactive writes require world `CURRENT` (or `MINOR_LAG` within epsilon).**

Rationale:

- Submitting MOVE while world is still on “yesterday” creates ambiguous intended World Time
- v1 prefers simple consistency over timeline forking
- Read-only observation of a slightly stale world may be allowed if clearly labeled

### Stale Action Submissions

If a client submits an action while lag > epsilon:

| Option | M8 v1 stance |
| ------ | ------------ |
| A. Reject until CURRENT | **Recommended default** |
| B. Queue bound to intended World Time | Future option |
| C. Fork timeline | **Rejected v1** |

## Presentation Lag vs Truth Lag

| Lag | Owner |
| --- | ----- |
| World Truth lag | Catch-up planner |
| Network projection lag | M7 presentation |
| Digest lag | Product cursor |

Do not mix them in one metric.

## Metrics

- `worldLagMs`
- lag state
- catch-up chunk progress
- time-to-current estimate (ops)
- % residents due backlog

## Honesty Rule

Never present a `SEVERELY_BEHIND` world as fully current. Never hide catch-up behind a spinner that pretends the past was instantaneous narrative.
