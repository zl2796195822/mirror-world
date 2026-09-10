# M3 Lifecycle ADR Formalization Verification Report

## Status

`ADR_FORMALIZATION_COMPLETE` is recorded for the governance payload at
`69fcf40b83fea3b30428ea87997c8458935a0bdc`, which is on `origin/main` and has
a successful `foundation-ci` run. This report is
the governance evidence record; it does not implement M3 lifecycle behavior,
run M3-T05, or claim M3 PASS.

## Scope and baseline

| Field                        | Result                                              |
| ---------------------------- | --------------------------------------------------- |
| Starting `origin/main`       | `a5846b723a11e4902166f6441cc8355904b268f4`          |
| Frozen spec branch           | `spec/m3-lifecycle-story-sanity-v1`                 |
| Spec freeze commit           | `292850f80792f42a2dd6d42c5d2c78bb1e6683b0`          |
| Spec final tip               | `0b667c3e6cd6da29b50b625e8e956bfbc88d88dd`          |
| Spec promoted in this branch | yes, exact audited docs/MEMORY diff                 |
| Freeze preserved             | yes; no frozen behavior was edited                  |
| Governance branch            | `governance/m3-lifecycle-adrs`                      |
| Worktree                     | `/Users/alin/AI项目/mirror-world-m3-lifecycle-adrs` |
| Production code changed      | no                                                  |
| Schema changed               | no                                                  |
| Migration changed            | no                                                  |
| Runtime tests changed        | no                                                  |

The spec diff from `origin/main` contained only `MEMORY.md` and the frozen
specification package. No production code, schema, migration, dependency,
research implementation, or unapproved fixture change was present. The seven
new MEMORY lines were factual reconciliation state; none called an ADR or
lifecycle implemented.

## Existing ADR audit

| Decision                 | Existing coverage                                                                                              | Result             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------ |
| EAT food authority/CAS   | Action shape and validation only; current resource bridge is read-only; MOVE/SLEEP ADR explicitly excludes EAT | `NEW_ADR_REQUIRED` |
| TALK paired runtime lock | Single participant parameter exists; no two-row runtime lock or paired activity authority                      | `NEW_ADR_REQUIRED` |
| WORK authority/payroll   | Existing employment + UTC obligation read model; attendance can be event/replay evidence; payroll is M6        | `ADR_NOT_REQUIRED` |
| ActionRequest core       | Existing single-actor union already covers EAT/WORK/TALK                                                       | unchanged          |
| Event Ledger core        | Existing world-local append-only transaction and 0/1/N outcome association are sufficient                      | unchanged          |
| Scheduler                | Existing due/wake driver extends by versioned policy                                                           | unchanged owner    |

Historical duplicate `ADR-0010` filenames were retained. New ADR filenames are
the next unused numeric IDs and have unique decision IDs.

## Accepted decisions

| Item                        | Result                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| EAT ADR path/ID             | `docs/adr/ADR-0011-m3-eat-kernel-consumable-capability.md` / `ADR-M3-EAT-KERNEL-CONSUMABLE-CAPABILITY`    |
| EAT status                  | `Accepted`                                                                                                |
| EAT resource truth          | One Kernel/PostgreSQL canonical world/resident/item food state; no second inventory                       |
| EAT CAS                     | Kernel start transaction, world → runtime → resource locks, re-read and CAS before event/outcome commit   |
| EAT idempotency             | Existing request fingerprint/Outcome reuse; duplicate completion reuse; idempotency conflict fail-closed  |
| EAT replay                  | Typed v2 STARTED delta + COMPLETED need effect; full/suffix/genesis includes food/version/last-ate fields |
| EAT/M6                      | M3 consumption seam only; M6 owns inventory/economy/BUY settlement and must keep one resource truth       |
| EAT migration               | `IMPLEMENTATION_MIGRATION_REQUIRED`; none created here                                                    |
| TALK ADR path/ID            | `docs/adr/ADR-0012-m3-talk-paired-runtime-lock.md` / `ADR-M3-TALK-PAIRED-RUNTIME-LOCK`                    |
| TALK status                 | `Accepted`                                                                                                |
| TALK actor model            | Single initiator ActionRequest + participant target reference                                             |
| TALK lock                   | Atomic two-row Kernel transaction                                                                         |
| TALK lock order             | world row → min/max resident UUID bytes, independent of request direction                                 |
| TALK activity               | One shared `activityInstanceId = actionRequest.id`, two runtime rows, one canonical due item              |
| TALK completion             | Initiator-owned Kernel completion locks both rows and releases both atomically                            |
| TALK events                 | One `RESIDENT_TALK_STARTED` and one `RESIDENT_TALK_COMPLETED` per contact                                 |
| TALK replay                 | One-event-per-phase reducer updates both resident projections; v1 history unchanged                       |
| TALK/M4                     | Structured contact input only; no relationship/memory mutation                                            |
| TALK/M5                     | No dialogue, transcript, prompt, model, or LLM                                                            |
| TALK deadlock               | Deterministic UUID-byte lock order; reciprocal race yields one winner and one bounded conflict            |
| TALK migration              | `IMPLEMENTATION_MIGRATION_REQUIRED`; runtime target field/check only, none created here                   |
| WORK ADR                    | `ADR_NOT_REQUIRED`; existing obligation authority and no-payroll boundary reused                          |
| ActionRequest core changed  | no                                                                                                        |
| Kernel authority changed    | no; Kernel remains sole fact writer                                                                       |
| Scheduler ownership changed | no; scheduler remains WHEN                                                                                |

## Formal task registration

| Item                  | Result                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementation task   | `M3 Behavioral Lifecycle Extension`                                                                                                                       |
| Formal task ID        | `FORMAL_TASK_REGISTERED_WITHOUT_NUMERIC_ID`                                                                                                               |
| Task status           | `REGISTERED / NOT_STARTED`                                                                                                                                |
| Scope                 | EAT/WORK/TALK lifecycle, T04 v2 candidates/action loop, existing scheduler extension, typed events/reducers, replay/checkpoint, causal evidence and tests |
| Explicit non-goals    | BUY settlement, payroll, Memory, Relationship, Dialogue, LLM, 3D, later milestones, new scheduler, multi-actor request                                    |
| Gate registered       | yes                                                                                                                                                       |
| Gate ID/name          | `M3-LIFECYCLE-STORY-GATE`                                                                                                                                 |
| Gate status           | `DEFINED / NOT_STARTED`                                                                                                                                   |
| Gate requirement      | 30 residents × 43,200 World Minutes, 15 hard gates, live/full/suffix/genesis equality, same-seed determinism, fault isolation, zero LLM                   |
| M3-T05 reconciled     | yes                                                                                                                                                       |
| M3-T05 status         | `DEFINED / NOT_STARTED`                                                                                                                                   |
| Story hard-gate count | 15                                                                                                                                                        |
| BUY in M3             | declared but non-executable                                                                                                                               |
| BUY/M6 boundary       | full settlement belongs to M6 Economy                                                                                                                     |

No permanent numeric task ID was invented. The registry and definitions are
under `docs/tasks/`; the ADR index is `docs/adr/README.md`.

## Verification

| Check                        | Result                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen spec refs/JSON        | PASS (JSON parses; freeze/status/30×30/15 gates checked)                                                                                      |
| ADR status/required sections | PASS (Decision, alternatives, boundary, durability, transaction, idempotency, replay, failure, compatibility, consequences, migration, tests) |
| Task registry JSON           | PASS (three entries, unique registry keys, valid order/statuses, no numeric invention)                                                        |
| Markdown link validation     | PASS (all new relative links resolve)                                                                                                         |
| Prettier                     | PASS (`prettier --check`, full repository)                                                                                                    |
| `git diff --check`           | PASS                                                                                                                                          |
| CI                           | `foundation-ci` run `34433236275`, commit `69fcf40b83fea3b30428ea87997c8458935a0bdc`, `Success`                                               |

## Stop boundary

This governance task changes only docs, ADRs, indexes, registry, and project
state/memory records. It does not implement EAT, WORK, TALK, the 30×30 run,
M3-T05, M4/M5/M6, or any migration. After final main CI success, the only
allowed next formal task is `M3 Behavioral Lifecycle Extension`, and work must
stop before implementation begins.
