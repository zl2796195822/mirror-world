# 12 Realtime Recovery & Truth Boundary

## Recommendation

**Realtime service is NOT durable.**

If every realtime process dies:

- PostgreSQL world truth unaffected
- projection can be rebuilt
- clients reconnect and snapshot

## Alignment with experiments

EXP-REALTIME-001 decision:

- Colyseus absolutely not durable truth
- restart rebuilds room from authoritative source

RES-M8-001:

- renderer optional
- rebuild path `Truth → projection → network snapshot → client render`

## Recovery matrix

| Failure                  | Truth impact                   | User-visible             | Recovery                                                         |
| ------------------------ | ------------------------------ | ------------------------ | ---------------------------------------------------------------- |
| Realtime process crash   | NONE                           | disconnect, frozen scene | restart process, rebuild read model, clients snapshot            |
| Realtime memory wipe     | NONE                           | same                     | rebuild                                                          |
| WebSocket drop           | NONE                           | freeze/reconnect UI      | token reconnect + snapshot                                       |
| Projection builder crash | NONE                           | stale updates            | restart builder from last truth seq                              |
| PG brief outage          | world actions fail/closed      | degraded                 | Kernel fail-closed; realtime serves last projection marked stale |
| PG data loss             | catastrophic (out of M7 scope) | n/a                      | backup/replay ops, not M7                                        |

## Rebuild procedure (recommended)

```text
1. Start projection builder
2. Read worlds.world_seq + resident_runtime_states (+ optional projection checkpoint)
3. Build full snapshot at seq S
4. Start realtime room with snapshot
5. Subscribe subsequent commits/events after S
6. Advertise ready
```

No client frames required. No avatar cache required. No WebGL required.

## Lease/session strategy

From experiment recommendation:

- short reconnection token window for UX smoothness
- authoritative recovery is still fresh snapshot
- do not keep multi-minute server-side delta buffers as correctness dependency

## Readiness

Realtime health should distinguish:

- process up
- projection attached
- truth freshness known

Clients should show honest degraded state if projection lag high (with M8 lag states).

## What realtime may own

- socket sessions
- AOI indexes
- last projected payload cache
- rate limiting
- presence of observers (not world presence of residents)

## What realtime must not own

- location authority
- identity authority
- world clock
- event append
- economy balances
- "last known truth that cannot be rebuilt"

## Gate

Formal M7 should include:

- kill realtime mid-run
- prove Kernel tables unchanged
- prove reconnect clients converge to same projection as truth-derived snapshot
