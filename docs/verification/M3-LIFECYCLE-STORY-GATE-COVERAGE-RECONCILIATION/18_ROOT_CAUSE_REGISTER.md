# 18 Root Cause Register

The machine register is [root-cause-register.json](./root-cause-register.json). Counts overlap by resident when one row has more than one action issue; they are not summed into a population total.

| Register entry |               Case set | Primary                     | Secondary                   | Confidence                                         | Fix decision                                 |
| -------------- | ---------------------: | --------------------------- | --------------------------- | -------------------------------------------------- | -------------------------------------------- |
| `RC-EAT-001`   |            5 residents | `CONTRACT_FIXTURE_CONFLICT` | none                        | confirmed                                          | Gate contract fix                            |
| `RC-WORK-001`  |  23 employed residents | `SCHEDULER_WAKE_DEFECT`     | `POLICY_COVERAGE_MISMATCH`  | system-level supported, not exclusive per resident | scheduler/wake fix; policy companion         |
| `RC-TALK-001`  | 6 no-contact residents | `INSUFFICIENT_EVIDENCE`     | none                        | unresolved by artifact                             | negative-funnel instrumentation first        |
| `RC-MOVE-001`  |    4 no-MOVE residents | `VALID_NO_ACTION_NEEDED`    | none                        | confirmed                                          | no runtime fix; Gate necessity clarification |
| `RC-GATE-001`  |          1 failed Gate | `POLICY_COVERAGE_MISMATCH`  | `CONTRACT_FIXTURE_CONFLICT` | confirmed                                          | formal Hard Gate #3 reconciliation           |

Not supported as root causes: fixture semantics defect, resource feasibility defect, Kernel implementation defect, TALK decision-priority defect, and TALK topology defect. The last two remain open only because the required negative opportunity evidence is absent.
