# RISKS

Risk register for RES-M8-001. Research-only; no mitigation implementation here.

## R1 — PRE-AL-07 Drift

**Risk:** Formal driver diverges from research assumptions (ordering key, surfaces).  
**Impact:** Catch-up design rework.  
**Mitigation:** Compatibility Review mandatory; keep `PENDING_PRE_AL_07` labels honest.

## R2 — Replay Projection Incomplete

**Risk:** M2 replay is largely worldTime digest; full resident projection replay not done.  
**Impact:** Equivalence Gate cannot fully prove runtime reconstruction.  
**Mitigation:** Extend reducers with M3 gate work; M8 must not overclaim.

## R3 — Downtime Accounting Ambiguity

**Risk:** Current clock cannot distinguish “paused” vs “process was down while RUNNING.”  
**Impact:** `CONTINUE_ELAPSED` imprecise.  
**Mitigation:** Formalize downtime windows/anchors in M8 ADR.

## R4 — Catch-up Cost Shock

**Risk:** Long outage + dense life → large event volume.  
**Impact:** Slow recovery, DB pressure.  
**Mitigation:** Event-jump, chunking, caps, partitioning plan; never coarse fake history.

## R5 — Interactive Writes During Lag

**Risk:** Users submit actions while world stale.  
**Impact:** Ambiguous intended time; inconsistent UX.  
**Mitigation:** v1 reject or queue; no fork.

## R6 — LLM Pressure to “Fill History”

**Risk:** Product asks for stories; team routes through LLM into events.  
**Impact:** Truth corruption.  
**Mitigation:** P6 hard rule; Gate G-12/G-13; digest-only narration.

## R7 — Wake Index Gap for Replan Defer

**Risk:** DEFER targets not durable; crash loses wake.  
**Impact:** Missed reconsideration.  
**Mitigation:** Persist rebuildable defer projection or conservative re-observe policy (formal).

## R8 — Event Type Registry vs Reality

**Risk:** Reserved types (WAGE_PAID, etc.) not emitted; replay no-ops.  
**Impact:** False sense of completeness.  
**Mitigation:** Capability-gated claims (RES-M3-003 style INCONCLUSIVE).

## R9 — Multi-Instance Double Completion

**Risk:** Two drivers complete same activity.  
**Impact:** Should be absorbed by Kernel idempotency — if misused, bugs.  
**Mitigation:** Lease + Kernel guards + tests.

## R10 — Scope Creep to Distributed Mesh

**Risk:** “Persistent world” becomes Kafka/multi-region project.  
**Impact:** M8 never ships.  
**Mitigation:** M8-FORMAL-SCOPE exclusions; port plan discipline.

## R11 — Digest Conflated with Truth

**Risk:** Product stores digest as history source.  
**Impact:** Cannot audit/verify.  
**Mitigation:** Digest is read model; events remain source.

## R12 — Research Treated as Spec

**Risk:** Engineers implement RES-M8-001 directly.  
**Impact:** Violates authority order; skips ADR/TDD.  
**Mitigation:** FREEZE + PORT-PLAN + PREREQUISITES.
