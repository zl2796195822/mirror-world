# M3 Lifecycle Story Gate Coverage Fix

## Registration

| Field              | Value                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Registry key       | `M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX`                                                               |
| Kind               | Formal remediation task                                                                              |
| Status             | `DEFINED / NOT_STARTED`                                                                              |
| Milestone          | M3                                                                                                   |
| Predecessor        | `M3-LIFECYCLE-STORY-GATE-COVERAGE-RECONCILIATION`                                                    |
| Accepted contract  | [Hard Gate #3 Coverage Contract v2](../verification/M3-LIFECYCLE-STORY-GATE-COVERAGE-CONTRACT-v2.md) |
| Historical failure | `20260910-run-08` remains immutable `FAIL`                                                           |

This task is registered only. It is not executed by the governance task, does
not rerun the Story Gate, and does not execute M3-T05.

## Objective

Close the proven WORK preparation gap and produce complete stage-level
coverage evidence so a future immutable Story Gate run can apply the accepted
Hard Gate #3 v2 contract without changing the world model to satisfy a
statistic.

The task keeps one formal registry entry to minimize sequencing ambiguity. It
contains the required Work Preparation Wake Fix and the verification-only
TALK/EAT/MOVE funnel evidence extension. No separate TALK policy task is
registered because no TALK policy defect is proven yet.

## Required scope

### B — Work Preparation Wake Fix

- Reuse the existing `m3-scheduler-v2` and deterministic World-Time driver;
  do not create a second scheduler or wall-clock cron.
- Register/reconcile a bootstrap-wide pre-shift preparation wake for every
  employed resident and preserve restart/requery/ack and dedupe semantics.
- Derive the preparation boundary from exact shift start, current location,
  formal route/travel duration, and any versioned preparation lead. Do not
  hard-code `08:30`, teleport residents, or add a Gate-only MOVE.
- Preserve the exact `09:00 UTC` WORK authorization. `LATE` remains illegal;
  the scheduler only supplies WHEN, while Life Engine supplies WHAT and the
  Kernel validates and commits CAN.
- Keep the complete chain
  `Observation → Goal → Candidate → Rule Decision → ActionRequest → Kernel`.

### C — Coverage evidence extension, included rather than separately registered

- Emit the complete funnel
  `TOTAL → ELIGIBLE → FEASIBLE → OPPORTUNITY → CANDIDATE_GENERATED →
SELECTED → REQUESTED → COMMITTED → COMPLETED`.
- Preserve action counts separately from unique initiator, participant,
  eligible, feasible, and completed resident counts.
- Record bounded negative rows for EAT unavailable resources, TALK
  no-opportunity/candidate/rejection/defer cases, MOVE no-formal-necessity
  cases, and WORK missed-shift/preparation outcomes.
- Keep instrumentation read-only with respect to World Truth and prove that
  it does not alter scoring, candidate generation, scheduling, or Kernel
  behavior. Do not record hidden reasoning.
- For TALK, count resident contact as completed initiator ∪ participant but
  retain both source counts. Do not change TALK policy or topology unless the
  new evidence proves a real opportunity starvation path.

## Targeted Definition of Done

- Clean disposable PostgreSQL verifies bootstrap-wide pre-shift wakes and a
  deterministic 10/15-minute commute arriving before the exact boundary.
- At least one employed resident completes an exact-start WORK shift through a
  real preparation wake; late WORK remains rejected.
- Restart/requery/ack, pause/maintenance, stale fence, state-version,
  replay, same-seed determinism, and world isolation remain green.
- EAT positive-resource and zero-resource cases emit truthful bounded funnel
  rows without fixture grants, BUY, or a second resource authority.
- TALK evidence classifies all resident decision windows; six historical
  no-contact residents are not assumed to be policy defects without an
  observed legal opportunity.
- MOVE evidence classifies formal necessity and does not add random travel.
- Targeted local tests, clean PostgreSQL evidence, scope audit, and CI are
  recorded distinctly. No full 30×30 rerun is performed inside this task.

## Explicit non-scope

No fixture mutation, food grant, BUY/economy, payroll, late WORK grace,
random MOVE, forced TALK, TALK policy tuning without evidence, new scheduler,
new domain ADR unless ownership changes, M4/M5/M6 work, M3-T05 execution, or
full Story Gate rerun.

## Handoff

After this task passes its targeted DoD, a separately authorized new immutable
`M3-LIFECYCLE-STORY-GATE` run is required with a new run ID, manifest, and
evidence lineage. T05 remains `DEFINED / NOT_STARTED` until that Gate and its
predecessor conditions are complete.
