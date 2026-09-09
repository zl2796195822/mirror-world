# RES-M8-001 Persistent World & Offline Continuity Architecture

- Task: RES-M8-001
- Title: 持续世界与离线世界连续性架构研究
- Nature: RESEARCH ONLY — ARCHITECTURE / SIMULATION / PERSISTENCE DESIGN
- Status: `READY_WITH_PENDING_CONTRACTS`
- Baseline: `b3229aef5b820fc261443c7f6d8a50f9c3b473c6` (`origin/main`)
- Branch: `research/m8-persistent-world-offline-v1`
- Worktree: `/Users/alin/AI项目/mirror-world-m8-persistent-world-research`
- Date: 2026-09-09
- FREEZE: OFF until research completion, then ON

## Product North Star

镜界 = The Second Human World.

- Not a simulator that only runs while the user is open.
- A world with its own time, residents, events, relationships, economy, and history.
- **WORLD EXISTS BEFORE THE USER ENTERS.**
- **USER OFFLINE ≠ WORLD PAUSED.**

This research answers how such a world can persist, catch up, recover, and present history — without inventing a second scheduler/replay/truth stack.

## Scope Discipline

### Forbidden in this research

- Implementing formal M8
- Modifying `main`
- Merging/cherry-picking to main
- Changing `PROJECT_STATE.md` or `MEMORY.md`
- New formal migrations
- Formal scheduler / background worker / production queue / offline runtime
- New production dependencies

### Allowed

- Research docs
- Architecture diagrams (markdown/mermaid/ASCII)
- State machine proposals
- Pseudo code
- Data-flow design
- Failure matrix
- Benchmark plan
- Future port plan

## Current Formal State (as of baseline)

| Milestone | Status |
| --------- | ------ |
| M0 | PASS |
| M1 | PASS |
| M2 | PASS |
| M3 | IN_PROGRESS |
| M3-T01/T02/T03 | PASS |
| M3-T04 | BLOCKED_BY_PRE_ACTION_LOOP_GATE |
| PRE-AL-00..06 | PASS |
| PRE-AL-07 Scheduler/Driver | PENDING_PRE_AL_07 |
| M8 | NOT STARTED |

PRE-AL-06 is complete at baseline. PRE-AL-07 is not complete; scheduler-related contracts are marked `PENDING_PRE_AL_07` and are not frozen by this research.

## Document Index

| File | Purpose |
| ---- | ------- |
| `CURRENT-WORLD-AUDIT.md` | What the formal system actually is today |
| `PERSISTENCE-PRINCIPLES.md` | Hard principles for a Second Human World |
| `WORLD-TIME-POLICY.md` | Wall / World / Event / Offline-Elapsed time |
| `WORLD-EXECUTION-LOD.md` | W0/W1/W2 execution levels |
| `HYBRID-WORLD-EXECUTION.md` | Continuous presentation + discrete facts |
| `MULTI-RATE-WORLD.md` | 60 FPS UI vs discrete world facts |
| `OFFLINE-CATCHUP.md` | Catch-up planner architecture |
| `EVENT-JUMP-SIMULATION.md` | Jump to next meaningful boundary |
| `WAKE-INDEX.md` | Due-work / wake index design options |
| `SCHEDULER-TRUTH-BOUNDARY.md` | Scheduler ≠ Truth hard invariant |
| `CRASH-RECOVERY.md` | A–E crash cases |
| `WORLD-BOOT-RECOVERY.md` | Cold start / restart flow |
| `DOWNTIME-POLICY.md` | CONTINUE_ELAPSED vs FREEZE vs CAPPED |
| `CATCHUP-FIDELITY.md` | Exact vs coarse simulation |
| `DETERMINISTIC-ORDERING.md` | Stable ordering at equal World Time |
| `FAIRNESS.md` | Scheduler fairness across residents |
| `FAILURE-ISOLATION-MATRIX.md` | Resident-scoped vs world-fatal |
| `CHECKPOINT-EVOLUTION.md` | Long-run checkpoint strategy |
| `EVENT-LEDGER-GROWTH.md` | 10-year ledger growth directions |
| `HISTORICAL-QUERY.md` | Digest/history index proposal |
| `EXTERNAL-INPUTS.md` | Deterministic external fact envelope |
| `WORLD-LAG-FRESHNESS.md` | Lag states and freshness contract |
| `USER-RETURN-FLOW.md` | Reconnect → digest → enter |
| `OFFLINE-DIGEST.md` | What happened while I was away |
| `REALTIME-CATCHUP-EQUIVALENCE.md` | Equivalence test design |
| `POPULATION-SCALING.md` | 30 → 100k complexity model |
| `DORMANCY-CONTRACT.md` | Dormant ≠ non-existent |
| `M8-TO-M3-CONTRACT.md` | Reuse of M3 simulation foundation |
| `M8-TO-M4-CONTRACT.md` | Memory/Relationship/Perception boundary |
| `M8-TO-M5-CONTRACT.md` | Agent Runtime / LLM boundary |
| `M8-TO-M6-CONTRACT.md` | Economy scheduler boundary |
| `M8-TO-M7-CONTRACT.md` | Renderer decoupling |
| `M8-FORMAL-SCOPE.md` | Compressed formal M8 minimum |
| `M8-GATE-PROPOSAL.md` | Future M8 gate checklist |
| `PERSISTENT-WORLD-ALPHA.md` | Product-level alpha acceptance |
| `PREREQUISITES.md` | What must land before formal M8 |
| `PORT-PLAN.md` | How research ports into formal M8 later |
| `RISKS.md` | Risk register |
| `RESULT.md` | Research result summary |
| `DECISION.md` | Core decisions (20 questions answered) |

## Core One-Line Decisions

1. **Persistent ≠ Always Computing** — recommended.
2. Unattended World Time advances via World Time Policy + event-jump catch-up, not per-second resident ticks.
3. Base downtime policy: intentional pause ≠ infra downtime; default unexpected downtime = `CONTINUE_ELAPSED` with catch-up cap.
4. Event-jump catch-up: yes.
5. Global per-second full-resident tick: forbidden.
6. Scheduler queue is rebuildable from PostgreSQL durable state.
7. Long downtime: policy-driven, chunked, never LLM-fabricated history.
8. Realtime vs catch-up equivalence: required when deterministic assumptions hold.
9. LLM is **not** a prerequisite for offline continuity.
10. Dormant residents retain identity/state/history; compute is LOD-based.
11. Checkpoint remains rebuildable acceleration, not truth replacement.
12. Ledger growth: PostgreSQL partitioning/archiving first; no premature Kafka/Cassandra.
13. World Lag is operational; product freshness contract separate.
14. Interactive writes during catch-up: **queue or reject**, no timeline fork in v1.
15. Digest is a read model over committed history; LLM may narrate, never invent.
16. Formal M8 minimum scope: see `M8-FORMAL-SCOPE.md`.
17. Prerequisites: PRE-AL-07 + M3 gate closure as hard; M4/M5/M6 contracts optional for v1.
18. Persistent World Alpha: 7-day offline continuity with verifiable history.
19. Waiting boundaries: M4 relationship ranking, M5 intelligence LOD, M6 payroll — contracts only.
20. Port plan: Compatibility Review → ADR → Formal Tasks → TDD; research is frozen input, not implementation.

## Status Meaning

`READY_WITH_PENDING_CONTRACTS` means:

- Architecture direction is coherent with current Kernel/Replay/Needs foundation.
- PRE-AL-07 Scheduler/Driver is not finished; scheduler contracts remain pending.
- M4/M5/M6 formal implementations are incomplete; their offline integration points are contracts only.
- Formal M8 must re-run Compatibility Review before any implementation.

This research does **not** claim Persistent World is implemented.
