# M8-GATE-PROPOSAL

Future formal M8 Gate checklist. Research proposal — does not modify official roadmap.

## Gate Identity

- Name: Persistent World / Offline Continuity Gate
- Mode: real verification, not document-only
- World size start: 30 residents (T0)
- Scenarios: 7d and 30d offline; pause; crash-mid-catchup; queue-loss

## Hard Acceptance Criteria

| ID | Criterion |
| -- | --------- |
| G-01 | World survives process restart (time, runtime, seq continuous) |
| G-02 | Scheduler queue / Redis loss → rebuild due work → no missed permanent stall |
| G-03 | World Time policy respected (PAUSED no catch-up; RUNNING maps elapsed) |
| G-04 | No wall-clock direct domain mutation (Needs/runtime) |
| G-05 | Offline catch-up reaches target World Time via Kernel commits |
| G-06 | No duplicate MOVE/SLEEP completion after restart/redelivery |
| G-07 | No worldSeq corruption; append-only preserved |
| G-08 | Catch-up bounded (horizon/chunk; no infinite loop) |
| G-09 | Same manifest realtime vs catch-up → same authoritative hash (deterministic assumptions) |
| G-10 | PAUSED does not catch up |
| G-11 | Unexpected downtime policy honored |
| G-12 | LLM provider offline → world still advances |
| G-13 | Digest deletion does not affect Truth |
| G-14 | World isolation (no cross-world commits) |
| G-15 | 30 resident offline 7d scenario completes with verifiable history |
| G-16 | 30 resident offline 30d scenario completes (event-jump, not minute-walk) |
| G-17 | Checkpoint recovery / suffix replay still valid |
| G-18 | Resident-scoped failure isolation (poison resident ≠ dead world) |
| G-19 | Interactive writes rejected or safely deferred while CATCHING_UP (per policy) |
| G-20 | Ordering stability under shuffled input supply |

## Evidence Artifacts

- SimulationManifest
- Event ledger export / hashes
- Outcome stream
- Catch-up metrics
- Canonical projection hash + decision digest
- Crash/queue-loss logs
- Equivalence A/B comparison report

## Severity

| Result | Meaning |
| ------ | ------- |
| PASS | All hard criteria for declared capability profile |
| FAIL | Hard invariant violated |
| INCONCLUSIVE | Missing capability/evidence (cannot claim PASS) |

## Product-Level Companion

See `PERSISTENT-WORLD-ALPHA.md` for human-experience acceptance.
