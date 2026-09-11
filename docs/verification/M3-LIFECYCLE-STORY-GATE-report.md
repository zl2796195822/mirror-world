# M3-LIFECYCLE-STORY-GATE Verification Report

Date: 2026-09-10
Status: `FAIL`
Milestone: `M3 = IN_PROGRESS`

## Scope and authority

This was the formal lifecycle gate, not M3-T05 and not a production feature
task. The run used the frozen M3 lifecycle specification, accepted ADR-0011
and ADR-0012, the existing M3 Action Loop v2, World Kernel, deterministic
World-Time driver, due/wake scheduler, PostgreSQL Event Ledger, and zero LLM
calls.

Preflight was performed against latest `origin/main`:

| Item                   | Evidence                                                          |
| ---------------------- | ----------------------------------------------------------------- |
| Branch                 | `gate/m3-lifecycle-story`                                         |
| `HEAD` / `origin/main` | `590d19d000fc04723028556e267cdbed362b4da8` / same                 |
| Initial worktree       | clean                                                             |
| `foundation-ci`        | run `34464740586`, `success`                                      |
| Runtime                | Node `v24.11.1`                                                   |
| PostgreSQL             | `18.6`                                                            |
| Database setup         | 12 migrations, fresh seed, three independent disposable databases |

## Run contract

The authoritative run is `20260910-run-08`:

- 30 deterministic residents, fixed world seed, 43,200 World Minutes.
- Start `2026-09-07T00:00:00.000Z`; target `2026-10-07T00:00:00.000Z`.
- Action scope: `MOVE`, `SLEEP`, `EAT`, `WORK`, `TALK`; `BUY` remained non-executable.
- Baseline and same-seed repeat both reached `worldSeq=10668`; different-seed
  reached the target with a separate history (`worldSeq=10667`).
- Baseline: 1,919 committed action starts and 10,668 ledger events.
- Final endpoint: zero active activities, zero due wakes, zero checkpoints.

The complete machine-readable bundle is in
[`artifacts/M3-LIFECYCLE-STORY-GATE/20260910-run-08/`](./artifacts/M3-LIFECYCLE-STORY-GATE/20260910-run-08/).
The manifest hash is
`af1b1f0aa120a1c66e777a6ec23686f63317a8cf0b1c66ca9aff8cf2952963c2`.

## Action evidence

| Action | Attempts | Committed | Completed |
| ------ | -------: | --------: | --------: |
| MOVE   |      950 |       950 |       950 |
| SLEEP  |      702 |       702 |       702 |
| EAT    |       60 |        60 |        60 |
| WORK   |        4 |         4 |         4 |
| TALK   |      203 |       203 |       203 |

The causal bundle contains 1,919 structured evidence rows linking observation,
Need, Goal, candidate/constraints/score, ActionRequest, Kernel outcome, event
references, and next observation. It contains no hidden chain-of-thought.

## Hard Gates

|   # | Gate                      | Result   |
| --: | ------------------------- | -------- |
|   1 | Run endpoint              | PASS     |
|   2 | Fixture integrity         | PASS     |
|   3 | Accepted action coverage  | **FAIL** |
|   4 | Causal chain              | PASS     |
|   5 | Need response             | PASS     |
|   6 | Need effect               | PASS     |
|   7 | Work obligation           | PASS     |
|   8 | Resource conservation     | PASS     |
|   9 | TALK legality / atomicity | PASS     |
|  10 | Bounded recovery          | PASS     |
|  11 | Liveness                  | PASS     |
|  12 | Spatial / activity safety | PASS     |
|  13 | Replay equivalence        | PASS     |
|  14 | Determinism               | PASS     |
|  15 | Isolation / scope         | PASS     |

Gate #3 is decisive and is not waived. Its frozen predicate requires every
resident to complete MOVE, SLEEP, EAT, and TALK, and every employed resident
to complete WORK plus the workplace/home commute. The run recorded:

- 30 residents, 30 SLEEP completions.
- 25 residents with EAT completion; 5 fixed residents started with
  `foodUnits=0`, and the Kernel correctly did not invent food.
- 19 residents with TALK completion; 11 had no completed contact.
- 26 employed residents, but only 4 completed WORK; no unemployed resident
  committed WORK.
- 26 residents with MOVE completion; 4 had no completed MOVE. Employed
  workplace/home commute coverage was recorded separately as true.

## Diagnostics

All 15 frozen diagnostic classes were emitted. Non-zero values were:

| Diagnostic           | Count |
| -------------------- | ----: |
| `RESOURCE_DEPLETION` |    30 |
| `SOCIAL_STARVATION`  |    11 |
| `WORK_ABSENCE`       |    23 |

The remaining diagnostic classes were zero, including
`WORK_LATE_ATTEMPT`, `PERMANENT_DEFER`, `REPLAN_EXHAUSTION`,
`INVALID_LOCATION_ACTIVITY`, `REPLAY_MISMATCH`, `DETERMINISM_MISMATCH`,
`ISOLATION_VIOLATION`, `UNEXPECTED_BUY_EXECUTION`, and `LLM_PATH_USED`.
Resource depletion is evidence, not an automatic failure; the failure is the
explicit action-coverage predicate.

## Replay and determinism

The four baseline projection hashes were identical:

```text
899da98acfa86803f972c80d8649b236d9e2f8e16ae625f1965ebcf4bd120b82
```

This covered live projection, full replay, checkpoint suffix replay, and
genesis rebuild after checkpoint deletion. Same-seed comparison was equal;
different-seed fixture/behavior comparison was different.

## Classification and boundary

The failure is retained as a formal failure, with no scoring, threshold,
resource, employment, work schedule, TALK rule, fixture, or Hard Gate changes.
The evidence identifies two follow-up concerns requiring an independent
decision/fix task before any rerun:

1. The unconditional “every resident EAT” coverage rule conflicts with the
   frozen T01 resource fixture containing five zero-food residents.
2. The strict `09:00 UTC` WORK start boundary, plus residents needing to move
   from home, leaves 23 employed residents without a completed shift; the
   current policy also leaves 11 residents without TALK and 4 without MOVE.

These are recorded as `GATE_CONTRACT_FIXTURE_CONFLICT` and
`POLICY_COVERAGE_MISMATCH` for review. They are not patched inside this Gate.

No production behavior, schema, migration, dependency, or durable main
database state was changed. The named disposable databases were removed after
verification. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, official
npm production audit, and the clean PostgreSQL API integration suite all
passed; this does not override the failed lifecycle Gate.

M3 remains `IN_PROGRESS`. `M3-T05`, Final Status Review #2, and M4+ were not
started and are not authorized by this result.
