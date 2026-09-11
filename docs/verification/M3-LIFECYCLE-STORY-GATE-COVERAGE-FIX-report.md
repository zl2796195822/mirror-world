# M3 Lifecycle Story Gate Coverage Fix Verification Report

Date: 2026-09-11

## Status

`TARGETED_PASS / MAIN_CI_PENDING`

The registered `M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX` is implemented and its
targeted clean-PostgreSQL DoD is green. Final main-branch CI is pending PR
integration while this report is prepared.

This is not a Story Gate run. No new Story run ID was created, the immutable
`20260910-run-08` bundle was not modified, and the full 30-resident ×
30-World-Day Story Gate was not executed.

## Baseline and authority

| Field                  | Result                                                       |
| ---------------------- | ------------------------------------------------------------ |
| Starting `origin/main` | `85b8cdd7b5a0421e2ac14d7e18d9d81589f4f727`                   |
| Starting HEAD          | `85b8cdd7b5a0421e2ac14d7e18d9d81589f4f727`                   |
| Branch                 | `task/m3-lifecycle-story-gate-coverage-fix`                  |
| Worktree               | `/Users/alin/AI项目/mirror-world-m3-story-gate-coverage-fix` |
| Implementation commit  | `780e491c6ee2d14bb7d44eaa8114ee2402721de9`                   |
| Formal task            | `M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX`                       |
| Coverage contract      | `m3-story-gate-coverage-v2`                                  |
| Historical parent run  | `20260910-run-08`                                            |
| Historical Gate status | `FAIL` and preserved                                         |

The accepted authority remains the v2 coverage contract, ADR-0011,
ADR-0012, the registered fix task, and the frozen lifecycle/story
specification. No new domain ADR was required.

## WORK preparation fix

### Root cause

Run-08 registered initial decision wakes and exact boundary wakes, but did not
perform the existing scheduler's bootstrap-wide pre-shift reconciliation.
Consequently, a 10/15-minute MOVE could start only at or after 09:00,
producing late-arrival pressure rather than an exact-start WORK opportunity.
This was a `SCHEDULER_WAKE_DEFECT`; the exact WORK contract was not defective.

### Fix

- Added a deterministic `WORK_PREPARATION` dedupe path to the existing
  `m3-scheduler-v2` wake store.
- Added bootstrap-wide registration for every employed resident, using the
  resident's current runtime location and formal workplace route.
- Derived the wake from `shiftStartWorldTime - travelDurationWorldMinutes`.
  Existing route semantics remain 15 minutes for HOME→OFFICE and 10 minutes
  for HOME→CAFE/STORE.
- Reused the existing `WORK_BOUNDARY` wake reason; its dedupe key distinguishes
  preparation from the exact shift boundary. No second scheduler, timer,
  generic queue, or wall-clock cron was introduced.
- Passed the preparation opportunity through Observation → Goal → Candidate →
  Rule Decision → ActionRequest → Kernel. The scheduler never selects WORK or
  mutates location.
- Refreshed preparation registration after a completed employed MOVE so a
  resident returning home can receive the next valid preparation opportunity.

The frozen formal rule is `timeUntilStart <= travelDuration`. Therefore the
targeted route completes at the exact 09:00 boundary and the resident is at the
workplace before the 09:00 WORK decision; strict mathematical “before 09:00”
arrival is 0, while “at or before 09:00” is 1. No unregistered preparation
lead was invented.

Evidence: [`work-preparation-funnel.json`](./artifacts/M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX/work-preparation-funnel.json).

| Stage                                             |  Count/result |
| ------------------------------------------------- | ------------: |
| Employed / scheduled shifts                       |       26 / 26 |
| Pre-shift wakes created                           |            26 |
| Pre-shift wakes due by 08:50                      |            26 |
| Preparation observation / goal                    |         1 / 1 |
| MOVE candidate / selected / requested / committed | 1 / 1 / 1 / 1 |
| Arrived strictly before 09:00                     |             0 |
| Arrived at or before 09:00                        |             1 |
| WORK candidate / started / completed              |     1 / 1 / 1 |
| LATE WORK accepted                                |             0 |

The 10-minute and 15-minute routes both complete at 09:00 exactly. The
explicit 09:01 probe is rejected as `LATE`; exact 09:00 authorization remains
unchanged.

Bootstrap registration proves 26 preparation wakes plus 26 exact-boundary
wakes, deduped on repeated registration. Weekend and unemployed residents do
not receive preparation wakes; an already-at-workplace resident is not forced
to MOVE; busy, pause/maintenance, restart/requery, stale-fence, and
world-isolation cases remain bounded and green.

## TALK negative funnel evidence

Evidence: [`talk-negative-funnel.json`](./artifacts/M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX/talk-negative-funnel.json).

The existing v2 causal instrumentation records structured Need, Goal,
eligibility, feasibility, opportunity, partner availability, candidate,
constraint, score, selected action, request, outcome, and defer fields. It does
not record hidden chain-of-thought and does not write World Truth.

Targeted evidence covers:

- opportunity with candidate generated;
- social need with no legal participant → `NO_LEGAL_OPPORTUNITY`;
- candidate generated but a higher-priority action selected →
  `CANDIDATE_NOT_SELECTED`;
- request issued and Kernel rejected → `REQUEST_REJECTED`;
- completed paired contact with action count 1, one initiator, one participant,
  and a two-resident contact union.

The six no-contact residents from run-08 remain
`PENDING_FULL_RERUN_CLASSIFICATION`. TALK policy, topology, paired-lock
semantics, duration, and scoring were not changed. No new TALK production
defect was declared from targeted evidence.

## Coverage Contract v2 evaluator

The evaluator is version-gated to `m3-story-gate-coverage-v2` and emits the
complete `TOTAL → ELIGIBLE → FEASIBLE → OPPORTUNITY → CANDIDATE_GENERATED →
SELECTED → REQUESTED → COMMITTED → COMPLETED` funnel. It keeps action counts
separate from unique resident sets, computes TALK contact as initiator ∪
participant while retaining both source sets, excludes zero-food EAT episodes
from the feasible denominator with `UNAVAILABLE_RESOURCE`, and records
`NO_FORMAL_NECESSITY` for non-required MOVE. Missing rows are `UNKNOWN` and
fail the evaluator. Six evaluator tests pass; the summary is in
[`coverage-v2-targeted-summary.json`](./artifacts/M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX/coverage-v2-targeted-summary.json).

## Explicitly unchanged

| Area                                            | Result                                                         |
| ----------------------------------------------- | -------------------------------------------------------------- |
| EAT production semantics / resource authority   | unchanged                                                      |
| EAT fixture / food grants / BUY                 | unchanged; BUY remains non-executable                          |
| MOVE lifecycle / fixture / random travel        | unchanged                                                      |
| TALK policy / paired lock / topology            | unchanged                                                      |
| Exact WORK start                                | 09:00 UTC only                                                 |
| LATE WORK                                       | rejected                                                       |
| Kernel authority / ActionRequest / Event Ledger | unchanged                                                      |
| Scheduler ownership                             | unchanged: Scheduler=WHEN, Life Engine=WHAT, Kernel=CAN/COMMIT |
| Schema / migration                              | no change                                                      |
| Historical run-08                               | immutable `FAIL`                                               |
| New Story run                                   | none                                                           |

## Verification evidence

| Check                                        | Result                                                           |
| -------------------------------------------- | ---------------------------------------------------------------- |
| Node 24.11.1 frozen install                  | PASS                                                             |
| Prettier / format                            | PASS                                                             |
| Root lint                                    | PASS                                                             |
| Root typecheck                               | PASS                                                             |
| Root unit tests                              | PASS; 47 contracts, 8 DB, 74 Life Engine, 65 World Kernel, 3 Web |
| API contract + v2 evaluator tests            | PASS; 12/12                                                      |
| Coverage Fix PostgreSQL integration          | PASS; 7/7                                                        |
| Existing API PostgreSQL integration          | PASS; 42/42                                                      |
| Existing M3 lifecycle replay regression      | PASS; 15/15                                                      |
| Existing PRE-AL-GATE regression              | PASS; prior 30×30 profile, no Story Gate rerun                   |
| Clean disposable PostgreSQL setup            | PASS; PostgreSQL 18.6, 12 migrations, fresh seed                 |
| Official production audit                    | PASS; no known vulnerabilities                                   |
| HIGH / CRITICAL                              | 0 / 0                                                            |
| `git diff --check` and forbidden-scope audit | PASS                                                             |
| Feature-branch CI                            | PENDING PR trigger                                               |

The disposable database used was `mirror_m3_covfix_20260911`. It is test-only
and must be dropped after final evidence capture.

## Final state boundary

| Field                    | Result                                               |
| ------------------------ | ---------------------------------------------------- |
| Coverage Fix             | `PASS` after final main CI confirmation              |
| Story Gate               | `FAIL / RERUN_REQUIRED`; historical status preserved |
| M3                       | `IN_PROGRESS`                                        |
| M3-T05                   | `DEFINED / NOT_STARTED`                              |
| Full Story Gate rerun    | not executed                                         |
| Next allowed formal task | new immutable `M3-LIFECYCLE-STORY-GATE` rerun        |
| M4/M5/M6 and BUY         | not executed                                         |

After PR integration, the final main commit and CI run must be appended here;
this fix does not promote the Story Gate or M3.
