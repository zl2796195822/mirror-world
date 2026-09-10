# 23 ADR Requirement Matrix

| Topic                    | Architecture impact                                                            | Decision                                                              | ADR status                                                                      |
| ------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| EAT need effect          | Uses the existing derived Need model and accepted-event input                  | Freeze `m3-need-effects-v1`; no new truth                             | `ADR_NOT_REQUIRED`                                                              |
| EAT resource consumption | Current bridge is read-only; accepted EAT needs a Kernel-owned CAS capability  | Extend the existing owner/seam, no Life write and no second inventory | `ADR_REQUIRED_BEFORE_IMPLEMENTATION`: `ADR-M3-EAT-KERNEL-CONSUMABLE-CAPABILITY` |
| WORK obligation          | Reuses existing employment + UTC schedule read model                           | Add attendance completion keyed by existing obligation boundary       | `ADR_NOT_REQUIRED`                                                              |
| WORK event               | Extends the existing typed lifecycle registry                                  | Add versioned resident events; no payroll                             | `ADR_NOT_REQUIRED`                                                              |
| TALK ActionRequest       | Existing single actor + `participantId` already represents the minimum request | Keep single initiator and participant reference                       | `ADR_NOT_REQUIRED`                                                              |
| TALK paired runtime lock | Changes runtime activity domain and requires two-row atomic occupancy          | Lock both residents in UUID-byte order; one shared activity           | `ADR_REQUIRED_BEFORE_IMPLEMENTATION`: `ADR-M3-TALK-PAIRED-RUNTIME-LOCK`         |
| ActionRequest core       | Existing strict union already declares EAT/WORK/TALK                           | No multi-actor request type                                           | `ADR_NOT_REQUIRED`                                                              |
| Scheduler ownership      | Extends existing due rows and work-item ordering                               | No second scheduler or queue                                          | `ADR_NOT_REQUIRED`                                                              |
| Event registry/replay    | Existing registry/reducer pattern is the owner                                 | Version v2 and checkpoint schema v2                                   | `ADR_NOT_REQUIRED`                                                              |
| Checkpoint               | Existing checkpoint remains deletable acceleration state                       | Include new projection fields; no new truth                           | `ADR_NOT_REQUIRED`                                                              |

## ADR gate interpretation

Exactly two ADRs are required before production implementation because the
current code has a read-only resource seam and no paired activity state. This
package freezes the recommended decisions and the implementation task must
not choose alternatives silently. The ADR files are not created or marked
Accepted by this documentation-only task.
