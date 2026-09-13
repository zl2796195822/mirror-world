# M3 Lifecycle Story Gate v2 Rerun Verification Report

Date: 2026-09-12

## Status

`INFRA_FAILURE / ABORTED_BEFORE_GATE_FINALIZE`

No formal Story Gate judgment was produced. Two new immutable run attempts
were made in this worktree. Both aborted before the summary finalizer:

| Run ID           | Lifecycle                         | Root cause                                                                 |
| ---------------- | --------------------------------- | -------------------------------------------------------------------------- |
| `20260912-run-15` | `ABORTED_BEFORE_GATE_FINALIZE`    | Main runner lineage mismatch vs Coverage Contract v2; baseline SIGTERM     |
| `20260912-run-16` | `ABORTED_BEFORE_GATE_FINALIZE`    | `coverage-funnel-v2.json` 17.99 GB failed post-write JSON.parse validation |

Neither run reached the summary finalizer. Neither produced 15 Hard Gate
results. `20260910-run-08` remains immutable `FAIL`. `20260911-run-14`
remains immutable `INFRA_FAILURE`.

This task did not modify World Kernel semantics, Life Engine policy, fixtures,
seeds, ADRs, Coverage Contract v2, or production world truth. Uncommitted
worktree-only runner lineage fields were used for run-16 and are **not** on
`origin/main` and **not** a merged remediation.

## Baseline and scope

| Field                  | Result                                                             |
| ---------------------- | ------------------------------------------------------------------ |
| Starting `origin/main` | `b7745336e00a6636fb8a53a23b1dfe75e214a0ea`                         |
| Starting `HEAD`        | `b7745336e00a6636fb8a53a23b1dfe75e214a0ea`                         |
| Final `origin/main`    | `b7745336e00a6636fb8a53a23b1dfe75e214a0ea`                         |
| Branch                 | `gate/m3-lifecycle-story-v2-rerun`                                 |
| Worktree               | `/Users/alin/AI项目/mirror-world-m3-lifecycle-story-gate-v2-rerun` |
| Main CI preflight      | `foundation-ci` run `34670601546` — `Success` for `origin/main`    |
| Gate contract          | `m3-story-gate-coverage-v2`                                        |
| Story Sanity           | `m3-story-sanity-v2`                                               |
| Runner remediation     | `m3-story-gate-runner-infra-v1`                                    |
| Scheduler              | `m3-scheduler-v2`                                                  |
| Intended profile       | 30 residents × 30 World Days = 43,200 World Minutes                |
| Action scope           | `MOVE`, `SLEEP`, `EAT`, `WORK`, `TALK`                             |
| BUY                    | declared / non-executable                                          |

## Immutable lineage

```text
previousFormalFailRun: 20260910-run-08
previousFormalFailStatus: FAIL
previousInfraAbortRun: 20260911-run-14
previousInfraAbortStatus: INFRA_FAILURE
coverageFix: PASS
runnerInfraRemediation: PASS
currentRun: 20260912-run-16 (aborted)
```

`origin/main` still hard-codes `PARENT_RUN_ID = 20260911-run-14`. Coverage
Contract v2 requires `parentRunId = 20260910-run-08` plus the separate
lineage fields above. Run-15 aborted on that mismatch before emitting a
manifest. Run-16 used uncommitted worktree lineage edits so that the baseline
manifest could record the required fields; those edits were never merged and
do not authorize a Gate result.

## Run-15 evidence

| Field                  | Result                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Aborted record         | [`aborted-run.json`](./artifacts/M3-LIFECYCLE-STORY-GATE/20260912-run-15/aborted-run.json) |
| Aborted record SHA-256 | `5273d71b0eec4b73765610406ddf8151a2974106eb4fe7648a9aa58fa8bd5cc6`                         |
| Failed role            | `baseline`                                                                                 |
| Completed roles        | `[]`                                                                                       |
| Finalizer              | not run                                                                                    |
| Error                  | baseline child `SIGTERM`                                                                   |

## Run-16 evidence

Baseline child completed World simulation and flushed scenario artifacts, then
failed artifact validation. Parent wrote an abort record and skipped the
finalizer. Repeat and different-seed never started.

| Field                         | Result                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Aborted record                | [`aborted-run.json`](./artifacts/M3-LIFECYCLE-STORY-GATE/20260912-run-16/aborted-run.json)             |
| Aborted record SHA-256        | `fc28d6d56e3c30f296bf132ffd27b22dfe11ca431f84df404bcf6928129a1dd9`                                     |
| Failed role                   | `baseline` (post-write `validateJsonArtifacts`)                                                        |
| Completed roles               | `[]` (baseline simulation finished, but role not accepted as complete)                                 |
| Finalizer                     | not run                                                                                                |
| Error                         | `JSON.parse` of `coverage-funnel-v2.json` failed in forked validator child                             |
| coverage-funnel-v2.json size  | `17,988,089,482` bytes (17.99 GB)                                                                      |
| Manifest                      | emitted; SHA-256 `78d6f673bd0639af6146a0b9caba7b0ef04f1f92054676ee0821c8dea73f4167`                   |
| Manifest hash field           | `7d959cf3d5b9b9647f72242bb7f4e2d4012c52a8cc30ea46ac4c89569ca8ecad`                                     |
| Scenario summary SHA-256      | `103b00e0d0fade57b7f15d639b60e52e7e98c09e073ac2d02ac92e0a55a12b5c`                                     |
| World Time reached            | `2026-10-07T00:00:00.000Z` (target)                                                                    |
| Final `worldSeq`              | `11000`                                                                                                |
| Ledger events                 | 10,901 typed events + `WORLD_TIME_ADVANCED` 6,814; event summary total 10,901 action-related rows      |
| Action attempts / committed   | 2,093 / 2,093                                                                                        |
| Rejected / conflicts          | 0 / 0                                                                                                |
| Deferred                      | 828,025                                                                                              |
| Causal evidence count         | 2,093                                                                                                |
| Live / full / suffix / genesis hashes | all `95422be233b6c2f0348c8e049a9b090c53c3620a7b4c8ed3fdb681b04e1e9006`                      |
| Story digest                  | `592ffef5d6213462ed8674b68125401ccaf04f23a615cda1f408314467984430`                                     |
| `acceptedActionCoverage`      | `false` (diagnostic only; not a finalizer Hard Gate judgment)                                          |
| `commuteCoverage`             | `true`                                                                                                 |
| LLM path count                | 0                                                                                                      |
| Peak child memory             | not measured; configured child heap `12288` MB                                                         |

### Baseline action completion (diagnostic only)

| Action | ACTION_COUNT (completed) | Unique completed residents | Notes                                      |
| ------ | ------------------------ | -------------------------- | ------------------------------------------ |
| MOVE   | 950                      | 26                         | 4 unemployed `NO_FORMAL_NECESSITY`         |
| SLEEP  | 704                      | 30                         | 30/30                                      |
| EAT    | 60                       | 25                         | 5 `UNAVAILABLE_RESOURCE`                   |
| WORK   | 145                      | 9                          | 17 feasible employed missing completion    |
| TALK   | 234                      | 24 (contact union)         | 19 initiators, 9 participants, 6 missing   |

### Baseline Coverage v2 summary (diagnostic only)

Extracted from the flushed `coverage-funnel-v2.json` summary object. This is
**not** a formal Hard Gate #3 judgment because the finalizer never ran.

| Action | passes | feasibleMissingCompletion | terminal highlights                          |
| ------ | ------ | ------------------------- | -------------------------------------------- |
| SLEEP  | true   | 0                         | `NO_CANDIDATE` 829,414                       |
| EAT    | true   | 0                         | `UNAVAILABLE_RESOURCE` 696,971               |
| WORK   | false  | 17                        | `CANDIDATE_NOT_SELECTED` 123,171             |
| TALK   | false  | 6                         | `CANDIDATE_NOT_SELECTED` 4,780               |
| MOVE   | true   | 0                         | `NO_FORMAL_NECESSITY` 4,246                  |

Overall coverage evaluator `passes = false`.

### Baseline diagnostics (diagnostic only)

| Diagnostic                  | Count |
| --------------------------- | ----- |
| STARVATION_RISK             | 0     |
| RESOURCE_DEPLETION          | 30    |
| SLEEP_RESPONSE_DELAY        | 0     |
| SOCIAL_STARVATION           | 11    |
| WORK_ABSENCE                | 17    |
| WORK_LATE_ATTEMPT           | 0     |
| PERMANENT_DEFER             | 0     |
| REPLAN_EXHAUSTION           | 0     |
| NO_ACTION_PROGRESS          | 0     |
| INVALID_LOCATION_ACTIVITY   | 0     |
| REPLAY_MISMATCH             | 0     |
| DETERMINISM_MISMATCH        | 0     |
| ISOLATION_VIOLATION         | 0     |
| UNEXPECTED_BUY_EXECUTION    | 0     |
| LLM_PATH_USED               | 0     |

WORK funnel breakpoint appears between `CANDIDATE_GENERATED` (26) and
`SELECTED` (9). TALK funnel retains candidate-not-selected and
no-candidate terminal rows for residents without completed contact. No policy
or fixture change was made in response.

## Root cause: coverage artifact validation

`apps/api/scripts/m3-story-gate-runner-infra.mjs` `validateJsonArtifacts()`
forks `JSON.parse(readFileSync(file))` for any artifact above 1,000,000 bytes.
The coverage v2 writer embeds every decision-boundary row in one JSON object:

```text
{"contractVersion":"m3-story-gate-coverage-v2","rows":[...],"summary":{...}}
```

Run-16 baseline produced a 17.99 GB `coverage-funnel-v2.json` because the
contract requires a structured row for every resident/action decision
boundary, including large `NO_CANDIDATE` / `NO_LEGAL_OPPORTUNITY` /
`UNAVAILABLE_RESOURCE` terminal populations. Full-document parse cannot
materialize that file under the configured child heap. The prior runner
remediation fixed write-side streaming and child-process isolation but left
validation as whole-file `JSON.parse`.

This is an `INFRA_FAILURE` / artifact-validation defect. Per formal policy the
run was not patched in place, the run ID was not reused, heap was not raised
to hide the defect, and no 15-gate judgment was emitted.

## Environment and cleanup

| Field                                      | Result                                                      |
| ------------------------------------------ | ----------------------------------------------------------- |
| Node                                       | `v24.11.1`                                                  |
| pnpm                                       | `9.15.4`                                                    |
| Child heap profile                         | `12,288` MB, one scenario child                             |
| PostgreSQL                                 | disposable isolated instances for aborted attempts          |
| Existing project databases / Compose       | untouched                                                   |
| Full post-Gate regression                  | not run; Gate aborted before finalization                   |

Disposable PostgreSQL containers from the aborted attempts were torn down.
The run-16 aborted evidence directory remains in this worktree, including the
17.99 GB coverage file, because it is the immutable proof of the validation
failure. It is not a completed Gate bundle and must not be promoted.

## Formal state boundary

| Field                    | Result                                                                 |
| ------------------------ | ---------------------------------------------------------------------- |
| Historical run-08        | preserved as immutable `FAIL`                                          |
| Historical run-14        | preserved as immutable `INFRA_FAILURE`                                 |
| This attempt run-15      | `INFRA_FAILURE / ABORTED_BEFORE_GATE_FINALIZE`                         |
| This attempt run-16      | `INFRA_FAILURE / ABORTED_BEFORE_GATE_FINALIZE`                         |
| Current Story Gate       | `RERUN_REQUIRED`; no new formal judgment                               |
| M3                       | `IN_PROGRESS`                                                          |
| M3-T05                   | `DEFINED / NOT_STARTED`                                                |
| M3-T05 executed          | no                                                                     |
| Final Status Review #2   | not executed                                                           |
| M4+                      | not entered                                                            |

## Required remediation before the next Gate rerun

1. Formally authorize and merge a runner fix for large-artifact validation
   (streaming / structural validation; do not full-`JSON.parse` multi-GB
   evidence in one child).
2. Formally authorize and merge Coverage Contract v2 lineage emission on
   `origin/main` (`parentRunId = 20260910-run-08` plus both historical lines).
3. Confirm whether coverage row volume itself must stay at
   every-decision-boundary granularity or whether a separate accepted contract
   change is required; do not silently shrink rows.
4. Only after the above, open a **new** immutable `M3-LIFECYCLE-STORY-GATE`
   run ID and rerun 30×30 under Coverage Contract v2.

## STOP confirmation

- No production behavior change
- No policy/fixture/seed change
- No Coverage Contract change
- No retroactive reclassification of run-08 or run-14
- No M3-T05 / Final Review #2 / M4+
- No formal Story Gate PASS or FAIL claimed from this abort
