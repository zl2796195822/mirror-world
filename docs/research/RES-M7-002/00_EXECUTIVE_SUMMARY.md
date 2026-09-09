# 00 Executive Summary

- Task: RES-M7-002
- Status: `READY_WITH_PENDING_CONTRACTS`
- FREEZE: ON

## One-sentence answer

浏览器看到的不是世界，而是 **World Truth 的单向投影**；Realtime / Scene / Avatar 全部可丢弃、可重建，且永远不能回写事实。

## Core architecture (recommended)

```text
PostgreSQL World Truth
  (Worlds / Event Ledger / worldSeq / Runtime States / Outcomes)
        │  read-only
        ▼
Projection Builder  (event-consumer + snapshot generator; PG-first)
        │
        ▼
Projection Store / Snapshot  (rebuildable; not durable truth)
        │
        ▼
Realtime Read Model  (in-memory / process-local; NOT durable)
        │  AOI filter + afterSeq
        ▼
Client  (untrusted)
        │
        ▼
3D Scene / Avatar / Animation  (Derived Presentation State only)
```

## Hard invariants

1. PostgreSQL is durable truth; Redis/realtime/WebGL never are.
2. World Kernel is the only write entrance for world facts.
3. LLM / Browser / Renderer never mutate location, identity, economy, history, world time.
4. `locationId` is a logical world fact; `x/y/z` is presentation.
5. MOVE commits location only on COMPLETED; walking animation is interpolation between committed states + movement intent.
6. AOI is visibility filtering, not existence filtering.
7. Client must snapshot at `sourceWorldSeq = X` then subscribe `afterSeq = X`.
8. Detect gap → re-snapshot; client never guesses.
9. Dormant/catching-up world ≠ paused world; UI must be honest.
10. Delete all M7 projection layers → rebuild from truth = YES (future gate).

## Current-main readiness for M7

| Capability                                     | Formal status at baseline      |
| ---------------------------------------------- | ------------------------------ |
| World Clock / worldSeq / Event Ledger          | CURRENT FACT (M2)              |
| ActionRequest → KernelActionOutcome            | CURRENT FACT (PRE-AL-01)       |
| resident_runtime_states + MOVE/SLEEP lifecycle | CURRENT FACT (PRE-AL-04/05)    |
| Observation with location/activity/obligation  | CURRENT FACT (PRE-AL-02..05)   |
| Scheduler / continuous action loop             | PENDING_PRE_AL_07              |
| WebSocket / Colyseus in main                   | NOT PRESENT                    |
| Formal projection tables                       | NOT PRESENT                    |
| Formal 3D / avatar / first street in main      | NOT PRESENT (experiments only) |
| M8 catch-up                                    | RESEARCH (RES-M8-001)          |

## Key design choices

| Topic              | Recommendation                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Projection style   | Hybrid: event-consumer read model + PG-backed snapshot; **not** a second truth DB                |
| Infrastructure     | PostgreSQL-first; no new mandatory infra for M7 v1                                               |
| Realtime transport | Colyseus-shaped read model OK (EXP-REALTIME-001 conditional recommend); never durable            |
| MOVE visual        | authoritative logical location + movement intent + presentation interpolation + visual transform |
| Spatial            | Logical Topology ≠ Mesh Geometry; locationId stable; geometry versioned separately               |
| Visual LOD         | Independent of Execution LOD / Intelligence LOD                                                  |
| Optimistic UI      | Allowed only as short-lived visual anticipation; committed truth always wins                     |
| 30 residents       | World population 30 ≠ 30 full-fidelity avatars on screen                                         |

## Pending contracts that gate formal M7

- PRE-AL-07 scheduler/driver (world advancing continuous life)
- RES-M8-001 world lag / catch-up / freshness product thresholds
- RES-M9-001 identity presentation (HUMAN/PROXY/NATIVE honesty labels)
- Physical device performance evidence (all experiments currently desktop/sim)
- Formal Asset Budget Gate adoption
- Full resident runtime projection replay gate

## Final status

`READY_WITH_PENDING_CONTRACTS`

不是 PASS，不是 M7 COMPLETE，不是 IMPLEMENTED。
