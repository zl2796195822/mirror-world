# M8-TO-M3-CONTRACT

M8 stands on M3 simulation foundation. It does not create a second Life Engine, scheduler truth, or canonical state system.

## M8 Reuses (must not reinvent)

| M3 Asset | How M8 uses it |
| -------- | -------------- |
| World Clock | Advance time only via Kernel clock |
| Event Ledger / worldSeq | Catch-up commits real events |
| ActionRequest + Outcome | All resident actions |
| MOVE/SLEEP semantics | Due completions during catch-up |
| Runtime state (`activityDueAtWorldTime`) | Jump targets |
| Needs lazy evaluator | Threshold wake computation |
| Goals evaluator | Decision after wake |
| Observation port | Decision input |
| Replan policy `m3-replan-v1` | Failure handling in catch-up |
| Checkpoint / Replay | Recovery + equivalence |
| Canonical hash concepts (RES-M3-003) | Equivalence Gate |
| Deterministic serial driver (PRE-AL-07) | Catch-up is `runUntil` mode |

## M8 Must Not

- Second Kernel
- Second event stream
- Second clock authority
- Fake TestKernel for production continuity
- Wall-clock hunger without World Time
- Per-minute full-population ticks
- LLM-generated missing history
- Own Goal/Need policy semantics

## PRE-AL-07 Overlap

| Concern | PRE-AL-07 | M8 |
| ------- | --------- | -- |
| Serial due ordering | Owns freeze | Inherits |
| Driver surface `runUntil` / `processDueActivities` | Owns | Uses for catch-up |
| Lease/fence | Owns | Uses |
| Offline downtime policy | — | Owns research → formal |
| Wake index rebuild after loss | May provide primitives | Owns recovery contract |
| Lag/freshness product states | — | Owns |
| Return digest | — | Owns read model |

Status: **`PENDING_PRE_AL_07`** — exact surfaces not frozen.

## Replay Taxonomy Alignment

From RES-M3-003:

| Replay kind | M8 relationship |
| ----------- | ---------------- |
| Event Ledger Replay | M8 catch-up must preserve |
| Runtime Projection Replay | M8 recovery depends (once complete) |
| Life Decision Re-evaluation | M8 offline decisions must stay pure |
| Simulation Re-run | M8 equivalence Gate input |

## 30×30

M8 does not redefine 30×30. Future Persistent World Alpha may use 30 residents × offline 7d/30d scenarios **on top of** M3 gate readiness.

## Formal Port Rule

Formal M8 cannot start by “just implementing this research.” It must:

1. Wait for M3 gate-relevant PRE-AL-07 + replay readiness
2. Re-audit then-current main
3. ADR
4. Formal tasks
5. TDD
