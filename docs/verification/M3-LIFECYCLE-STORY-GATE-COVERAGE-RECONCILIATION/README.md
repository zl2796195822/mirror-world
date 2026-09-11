# M3 Lifecycle Story Gate Coverage Reconciliation

Date: 2026-09-10
Status: `MIXED_CONTRACT_AND_POLICY_FIX_REQUIRED`
Scope: formal failure reconciliation and contract/policy decision review only

This review explains the failure of `M3-LIFECYCLE-STORY-GATE` Hard Gate #3.
It does not implement a fix, rerun the Gate, execute M3-T05, or change M3
status. The authoritative failed run remains `20260910-run-08`.

The accepted future contract is
[`M3-LIFECYCLE-STORY-GATE-COVERAGE-CONTRACT-v2.md`](../M3-LIFECYCLE-STORY-GATE-COVERAGE-CONTRACT-v2.md).
The review's proposal document remains historical; v2 is the governed
clarification and does not retroactively apply to run-08.

## Result in one page

- `M3-LIFECYCLE-STORY-GATE = FAIL`; only Hard Gate #3 failed; 14 other hard
  gates passed.
- EAT: 25/30 completed. Five residents have `foodUnits=0`; no M3 acquisition
  path exists. Decision: `EAT_GATE_CONTRACT_FIX_REQUIRED`; no fixture food
  grant and no BUY implementation.
- WORK: 26 employed residents, 488 workplace-commute MOVE starts, all at or
  after 09:00, travel 10/15 minutes, 0 arrivals before the boundary, 4 WORK
  starts for 3 residents. Decision: primary `SCHEDULER_WAKE_DEFECT`, secondary
  `POLICY_COVERAGE_MISMATCH`; preserve exact 09:00 authorization.
- TALK: 19 initiators but 24 residents in a completed paired contact; six
  residents have no observed contact. Candidate-stage negatives were not
  persisted, so opportunity-versus-policy attribution is
  `INSUFFICIENT_EVIDENCE` and requires verifier/accounting repair.
- MOVE: 26 residents completed MOVE; the four without MOVE are unemployed and
  have no formal workplace/commute obligation. Decision:
  `VALID_NO_ACTION_NEEDED` for those four; do not add scripted movement.

## Source boundary

The immutable run report and full machine bundle are retained, unchanged, in
the sibling Gate worktree:

```text
/Users/alin/AI项目/镜界/docs/verification/M3-LIFECYCLE-STORY-GATE-report.md
/Users/alin/AI项目/镜界/docs/verification/artifacts/M3-LIFECYCLE-STORY-GATE/20260910-run-08/
```

This review branch is based on latest `origin/main`, which predates those
uncommitted Gate outputs. It therefore stores compact reconciliation artifacts
and exact source hashes, not a second copy of the historical causal bundle.

## Documents

| File                                                               | Purpose                                         |
| ------------------------------------------------------------------ | ----------------------------------------------- |
| [01_BASELINE.md](./01_BASELINE.md)                                 | baseline, authority order, and evidence custody |
| [02_FAILED_GATE_EVIDENCE.md](./02_FAILED_GATE_EVIDENCE.md)         | failed run and hard-gate facts                  |
| [03_COVERAGE_FUNNEL_MODEL.md](./03_COVERAGE_FUNNEL_MODEL.md)       | review-only funnel definitions and limits       |
| [04_RESIDENT_COVERAGE_MATRIX.md](./04_RESIDENT_COVERAGE_MATRIX.md) | per-resident coverage and overlap               |
| [05_EAT_ANALYSIS.md](./05_EAT_ANALYSIS.md)                         | EAT feasibility and M6 boundary                 |
| [06_WORK_ANALYSIS.md](./06_WORK_ANALYSIS.md)                       | WORK timing and coverage failure                |
| [07_TALK_ANALYSIS.md](./07_TALK_ANALYSIS.md)                       | paired contact accounting and evidence gap      |
| [08_MOVE_ANALYSIS.md](./08_MOVE_ANALYSIS.md)                       | MOVE necessity review                           |
| [09_EAT_FEASIBILITY_MATRIX.md](./09_EAT_FEASIBILITY_MATRIX.md)     | EAT population matrix                           |
| [10_WORK_TIMELINE_MATRIX.md](./10_WORK_TIMELINE_MATRIX.md)         | employed resident timeline matrix               |
| [11_TALK_OPPORTUNITY_MATRIX.md](./11_TALK_OPPORTUNITY_MATRIX.md)   | TALK observed-contact matrix                    |
| [12_MOVE_NECESSITY_MATRIX.md](./12_MOVE_NECESSITY_MATRIX.md)       | MOVE necessity matrix                           |
| [13_GATE3_CONTRACT_REVIEW.md](./13_GATE3_CONTRACT_REVIEW.md)       | Hard Gate #3 semantic review                    |
| [14_POLICY_REVIEW.md](./14_POLICY_REVIEW.md)                       | policy and decision review                      |
| [15_FIXTURE_REVIEW.md](./15_FIXTURE_REVIEW.md)                     | fixture integrity and feasibility review        |
| [16_SCHEDULER_WAKE_REVIEW.md](./16_SCHEDULER_WAKE_REVIEW.md)       | scheduler/wake integration review               |
| [17_CONFLICT_REGISTER.md](./17_CONFLICT_REGISTER.md)               | C0-C4 conflict register                         |
| [18_ROOT_CAUSE_REGISTER.md](./18_ROOT_CAUSE_REGISTER.md)           | root-cause decisions                            |
| [19_FIX_DECISION_MATRIX.md](./19_FIX_DECISION_MATRIX.md)           | fix-type decisions                              |
| [20_PROPOSED_GATE3_V2.md](./20_PROPOSED_GATE3_V2.md)               | proposal only; not frozen                       |
| [21_NEXT_FORMAL_FIX_SCOPE.md](./21_NEXT_FORMAL_FIX_SCOPE.md)       | next independent fix task                       |
| [22_RERUN_PLAN.md](./22_RERUN_PLAN.md)                             | targeted verification and future rerun order    |
| [23_RESULT.md](./23_RESULT.md)                                     | final status and stop boundary                  |

Machine-readable outputs:

- [coverage-funnel.json](./coverage-funnel.json)
- [resident-coverage-matrix.json](./resident-coverage-matrix.json)
- [root-cause-register.json](./root-cause-register.json)

## Frozen authority used

The review follows latest `origin/main`, Accepted ADR-0011/0012, the frozen
specification in `M3-LIFECYCLE-STORY-SPEC-RECONCILIATION`, the registered Gate
definition, `PROJECT_STATE`, run-08 evidence, and only then production source.
The frozen spec is not changed here. `M3 = IN_PROGRESS`, Story Gate remains
`FAIL`, and `M3-T05 = DEFINED / NOT_STARTED`.
