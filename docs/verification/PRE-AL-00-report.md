# PRE-AL-00 Verification Report

## Task

- Task ID: `PRE-AL-00`
- Task name: Restore Green Main Baseline
- Initial main HEAD: `e025b6df756e6f2e99902b06716eca7ea78ea3eb`
- Initial `HEAD == origin/main`: yes
- Initial worktree: clean
- Failed runs: `34225477788`, `34225711930`

## Failed CI evidence

Both failed runs were `foundation-ci` job `foundation`, step `Lint and format` (workflow step 8), running:

```text
pnpm lint
```

Both stopped with exit code 1 before the workflow Typecheck step. The public job metadata showed Typecheck as skipped. Therefore the exact TypeScript error is: **none; Typecheck did not run**.

The exact local failure was:

```text
Checking formatting...
[warn] docs/verification/M3-T04-blocked-report.md
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
ELIFECYCLE Command failed with exit code 1.
```

The evidence-only record is `docs/verification/PRE-AL-00-diagnostic.md`.

## Environment

| Item         | Local                            | GitHub Actions                    |
| ------------ | -------------------------------- | --------------------------------- |
| OS           | macOS                            | `ubuntu-latest`                   |
| Node         | `v24.11.1`                       | Node `24`                         |
| pnpm         | `9.15.4`                         | `pnpm/action-setup@v4`, `9.15.4`  |
| Corepack     | `0.34.2`                         | not explicitly declared           |
| Turbo        | `2.5.6`                          | resolved from the frozen lockfile |
| install      | `pnpm install --frozen-lockfile` | `pnpm install --frozen-lockfile`  |
| workflow env | `CI=true` for reproduction       | GitHub Actions environment        |

The workflow did not define a Turbo override or `TURBO_FORCE`. It used the repository root `pnpm lint` and `pnpm typecheck` commands exactly.

## Local versus CI reproduction

- Before the fix, `CI=true pnpm lint` and ordinary `pnpm lint` both failed on the same tracked Markdown file.
- A disposable worktree from initial main `e025b6d` was installed with the frozen lockfile.
- With Node 24 explicitly aligned to CI and a cold Turbo cache, all 6 package lint tasks passed; root Prettier failed on `docs/verification/M3-T04-blocked-report.md`.
- In that same cold worktree, `CI=true pnpm typecheck` passed with 9/9 tasks.
- On the main worktree, ordinary `CI=true pnpm typecheck` and `TURBO_FORCE=true CI=true pnpm typecheck` both passed with 9/9 tasks.

This excludes generated files, incremental TypeScript artifacts, Turbo cache state, dependency installation state, and typecheck graph order as the cause of the reported CI failure.

## Root cause

**ROOT CAUSE:** The tracked `docs/verification/M3-T04-blocked-report.md`, added by commit `a3ab6bfc4c7745037e93291f15a70e56c58650c2`, was not formatted according to the repository's Prettier 3.6.2 configuration.

**EVIDENCE:** `pnpm lint` passed all 6 ESLint package tasks and then failed only at root `prettier --check .`, naming that file. The clean worktree reproduced the same failure without local build output or cache.

**WHY LOCAL PASSED:** The earlier local evidence ran `pnpm typecheck`, which is a different command. Typecheck was green because there was no TypeScript failure. The complete local `pnpm lint` path was not green until the report was formatted.

**WHY CI FAILED:** GitHub Actions runs `pnpm lint` before `pnpm typecheck`; the formatting failure terminated the job, so Typecheck was skipped. The CI failure was not a TypeScript failure.

## Hypotheses tested

1. **TypeScript or Turbo cache failure:** rejected by cold-worktree typecheck 9/9 and forced typecheck 9/9.
2. **Node/pnpm version mismatch:** rejected for the decisive reproduction; Node 24 and pnpm 9.15.4 matched the workflow declarations.
3. **Generated output, `tsbuildinfo`, missing workspace dependency, project reference, or case-sensitive source import:** not implicated; failure occurred earlier in the root formatting check, and no source or dependency change was required.
4. **Workflow command mismatch:** rejected; local reproduction used the exact workflow command `pnpm lint`.

## Fix

The minimal fix was to run the repository's existing Prettier on the one failing tracked report:

```text
docs/verification/M3-T04-blocked-report.md
```

No workflow change, TypeScript change, dependency change, lockfile change, runtime change, schema change, migration, or business behavior change was made.

## Validation

| Check                                     | Result                                             |
| ----------------------------------------- | -------------------------------------------------- |
| `pnpm install --frozen-lockfile`          | PASS                                               |
| `CI=true pnpm lint`                       | PASS                                               |
| `CI=true pnpm typecheck`                  | PASS, 9/9 tasks                                    |
| `TURBO_FORCE=true CI=true pnpm typecheck` | PASS, 9/9 uncached tasks                           |
| `CI=true pnpm test`                       | PASS, 9/9 tasks                                    |
| `CI=true pnpm build`                      | PASS, 6/6 tasks                                    |
| clean PostgreSQL `db:setup` twice         | PASS                                               |
| M2 PostgreSQL integration                 | PASS, 4/4                                          |
| M3-T01/T02/T03 regression                 | PASS; resident seed 6, Needs 10, Goals 9           |
| official npm registry `pnpm audit --prod` | PASS; no known vulnerabilities, HIGH=0, CRITICAL=0 |

The default configured mirror registry returned `ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS`; the official npm registry was used for the formal audit result above.

## GitHub Actions

- Fix commit: `5f4cf7ec235a50e795e728c8c141d229ba891c2d`
- Root-cause fix verification: [foundation-ci run 34227318851](https://github.com/zl2796195822/mirror-world/actions/runs/34227318851), `Success`
- Final status-sync commit: `9d51a3036339004e9337ccb1b469bca81a275a46`
- Final GitHub Actions run: [foundation-ci run 34227826950](https://github.com/zl2796195822/mirror-world/actions/runs/34227826950), `Success`
- Job: `foundation`
- Coverage: install, PostgreSQL setup, lint/format, typecheck, unit tests, M2 integration, and build
- Existing warning: GitHub action dependencies target Node.js 20 and are being forced onto Node.js 24; this did not fail the workflow and was not changed by PRE-AL-00.

## Scope and findings

- P0: 0 introduced; 0 open from this task.
- P1: Existing M3 Pre-Action-Loop blockers remain: ActionOutcome/ActionResult feedback, Observation/query boundary, ActorRef mapping, read-only resource boundary, MOVE/SLEEP semantics, bounded replan, scheduler/driver, and full resident/domain replay.
- P2: Existing causation/event-payload/scheduler follow-ups remain unchanged.
- P3: Existing document manifest filename/count mismatch remains unchanged.

PRE-AL-00 did not implement M3-T04, ActionOutcome, Observation, ActorRef, MOVE/SLEEP, scheduler, retry/replan, or any runtime capability.

## Final state

- `PRE-AL-00 = PASS`
- `M3 = IN_PROGRESS`
- `M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE`
- Main CI baseline: `GREEN`
- Implementation commit: `5f4cf7ec235a50e795e728c8c141d229ba891c2d`
- Final main HEAD at final status-sync verification: `9d51a3036339004e9337ccb1b469bca81a275a46`
- Worktree after status synchronization: clean
- No migration or database schema change
- Next allowed task: `PRE-AL-01` only; it is recorded, not executed.
