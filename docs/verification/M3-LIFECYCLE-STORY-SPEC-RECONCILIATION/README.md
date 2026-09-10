# M3 Lifecycle & Story Sanity Formal Specification Reconciliation

## Status

`SPEC_RECONCILIATION_COMPLETE`

`SPEC_READY_FOR_FORMAL_IMPLEMENTATION`

`SPEC FREEZE = ON`

This directory freezes the next implementation boundary. It is a
specification and audit package only. It does not implement EAT, WORK, TALK,
M3-T05, a new PRE-AL run, or any M4/M5/M6 work.

The implementation gate has two explicit prerequisites: the proposed EAT
resource-capability ADR and the proposed TALK paired-runtime-lock ADR must be
accepted before production changes begin. The design is not left open; the
ADRs are registration gates for the choices recorded here.

## Authority

Read [01_BASELINE_AND_AUTHORITY.md](./01_BASELINE_AND_AUTHORITY.md) first.
The current Git main, accepted ADRs, formal task sources, verification
reports, and current code are reconciled there. The unmerged
`origin/review/m3-closure-blocker-reconciliation` result is explicitly treated
as a lower-level review input and its conflicts are registered rather than
silently adopted.

## Frozen outputs

- `EAT`, `WORK`, and `TALK` get Kernel-backed STARTED/COMPLETED lifecycles.
- `MOVE` and `SLEEP` semantics are reused unchanged.
- Life Engine remains the WHAT layer; the Kernel remains the CAN/COMMIT layer;
  the scheduler remains the WHEN layer.
- EAT uses a Kernel-owned, versioned, bounded food-unit consumption seam. It
  does not create prices, accounts, merchants, journals, or a second inventory.
- WORK records attendance/shift completion only. Payroll and wage settlement
  stay in M6.
- TALK is one initiator request with a participant reference. Kernel start
  atomically locks both residents in the same world and location. There is no
  dialogue, transcript, Memory, Relationship mutation, or LLM.
- BUY remains declared but non-executable in M3; full settlement belongs to
  M6.
- The historical `PRE-AL-GATE = PASS` remains valid only for its declared
  fixture-only `MOVE/SLEEP` profile. A new equivalent
  `M3-LIFECYCLE-STORY-GATE` is required after implementation.
- M3-T05 is a machine-gated Story Sanity run, not a human impression report.

## Document map

| Area                                 | Document                                                                                                                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline and conflicts               | [01](./01_BASELINE_AND_AUTHORITY.md), [02](./02_EXISTING_M3_ACTION_MODEL.md)                                                                                                                                   |
| Common and action contracts          | [03](./03_LIFECYCLE_COMMON_CONTRACT.md), [04](./04_EAT_FORMAL_SPEC.md), [05](./05_WORK_FORMAL_SPEC.md), [06](./06_TALK_FORMAL_SPEC.md), [07](./07_BUY_EXPLICIT_BOUNDARY.md)                                    |
| Decision, scheduling, recovery       | [08](./08_M3_T04_EXTENSION_SPEC.md), [09](./09_SCHEDULER_DUE_WAKE_EXTENSION.md), [10](./10_FAILURE_REPLAN_SPEC.md)                                                                                             |
| Events, replay, checkpoints          | [11](./11_EVENT_REGISTRY_EXTENSION.md), [12](./12_REPLAY_EXTENSION_SPEC.md), [13](./13_CHECKPOINT_AND_REBUILD.md), [14](./14_PRE_AL_GATE_RERUN_DECISION.md)                                                    |
| Story Sanity and T05                 | [15](./15_STORY_SANITY_FORMAL_DEFINITION.md), [16](./16_STORY_SANITY_HARD_GATES.md), [17](./17_STORY_SANITY_DIAGNOSTICS.md), [18](./18_STORY_SANITY_ARTIFACT_SCHEMA.md), [19](./19_M3_T05_FORMAL_TASK_SPEC.md) |
| Next implementation and verification | [20](./20_IMPLEMENTATION_TASK_SPEC.md), [21](./21_VERIFICATION_TASK_SPEC.md), [22](./22_FINAL_SEQUENCE.md)                                                                                                     |
| Boundaries and risks                 | [23](./23_ADR_REQUIREMENT_MATRIX.md), [24](./24_M6_COMPATIBILITY_BOUNDARY.md), [25](./25_M4_M5_COMPATIBILITY_BOUNDARY.md), [26](./26_RISK_REGISTER.md), [27](./27_PENDING_DECISIONS.md), [28](./28_RESULT.md)  |

The machine-readable companion is
[`m3-lifecycle-story-spec.json`](./m3-lifecycle-story-spec.json). Markdown and
accepted ADRs remain the human authority; JSON is a checked projection.
