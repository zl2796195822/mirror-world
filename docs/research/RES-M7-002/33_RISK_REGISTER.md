# 33 Risk Register

| ID   | Risk                                                              | Severity      | Likelihood | Mitigation                                                   |
| ---- | ----------------------------------------------------------------- | ------------- | ---------- | ------------------------------------------------------------ |
| R-01 | Starting formal M7 before PRE-AL-07 leaves street not truly alive | High          | High       | Keep M7 observation-first; gate autonomous life on scheduler |
| R-02 | Treating Colyseus room state as truth                             | Critical      | Medium     | Hard boundary + rebuild gates                                |
| R-03 | Browser coordinates leaking into Kernel location                  | Critical      | Medium     | Contract tests; code ownership boundaries                    |
| R-04 | Optimistic UI divergence after rejection                          | High          | Medium     | pending intent reconciliation tests                          |
| R-05 | Asset/VRM budget collapse at 30 avatars                           | High          | High       | mandatory asset gate + visual LOD + scene budget             |
| R-06 | Physical mobile unverified remains ignored                        | High          | High       | G-14 mandatory before release claims                         |
| R-07 | M8 lag shown as seamless live world                               | High          | Medium     | lagState honesty UI                                          |
| R-08 | Identity/proxy confusion in avatar UI                             | High          | Medium     | PENDING_RES_M9_001; labels only from facts                   |
| R-09 | Event spam from clock ticks floods clients                        | Medium        | Medium     | coalesce header updates                                      |
| R-10 | AOI thrash causes avatar pop                                      | Medium        | Medium     | hysteresis + traveler policy                                 |
| R-11 | Using stale experiment numbers as gates                           | Medium        | High       | performance evidence contract                                |
| R-12 | Location mesh rewrite breaks history                              | High          | Medium     | place identity vs geometry version separation                |
| R-13 | Yuka/nav dependency maintenance risk                              | Medium        | Medium     | avoid Yuka as formal nav; choose maintained path             |
| R-14 | Full VRM semantic transform drops extensions                      | Medium        | Medium     | semantic gate (EXP-M7-003 candidate)                         |
| R-15 | Realtime multi-node presence not studied                          | Medium        | Low for 30 | defer to EXP-REALTIME-002 / M8                               |
| R-16 | No Action HTTP API yet for user embodied actions                  | Medium        | High       | keep v1 observe-first or add narrow gateway later            |
| R-17 | Needs/goals not durable → fake “why” UI                           | Medium        | Medium     | history UX only from committed evidence                      |
| R-18 | Thin collider tunneling / physics bugs                            | Low for truth | Medium     | thick colliders; presentation-only physics                   |

## Top 3 for formal planning

1. R-01 dependency on living-world driver
2. R-02/R-03 truth boundary enforcement
3. R-05/R-06 asset + device evidence
