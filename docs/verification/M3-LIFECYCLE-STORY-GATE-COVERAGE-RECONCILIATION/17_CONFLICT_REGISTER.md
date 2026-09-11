# 17 Conflict Register

| ID             | Level                          | Conflict                                                                                      | Evidence                                                                    | Decision                                                              |
| -------------- | ------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `COV-TALK-001` | C1 `METRIC_AMBIGUITY`          | `19/30` initiator coverage is not resident contact coverage                                   | 24 residents are in the initiator/participant union; 5 are participant-only | account paired contact, do not silently relabel the source diagnostic |
| `COV-WORK-001` | C2 `POLICY_COVERAGE_MISMATCH`  | exact 09:00 WORK and 10/15-minute commute require preparation before the boundary             | 488 workplace MOVEs start at/after 09:00; 0 arrive before start             | scheduler/preparation fix; retain exact contract                      |
| `COV-MOVE-001` | C2 `POLICY_COVERAGE_MISMATCH`  | universal MOVE requirement counts residents with no formal movement need                      | four no-MOVE residents are unemployed and obligation-free                   | conditional necessity coverage; no random movement                    |
| `COV-EAT-001`  | C3 `CONTRACT_FIXTURE_CONFLICT` | universal EAT requirement includes five zero-food residents                                   | no M3 acquisition path; resource conservation passes                        | Gate contract clarification; no fixture grant or BUY                  |
| `COV-GATE-001` | C3 `CONTRACT_FIXTURE_CONFLICT` | Hard Gate #3 mixes uniformity with eligibility/necessity and conflicts with Gate #5 semantics | EAT/MOVE unconditionality, WORK timing, TALK missing negatives              | formal Hard Gate #3 clarification required                            |

## Level count

| Level                               | Count |
| ----------------------------------- | ----: |
| C0 informational                    |     0 |
| C1 metric ambiguity                 |     1 |
| C2 policy coverage mismatch         |     2 |
| C3 contract/fixture conflict        |     2 |
| C4 world-truth/milestone-scope risk |     0 |

No C5 issue is found. The formal milestone remains blocked by the failed Gate, which is the expected status being reconciled rather than an additional world-truth conflict.
