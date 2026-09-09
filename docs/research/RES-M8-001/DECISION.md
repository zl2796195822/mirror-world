# DECISION

Core decisions for RES-M8-001. These are research recommendations for future formal M8 — not implemented policy.

## 1. Persistent ≠ Always Computing

**Decision: YES, formally recommended.**

Residents exist via durable identity/state/history and reconstructible needs/schedule. Continuous compute is LOD-based.

## 2. Unattended World Time Advance

**Decision:** When status is RUNNING, World Time advances per World Time Policy (prod 1:1). Domain effects occur via event-jump catch-up / due processing — not per-second resident ticks. PAUSED/MAINTENANCE do not domain-advance (inherited ADR-0002/0007).

## 3. Base Downtime Policy

**Decision:** Distinguish intentional pause from infra downtime. Recommend **`CONTINUE_ELAPSED` + operational `CAPPED_CATCHUP`** for unexpected downtime while intended RUNNING. Do not auto-rewrite world rules on power loss.

## 4. Event-Jump Catch-up

**Decision: YES.**

Jump from T to next meaningful boundary (activity due, need threshold, work edge, defer due). Never minute-walk full population.

## 5. Global Per-Second Tick

**Decision: FORBIDDEN** as long-term world architecture.

## 6. Scheduler Queue Disposability

**Decision: YES.** Queue/Redis/in-memory wake index must be rebuildable from PostgreSQL durable state.

## 7. Long Downtime Handling

**Decision:** Policy-mapped target World Time; chunked/bounded catch-up; exact S0 events; visible lag if cap prevents instant CURRENT; never LLM-fabricated history; never silent FREEZE unless policy mode says so.

## 8. Realtime vs Catch-up Equivalence

**Decision: REQUIRED** under deterministic assumptions (same manifest/policies/inputs, S0, stable ordering). Future M8 Gate item.

## 9. LLM Offline Continuity Prerequisite

**Decision: NO.**

LLM provider outage must not stop world advance, completions, or structured digest.

## 10. Dormant Resident Existence

**Decision:** Dormant keeps identity, state, relationships (future), history, reconstructible needs, scheduled facts. Only compute strategy changes.

## 11. Checkpoint Evolution

**Decision:** Keep checkpoint rebuildable acceleration; evolve toward richer projection checksums + suffix chains + hybrid triggers; never replace Event Ledger; never “checkpoint and delete history.”

## 12. Event Ledger Long-Term Growth

**Decision:** PostgreSQL-first: don’t log noise; indexes; partitioning; hot/cold archive with checksums. No premature Kafka/Cassandra/ClickHouse as truth.

## 13. World Lag / Freshness

**Decision:** Define lag operationally (CURRENT / MINOR_LAG / CATCHING_UP / SEVERELY_BEHIND). Interactive writes require CURRENT (or MINOR_LAG epsilon) in v1. Honest UI.

## 14. User Writes During Catch-up

**Decision:** v1 — reject or safely queue; **no timeline fork**.

## 15. Offline Digest Production

**Decision:** Committed history → query → structured ranking → optional LLM narrative. Digest is not Truth. v1: resident personal + simple street importance; fallback ranking without M4.

## 16. Formal M8 Minimum Scope

**Decision:** 12-item compressed scope in `M8-FORMAL-SCOPE.md` (execution state, time policy, scheduler recovery, wake rebuild, catch-up planner, event-jump, crash recovery, checkpoint evolution, equivalence, freshness, return digest, ops diagnostics).

## 17. M8 Prerequisites

**Decision:** Hard — PRE-AL-07 + sufficient M3 due-work autonomy + Compatibility Review + ADR. Soft — M4/M5/M6 contracts with fallbacks.

## 18. Persistent World Alpha Acceptance

**Decision:** 7-day human offline → world continued → real committed events → return digest → verifiable history. See `PERSISTENT-WORLD-ALPHA.md`.

## 19. What Must Wait for M3/M4/M5/M6

| Wait for | What |
| -------- | ---- |
| M3 / PRE-AL-07 | Driver freeze, full replay, autonomous due completion |
| M4 | Relationship-aware digest ranking |
| M5 | Intelligence LOD offline cognition |
| M6 | Payroll/rent institutional edges |

M8 continuity itself does not wait for M4/M5/M6.

## 20. Port Plan

**Decision:** FREEZE research → wait prerequisites → Compatibility Review → ADR → formal tasks → TDD → Gate. Never implement this package as a drop-in spec.

---

## Supporting One-Liners

| Topic | Decision |
| ----- |----------|
| World Execution LOD | Research W0 ACTIVE / W1 BACKGROUND / W2 DORMANT_CATCHUP |
| Hybrid execution | Confirmed viable on M2/M3 foundation |
| Multi-rate world | 60 FPS UI ≠ facts; facts are discrete Kernel commits |
| Ordering | Inherit `(due, residentId, …)` from PRE-AL-07 research |
| Fairness | Stable due order; resident-scoped budgets |
| Failure isolation | Resident STOP ≠ world halt; seq corruption = world-fatal |
| External inputs | Record envelopes; no live API in replay |
| Fidelity | S0 only for v1 |
| Product presence | Not World Fact |
| Multi-world | World-scoped clocks, catch-up, digests |
| Second Human World Gate | History is committed causality, not chat, not LLM story |
