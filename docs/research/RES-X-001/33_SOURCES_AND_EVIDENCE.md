# 33 Sources and Evidence

## Current formal authority

| Source                                                       | Ref                                        | Used for                                                                    |
| ------------------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------- |
| `origin/main`                                                | `2e526d3b22209ba949584abf4e1f9505a7469e37` | current main/doc state; PRE-AL-07 implementation parent `a3581a5`           |
| `docs/PROJECT_STATE.md`                                      | current origin/main                        | M3/PRE-AL state, remaining blockers                                         |
| `docs/adr/ADR-0002`, `0005`–`0010`                           | current origin/main                        | clock, event, outcome, runtime, replan and scheduler authority              |
| `docs/verification/PRE-AL-01`–`PRE-AL-07-report.md`          | current origin/main                        | committed verification boundaries and explicit deferred items               |
| `packages/contracts`, `packages/db`, `packages/world-kernel` | current origin/main                        | Action/Outcome, runtime/wake schema and deterministic driver implementation |

## Frozen research inputs

| Research    | Commit                                     | Used for                                                      |
| ----------- | ------------------------------------------ | ------------------------------------------------------------- |
| RES-M7-002  | `2cb7c8422df2939710ffe22d074e61a7a0f168f9` | projection/realtime/AOI/Visual LOD/avatar/snapshot/afterSeq   |
| RES-M8-001  | `f54bd878dc299f9711b1df517ce7a8fbbbe44910` | persistence/offline/W LOD/event-jump/wake/freshness/catch-up  |
| RES-M9-001  | `bd7ba955b4f5a71e56537698abb88109a228bb79` | identity/origin/control/cognition/embodiment/Proxy/continuity |
| RES-M10-001 | `dfed3b4eb78cfa472b105be3e6b860202540a78f` | I LOD/budget/wake/fairness/degradation/envelope/attention     |

## Related research inputs

| Research   | Commit/ref                                 | Used for                                                            |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------- |
| RES-M3-001 | `7cc36a3…`                                 | Life→ActionRequest→Kernel boundary                                  |
| RES-M3-003 | `46511b78f75b1250c780059402879e67598c2f93` | deterministic ordering/replay/full-simulation gate; older input     |
| RES-M4-001 | `d84b42c…`                                 | event→observation→memory and relationship projection                |
| RES-M5-001 | `2f49840…`                                 | old Agent boundary, Provider, queue and I-LOD semantics             |
| RES-M6-002 | `a1de19d…`                                 | economy/resource bridge, payroll/rent due-work and journal boundary |

## Evidence classes and limitations

Current code/ADR/verification proves only the scope stated by current main. Frozen research is not implementation. Experiments, fixtures, synthetic scale numbers, unauthenticated probes, providerless runs, static UI and device/GPU claims are not upgraded to formal production acceptance here. Main worktree uncommitted content and PRE-AL-07 work-in-progress content were not used as authority.
