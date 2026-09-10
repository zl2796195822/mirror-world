# 01 Baseline and Authority

## Frozen baseline

| Field                                   | Value                                                     |
| --------------------------------------- | --------------------------------------------------------- |
| `CURRENT_ORIGIN_MAIN`                   | `a5846b723a11e4902166f6441cc8355904b268f4`                |
| `CURRENT_HEAD`                          | `a5846b723a11e4902166f6441cc8355904b268f4`                |
| `HEAD == origin/main`                   | yes                                                       |
| Main worktree                           | `/Users/alin/AI项目/镜界`                                 |
| Spec branch                             | `spec/m3-lifecycle-story-sanity-v1`                       |
| Spec worktree                           | `/Users/alin/AI项目/mirror-world-m3-lifecycle-story-spec` |
| Starting worktree                       | clean                                                     |
| Production code changed by this task    | no                                                        |
| Schema/migration changed by this task   | no                                                        |
| `PROJECT_STATE.md` changed by this task | no                                                        |
| `MEMORY.md` changed by this task        | no                                                        |

`git fetch origin` was completed before authoring. This branch started at the
latest `origin/main`, not at an older local checkout.

## Authority order

The following order is used whenever sources disagree:

1. Project invariants and accepted ADRs.
2. Latest `origin/main` and `docs/PROJECT_STATE.md` for current state.
3. Formal milestone task/DoD and implementation matrix.
4. Formal domain specifications and the master document.
5. Verification reports and current code/schema/tests as implementation facts.
6. Closure review/reconciliation reports.
7. `RES-*` research, which is input only and never implementation authority.

The accepted ADR-0007 source-order wording is preserved. This document adds
the explicit latest-main rule required by the task.

## Conflict register

| ID                  | Conflict                                                                                                                                                            | Resolution                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SPEC_CONFLICT-001` | `docs/PROJECT_STATE.md` says the current authority has not named a new M3-T05, while the ignored formal task book and implementation matrix contain the M3-T05 row. | `SUPERSEDED_SOURCE`: the state sentence is a current synchronization note, not permission to erase the formal task. `M3-T05` exists and is not completed. This package clarifies it without rewriting history. |
| `SPEC_CONFLICT-002` | The unmerged closure reconciliation branch is not in `origin/main`.                                                                                                 | `SUPERSEDED_SOURCE`: its evidence is used as review input only. The current baseline remains latest main; the reconciliation conclusion is independently restated here.                                        |
| `SPEC_CONFLICT-003` | Historical M3 wording and Life Engine §10 name statistics/anomalies, but do not freeze every numeric oracle.                                                        | `CLARIFICATION_REQUIRED` resolved by the machine gates in 16–19. Thresholds are policy/version inputs, not hidden implementation choices.                                                                      |
| `SPEC_CONFLICT-004` | Existing Action Contract declares six actions, while resident execution supports only MOVE/SLEEP.                                                                   | Declaration is not execution evidence. This package freezes EAT/WORK/TALK as the next M3 implementation scope and BUY as non-executable.                                                                       |
| `SPEC_CONFLICT-005` | Existing resource bridge is read-only, but accepted EAT must create a causal hunger response.                                                                       | `CLARIFICATION_REQUIRED` resolved by a Kernel-owned versioned consumable capability, with no Life-owned mutation or second inventory. ADR acceptance is an implementation prerequisite.                        |

## Current formal status

- M0, M1, and M2: `PASS`.
- M3: `IN_PROGRESS`.
- M3-T01/T02/T03/T04: `PASS`.
- PRE-AL-00 through PRE-AL-07: `PASS`.
- Historical PRE-AL-GATE: `PASS` only for `MOVE/SLEEP` and
  `M3_FIXTURE_READONLY`.
- Remaining M3 P1: (1) EAT/WORK/TALK lifecycle and coverage; (2) M3-T05
  execution and machine-oracle closure.
- This package does not promote any of those statuses.

## Evidence boundary

The old gate proved 30 residents × 43,200 World Minutes, final `worldSeq=1617`,
127 committed attempts, and replay/determinism for its declared profile. Its
event stream contains no accepted MOVE, EAT, WORK, or TALK coverage in the
baseline run. That evidence is retained as regression evidence, not reused as
proof of the expanded life target.
