# 09 EAT Feasibility Matrix

The source fixture has one resident-owned food resource at an EAT-capable
home. `foodUnits=0` means the EAT precondition is false; no alternate food
source is present in M3.

| Population            | Count | Resource-capable | Feasible when an EAT Need episode occurs | Candidate/selected evidence                      | Completion | Decision                  |
| --------------------- | ----: | ---------------: | ---------------------------------------: | ------------------------------------------------ | ---------: | ------------------------- |
| positive initial food |    25 |               25 |                                       25 | 25 residents observed on accepted EAT path       |         25 | valid lower bound         |
| zero initial food     |     5 |                0 |                                        0 | no negative candidate row persisted              |          0 | contract/fixture conflict |
| total                 |    30 |               25 |                                       25 | Need eligibility and negative funnel unavailable |         25 | Gate #3 fails as written  |

The 25 residents consumed 60 total units, matching the positive initial food
quantity. The matrix does not authorize changing the fixture or adding BUY.
It defines the evidence needed by a future Gate v2: Need-eligible and
resource-feasible EAT requires completion; eligible but infeasible EAT
requires a bounded unavailable/defer record.
