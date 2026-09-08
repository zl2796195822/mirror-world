# PRE-AL-00 Diagnostic Evidence

This is an evidence-only record created before any PRE-AL-00 fix.

## Failed GitHub Actions runs

| Run ID        | Observed failed step | Step 8 conclusion | Typecheck step |
| ------------- | -------------------- | ----------------- | -------------- |
| `34225477788` | `Lint and format`    | `failure`         | skipped        |
| `34225711930` | `Lint and format`    | `failure`         | skipped        |

The public run/job metadata exposed the failed step and `Process completed with exit code 1`, but not the authenticated step log. No TypeScript error was emitted by these runs because the workflow stopped before the Typecheck step.

## Workflow evidence

The workflow at `.github/workflows/ci.yml` invokes these steps in order:

1. `pnpm install --frozen-lockfile`
2. `docker compose up -d --wait postgres`
3. `pnpm db:setup`
4. `pnpm lint`
5. `pnpm typecheck`

The failing workflow step is named `Lint and format` and runs the exact command `pnpm lint`.

## Local reproduction

| Command                           | Result              | First reported failure |
| --------------------------------- | ------------------- | ---------------------- |
| `CI=true pnpm lint`               | failed, exit code 1 | Prettier check         |
| `pnpm lint`                       | failed, exit code 1 | Prettier check         |
| `pnpm typecheck`                  | passed              | no failure             |
| `TURBO_FORCE=true pnpm typecheck` | passed, 9/9 tasks   | no failure             |

Both lint runs reported:

```text
Checking formatting...
[warn] docs/verification/M3-T04-blocked-report.md
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
ELIFECYCLE Command failed with exit code 1.
```

The Turbo lint phase completed first with 6 successful package lint tasks. The failure came from the root `prettier --check .` portion of `pnpm lint`.

## Environment evidence

| Item            | Local value            | Workflow declaration                      |
| --------------- | ---------------------- | ----------------------------------------- |
| Node            | `v24.11.1`             | `node-version: 24`                        |
| pnpm            | `9.15.4`               | `pnpm/action-setup@v4`, `version: 9.15.4` |
| Corepack        | `0.34.2`               | not declared                              |
| Turbo           | `2.5.6`                | resolved from lockfile/package manifest   |
| package manager | `pnpm@9.15.4`          | frozen install                            |
| install mode    | existing local install | `pnpm install --frozen-lockfile`          |

The workflow does not declare `TURBO_FORCE`, `TURBO_REMOTE_ONLY`, or a Turbo cache override. Local lint output reported `Remote caching disabled` and package lint task cache hits. The workflow has no explicit Turbo cache configuration.

## File and history evidence

`docs/verification/M3-T04-blocked-report.md` is tracked and was added by commit `a3ab6bfc4c7745037e93291f15a70e56c58650c2`, immediately before the current CI retry commit. The file is the only path reported as different by the root Prettier check.

No source code, workflow, dependency, schema, migration, or runtime change has been made by PRE-AL-00 at the time this record was created.
