# WORLD-EXECUTION-LOD

World Execution LOD is **not** Visual LOD (M7) and **not** Intelligence LOD (M5). It answers: *how much world computation runs for this slice of the world right now?*

## Principle

> The world does not pretend to stop when unobserved. Only the **compute strategy** changes.

A dormant resident still has identity, state, relationships, history, reconstructible needs, and scheduled obligations.

## Proposed Levels (research names)

| Level | Name | When | What runs |
| ----- | ---- | ---- | --------- |
| **W0** | `ACTIVE` | Human observers in relevant area; interactive zone | Continuous presentation transforms, high-frequency local projection, full cognition for nearby residents |
| **W1** | `BACKGROUND` | World RUNNING, few/no humans | Event-jump scheduler; due activities; lazy needs; scheduled obligations; optional low-LOD cognition |
| **W2** | `DORMANT_CATCHUP` | Process restart / lag recovery | Catch-up planner only; jump to next boundaries; commit Kernel facts; no presentation |

### Related but distinct LODs

| LOD family | Owner (future) | Concern |
| ---------- | -------------- | ------- |
| Visual LOD | M7 | Render detail, AOI, avatar complexity |
| Intelligence LOD | M5 | I0–I3 cognition depth |
| **World Execution LOD** | M8 research | Whether/how the world simulates a slice |

They may correlate (visible residents often W0 + higher I) but are **not bound**. A background resident can still complete SLEEP at due time under W1 with I0/I1.

## Level Transitions

```
W2 DORMANT_CATCHUP
    │ catch-up reaches target / lag cleared
    ▼
W1 BACKGROUND  ←→  W0 ACTIVE
    ▲                     │
    │ lag / restart       │ last relevant human leaves
    └─────────────────────┘
```

Rules:

1. Transition never mutates World Truth by itself — only compute policy.
2. W0→W1 must not cancel in-flight Kernel transactions.
3. W1→W2 happens on process start if `worldLag > 0`.
4. World status `PAUSED` overrides all levels: no domain advance regardless of LOD.

## What Each Level Must Guarantee

### W0 ACTIVE

- Presentation projection can run 10–20 Hz for visible entities
- World Facts remain discrete (Kernel commits)
- Needs remain lazy (no per-frame Need writes)
- Human actions submit ActionRequest through Kernel

### W1 BACKGROUND

- No renderer, no WebSocket required
- Due activities complete at `activityDueAtWorldTime`
- Need threshold crossings wake decision cycles
- Work shift edges are boundaries
- No full-population per-second scan

### W2 DORMANT_CATCHUP

- Read last durable World Time + wake index candidates
- Event-jump to next meaningful boundary
- Small deterministic Kernel commits
- Bounded by catch-up horizon / policy
- No LLM required
- No presentation

## Anti-Patterns

| Anti-pattern | Why forbidden |
| ------------ | ------------- |
| World stops when zero WebSockets | Violates Second Human World |
| Fake “simulate 30 days” without Kernel commits | Invents history |
| W0 full-city high-frequency tick | Does not scale |
| Treating W2 as PAUSED | Confuses infra lag with intentional pause |

## Relationship to Hybrid Execution

W0 uses Continuous Presentation + Discrete Facts.  
W1 uses Discrete Facts + Lazy Needs + Scheduled Activities.  
W2 uses Event-Jump Catch-up only.

See `HYBRID-WORLD-EXECUTION.md` and `MULTI-RATE-WORLD.md`.

## Naming Status

Names `W0/W1/W2` and `ACTIVE/BACKGROUND/DORMANT_CATCHUP` are research candidates. Formal freeze requires later ADR. Do not add DB enum values until formal M8.
