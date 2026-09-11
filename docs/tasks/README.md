# M3 Formal Task Registry

The machine-readable registry is [`task-registry.json`](./task-registry.json).
This directory registers formal scope and order; it does not execute a task.

| Registry entry                                                          | Status                  | Definition                                                                                  |
| ----------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| `M3-BEHAVIORAL-LIFECYCLE-EXTENSION` — M3 Behavioral Lifecycle Extension | `PASS`                  | [formal task](./M3-behavioral-lifecycle-extension.md)                                       |
| `M3-LIFECYCLE-STORY-GATE`                                               | `FAIL`                  | [formal gate](./M3-lifecycle-story-gate.md)                                                 |
| `M3-LIFECYCLE-STORY-GATE-COVERAGE-RECONCILIATION`                       | `PASS`                  | [reconciliation](../verification/M3-LIFECYCLE-STORY-GATE-COVERAGE-RECONCILIATION/README.md) |
| `M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX`                                  | `PASS`                  | [formal remediation](./M3-lifecycle-story-gate-coverage-fix.md)                             |
| `M3-T05` — Story Sanity Report                                          | `DEFINED / NOT_STARTED` | [clarified task](./M3-T05-story-sanity.md)                                                  |

## Registration decisions

- The next implementation is formally registered without inventing a
  permanent numeric task number:
  `FORMAL_TASK_REGISTERED_WITHOUT_NUMERIC_ID`.
- The two prerequisites are accepted ADRs
  `ADR-M3-EAT-KERNEL-CONSUMABLE-CAPABILITY` and
  `ADR-M3-TALK-PAIRED-RUNTIME-LOCK`.
- M3-T05's earlier `EXISTS_BUT_NOT_COMPLETED` / conflicted-definition state is
  reconciled to `DEFINED / NOT_STARTED` with the frozen machine-gated
  definition.
- The lifecycle gate is a separate verification boundary after the
  implementation task. It is not executed by registration.
- The failed Gate's coverage reconciliation is accepted as governance input;
  it changes only Hard Gate #3's measurement contract for future runs.
- The coverage fix is complete. Its Work preparation change and funnel
  evidence extension are targeted evidence only; no TALK policy fix is
  registered. The next task is a new immutable Story Gate rerun.

## Formal order

```text
M3 Behavioral Lifecycle Extension
  -> M3-LIFECYCLE-STORY-GATE
  -> M3-LIFECYCLE-STORY-GATE-COVERAGE-RECONCILIATION
  -> M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX
  -> M3-LIFECYCLE-STORY-GATE (new immutable rerun)
  -> M3-T05 Story Sanity Report
  -> M3 Final Status Review #2
```

No registry entry authorizes M3 PASS, BUY settlement, payroll, Memory,
Relationship, Dialogue, LLM, or any later milestone.
