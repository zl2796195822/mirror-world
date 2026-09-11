# M3 Lifecycle Story Gate Coverage Definition Report

Date: 2026-09-11
Status: `GOVERNANCE_COMPLETE / FIX_REGISTERED / NO_IMPLEMENTATION`

## Outcome

The M3 Lifecycle Story Gate Coverage Reconciliation is promoted as formal
governance input, and Hard Gate #3 v2 is accepted for future runs. The
historical `20260910-run-08` remains immutable `FAIL`; no existing manifest,
statistics, diagnostics, causal evidence, or hash was changed.

The accepted contract separates action counts from unique resident coverage,
adds the required `OPPORTUNITY` funnel stage, counts TALK contact as
initiator-or-participant while retaining both source metrics, and requires
explicit negative funnel evidence. The remaining WORK gap is registered as a
bounded remediation task; no TALK policy fix is registered because opportunity
evidence is still insufficient.

## Decisions

| Area      | Decision                                                                                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EAT       | Conditional feasible-resource coverage; zero-food residents are not required to consume nonexistent food. No fixture grant or BUY.                                     |
| WORK      | Scheduler/preparation defect is registered; exact `09:00 UTC` authorization and `LATE` rejection remain frozen.                                                        |
| TALK      | Participant counts toward resident contact coverage; negative opportunity/candidate evidence is required before any policy decision.                                   |
| MOVE      | Coverage is based on formal necessity/goal; no random movement for unemployed residents without such a need.                                                           |
| SLEEP     | Current fixed manifest retains all 30 as denominator because the versioned need/routine contract guarantees a horizon response; future manifests must derive this set. |
| Gate #3   | Only this predicate/measurement layer changes; the other 14 Hard Gates, #5, #7, ADR-0011, and ADR-0012 remain unchanged.                                               |
| Next task | `M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX`, `DEFINED / NOT_STARTED`; execution is not authorized here.                                                                     |

## Verification performed

- `git fetch origin`; current `origin/main` and HEAD were
  `590d19d000fc04723028556e267cdbed362b4da8` at review start.
- Review commit `ded7c6d59baa78305457e577e0f8bae77a111fee` was audited as
  docs/read-only analysis plus 23 Markdown and 3 JSON artifacts. No
  production code, schema, migration, fixture, or Gate overwrite was found.
- The current run-08 bundle parses as 12 JSON artifacts, with 15 hard gates,
  14 PASS and only #3 FAIL; action totals are MOVE 950, SLEEP 702, EAT 60,
  WORK 4, TALK 203, and causal evidence has 1,919 rows.
- SHA-256 checks for the retained run-08 bundle match its recorded evidence;
  the reviewed baseline document's stale run-summary hash was not promoted.
- The reconciliation review model was corrected to include the required
  `OPPORTUNITY` stage.
- Governance commit `0fda99c486694a65c1e05b96ca2aa30a4f827ecc` was pushed to
  `gate/m3-lifecycle-story` and fast-forwarded to `origin/main`; GitHub Actions
  `foundation-ci` run `34548099657` completed with `success`.

No full Gate rerun, T05 execution, production implementation, schema change,
migration, fixture change, or M4+ work was performed.

## Authority and next boundary

The accepted contract is [M3-LIFECYCLE-STORY-GATE-COVERAGE-CONTRACT-v2.md](./M3-LIFECYCLE-STORY-GATE-COVERAGE-CONTRACT-v2.md).
The registered remediation is [M3-lifecycle-story-gate-coverage-fix.md](../tasks/M3-lifecycle-story-gate-coverage-fix.md).
M3 remains `IN_PROGRESS`; the Story Gate remains `FAIL`; `M3-T05` remains
`DEFINED / NOT_STARTED`.
