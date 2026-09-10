# M3-LIFECYCLE-STORY-GATE

## Registration

| Field         | Value                                                                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID            | `M3-LIFECYCLE-STORY-GATE`                                                                                                                                                                                            |
| Kind          | Verification gate                                                                                                                                                                                                    |
| Status        | `DEFINED / NOT_STARTED`                                                                                                                                                                                              |
| Runs after    | `M3 Behavioral Lifecycle Extension`                                                                                                                                                                                  |
| Frozen inputs | [14 PRE-AL decision](../verification/M3-LIFECYCLE-STORY-SPEC-RECONCILIATION/14_PRE_AL_GATE_RERUN_DECISION.md), [16 Hard Gates](../verification/M3-LIFECYCLE-STORY-SPEC-RECONCILIATION/16_STORY_SANITY_HARD_GATES.md) |

This is a registered future gate, not a run performed by the current
governance task.

## Required run

The gate must use clean disposable PostgreSQL, a fixed immutable manifest and
seed, the existing lease/fence and deterministic World-Time driver, zero LLM
calls, and exactly:

```text
30 residents × 30 World Days = 43,200 World Minutes
action scope = MOVE, SLEEP, EAT, WORK, TALK
```

It must prove fixture integrity, Kernel-owned EAT conservation, exact WORK
obligation/attendance, paired TALK legality/atomicity, causal Need → Goal →
Candidate → ActionRequest → Outcome evidence, bounded recovery, liveness,
isolation, typed replay, checkpoint suffix replay, genesis rebuild, and
same-seed determinism. BUY must remain non-executable.

## Fifteen hard gates

1. Run endpoint
2. Fixture integrity
3. Accepted action coverage
4. Causal chain
5. Need response
6. Need effect
7. Work obligation
8. Resource conservation
9. TALK legality / atomicity
10. Bounded recovery
11. Liveness
12. Spatial / activity safety
13. Replay equivalence
14. Determinism
15. Isolation / scope

All 15 predicates remain mandatory. Diagnostics and human review notes cannot
waive a failed hard gate or promote an implementation result to M3 PASS.
