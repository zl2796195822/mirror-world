# PREREQUISITES

What must be true before **formal** M8 implementation begins.

## Hard Prerequisites

| ID | Item | Status at baseline |
| -- | ---- | ------------------ |
| H1 | PRE-AL-07 Scheduler / Simulation Driver | **PENDING_PRE_AL_07** |
| H2 | M3-T04 unblocked / action loop enough to complete due work autonomously | BLOCKED_BY_PRE_ACTION_LOOP_GATE |
| H3 | M3 Gate readiness (incl. resident/domain replay as required by RES-M3-003) | IN_PROGRESS |
| H4 | World Kernel durability invariants remain green | PASS at baseline |
| H5 | Compatibility Review against then-current main | Not started |
| H6 | Formal ADR for M8 scope/policy | Not started |

## Soft / Contract Prerequisites

| ID | Item | If missing |
| -- | ---- | ---------- |
| S1 | M4 relationship projection | Fallback digest ranking |
| S2 | M5 intelligence LOD | I0/I1 only offline |
| S3 | M6 payroll/rent edges | Sleep/move/work-shape still sufficient for alpha |
| S4 | Causation id (MIRROR-FIND-002) | Acceptable P2 |
| S5 | Typed domain event payload registry | Required before rich replay claims |

## Environment / Ops Prerequisites

- PostgreSQL remains durable truth
- Multi-instance lease story if multi-writer (may start single driver)
- Metrics for lag/catch-up
- Ability to run isolated world scenarios

## Explicit Non-Prerequisites

- 3D renderer
- LLM provider
- Kafka
- Multi-region DB
- Full economy tables

## Gate to Start Formal M8

```text
M3 foundation sufficient for due-work autonomy
+ PRE-AL-07 driver semantics frozen
+ then-main Compatibility Review
+ ADR
→ Formal M8 tasks (not this research as implementation spec)
```
