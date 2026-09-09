# 25 Cross-Research Dependency Graph

## Contract graph

```text
M2 Clock + Event Ledger + Action Outcome
                    │
                    ▼
             PRE-AL-07 driver
          (WHEN; due/wake M3 v1)
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   M3 Action Loop        M8 Persistence/Catch-up
   (WHAT + Action)       (W policy + recovery)
          │                   │
          ├─────────────┐     ├──────────────┐
          ▼             ▼     ▼              ▼
       M4 Memory/     M6 Economy        M10 Cognition
       Relationship   due/journal       (I + budget)
          │             │                │
          └──────┐      └──────┐         │
                 ▼             ▼         ▼
                 M7 Projection / Realtime / AOI / Visual LOD
                               ▲
                               │ identity-safe projection
                               │
                         M9 Identity / Proxy
```

## Edge classification

| Edge                  | Type                     | Meaning                                                                                      |
| --------------------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| M2 → PRE-AL-07        | Hard dependency          | current driver uses formal Clock, runtime, Outcome and Event Ledger boundaries.              |
| M3 Action Loop → M8   | Hard future dependency   | catch-up must execute valid domain boundaries, not create a second Life Engine.              |
| PRE-AL-07 → M8        | Hard current/soft future | current due activity/deferred wake source is available; full catch-up semantics are not.     |
| M8 → M10              | Hard future              | cognition wakes/defer order must consume one driver boundary and respect offline policy.     |
| M9 → M10              | Hard future              | CognitionAuthority/Proxy Charter constrain promotion, budget and disclosure.                 |
| M9 → M7               | Hard future              | M7 needs identity-safe projection labels, not private raw identity.                          |
| M4 → M7/M10           | Soft future              | relationship/memory facts may be consumed, but projection and cognition are not their owner. |
| M6 → M8               | Soft/future integration  | economy due items may produce wake candidates; M6 remains economic authority.                |
| M7 → M10              | Soft policy signal       | attention/AOI may influence bounded bonus, never authority or unlimited budget.              |
| M3 replay → M8/M10/M7 | Hard for acceptance      | replay/equivalence and source cursors are prerequisites for offline/full-history claims.     |

## Interpretation

Milestone numbers do not establish dependency. The hard path is authority and replay: Kernel/Event Ledger → bounded driver/action boundary → domain policy → derived projections. No edge authorizes implementation of a downstream research package in this task.
