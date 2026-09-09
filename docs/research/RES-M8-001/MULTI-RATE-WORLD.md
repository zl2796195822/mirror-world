# MULTI-RATE-WORLD

Different layers of 镜界 run at different rates. Confusing these rates causes either performance collapse or fake history.

## Rate Table

| Layer | Typical rate | Truth? | Notes |
| ----- | ------------ | ------ | ----- |
| Client render / UI | 60 FPS | No | M7; pure presentation |
| Network projection | 10–20 Hz | No | Visible AOI only |
| World transform (local presentation) | 10–20 Hz | No | Interpolation targets |
| World Facts | Discrete commits | **Yes** | Kernel + Event Ledger |
| Needs values | Lazy on read | Derived | Analytic from anchor |
| Life decisions | Event / wake driven | Policy + outcomes | Observation → Goal → Action |
| Institutions / economy (future) | Scheduled / event | Yes when committed | Payroll day, rent day |
| Offline catch-up | Jump to boundaries | Yes when committed | Not a tick rate |

## Why Multi-Rate Matters

1. **Scale:** 100k residents cannot share one Hz.
2. **Truth purity:** only discrete Kernel commits enter history.
3. **Offline continuity:** catch-up uses fact rate, not presentation rate.
4. **Cost control:** LLM is not on a fixed Hz heartbeat.

## Hard Rules

1. Presentation rate never gates fact production.
2. Fact production never requires a connected client.
3. Needs are never evaluated into the Event Ledger at presentation rate.
4. Catch-up never simulates at 60 FPS for 30 days.

## Coupling Policy

| Coupling | Allowed? |
| -------- | -------- |
| Visible resident → higher Visual LOD | Yes |
| Visible resident → W0 execution | Yes (correlation) |
| Visible resident → mandatory I3 LLM every frame | No |
| Invisible resident → no facts | No — scheduled facts still occur |
| Online user count → World Time speed | No (except explicit ACCELERATED policy) |

## Diagram

```text
60 FPS ──── Client UI (M7)
  │
10–20 Hz ── Network projection / local transform
  │
Discrete ── World Facts (Kernel commits)  ←── ONLY durable truth
  │
Lazy ────── Needs / derived reads
  │
Wake ────── Decisions / cognition (M5)
  │
Jump ────── Offline catch-up boundaries (M8)
```

## Equivalence Note

A world advanced by:

- Realtime discrete commits over 7 days, vs
- Offline catch-up event-jumps over the same World Time span

must produce the same canonical authoritative state when deterministic assumptions hold (same genesis, policies, external inputs). See `REALTIME-CATCHUP-EQUIVALENCE.md`.
