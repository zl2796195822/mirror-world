# M3 Story Gate Runner Infrastructure Remediation

Date: 2026-09-12
Status: `LOCAL_INFRA_REMEDIATION_PASS / REMOTE_CI_PASS`
Milestone: `M3 = IN_PROGRESS`

## Outcome and boundary

This task repaired the Story Gate verification instrument. It did not change
World Kernel semantics, Life Engine policy, Scheduler semantics, EAT/WORK/TALK/
MOVE/SLEEP behavior, fixture or seed data, the Coverage v2 predicate, the 15
Hard Gates, ADRs, schema, migrations, or production world truth.

The full 30-resident × 30-World-Day Story Gate was not rerun. The next formal
task remains a new immutable `M3-LIFECYCLE-STORY-GATE` run with a new run ID.

## Starting point and authority

| Item                   | Value                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| Starting `origin/main` | `71e3f1b9f05c0d0273d4117e83c513ef547f38ab`                                               |
| Working branch         | `gate/m3-lifecycle-story`                                                                |
| Starting `HEAD`        | `71e3f1b9f05c0d0273d4117e83c513ef547f38ab`                                               |
| Remediation commits    | `2f9a81f`, `28ef136`                                                                     |
| Final branch `HEAD`    | `28ef136d10a2061cd7e87b747476e5ae6b245208`                                               |
| Final `origin/main`    | `71e3f1b9f05c0d0273d4117e83c513ef547f38ab`                                               |
| Project state          | `M3 = IN_PROGRESS`; Story Gate `FAIL / RERUN_REQUIRED`; `M3-T05 = DEFINED / NOT_STARTED` |
| Coverage contract      | `m3-story-gate-coverage-v2`                                                              |
| Story Sanity contract  | `m3-story-sanity-v2`                                                                     |
| Node                   | 24.x; local run used Node `v24.11.1`                                                     |

`git fetch origin` was run before the audit. PR #4 was opened from the
remediation branch with head `a376b1c1e232aa7571d01e676965a6689a3baa47`.
Its `foundation-ci` pull-request run `34668684492` completed with `Success`.
The PR was then merged into `main` as `0878c1a112c8d71824a727d6dbd0b5e23ca2cd95`.
The post-merge `foundation-ci` push run `34669795310` also completed with
`Success` in 3m27s. GitHub reported one Node.js 20 deprecation warning for
actions forced to Node.js 24; no check failed.

## Root-cause analysis: run-14

Immutable `20260911-run-14` remains in the independent execution worktree
`/Users/alin/AI项目/mirror-world-m3-lifecycle-story-gate-v2`:

- manifest: `1cd6c9ff96f0bbf36deff4dfe1b685f185d232c54b7e5731f2b108dd00941521`
- manifest file SHA-256: `484625f26c5ec2fa1e6092d1e62de89550207f8ea871b442101684b00477718e`
- aborted record SHA-256: `98687a6b77a332d1777c6f91d1d8f2af09a2face93ecce060d44278604a5d78d`
- status: `INFRA_FAILURE / ABORTED_BEFORE_GATE_FINALIZE`
- finalizer: not run; no 15-gate result exists

The retained repeat log is `/tmp/mirror-world-m3-gate-run-14-repeat.log`. Its
last GC observation reached `8146.6 MB` used under the configured
`--max-old-space-size=8192`, followed by:

```text
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

The native stack is decisive: `ValueDeserializer` → `StructuredClone` →
`ArrayMap`. The old scenario path called the coverage collector's cloning
`rows()` API while materializing coverage evidence. Therefore the failure was
after World Time reached the endpoint and during coverage evidence
materialization, before scenario JSON emission and before the finalizer. It
was not a database write, world simulation, repeat comparison, file write, or
finalizer-load failure.

Run-14 had no scenario JSON, so its exact in-memory scenario size, causal row
count, resident evidence count, and coverage row count are correctly recorded
as unavailable. The last read-only snapshots recorded 10,975 baseline events,
11,000 repeat events, and 11,656 different-seed events. The old process kept
completed baseline data while running repeat and then different-seed data; it
also built cloned coverage rows and later attempted whole-result serialization.

The historical `20260910-run-08 = FAIL` evidence remains unchanged. Its
manifest SHA-256 is
`8c7758e9d90c654594f79370ecf500699c98413789315e2e3ec58d6b81248c62` and its
recorded `run-summary.json` SHA-256 is
`ca5ffaa7d36bdcec9c9c6e06f5dc55c41c8476daa2f08967afe89a7acd911c90`.

## Options considered

| Option                                      | Result                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A. Increase heap only                       | Rejected as the primary repair; it leaves the same object lifetime and full-copy failure mode. |
| B. Serial scenarios with per-scenario flush | Required and implemented; only one scenario child is live at a time.                           |
| C. Large heap plus combined result          | Rejected; it retains the highest-risk lifetime and creates no bounded-memory guarantee.        |

The selected strategy is B plus bounded serialization and a resource
guardrail. The default child profile is `--max-old-space-size=12288` MB, scoped
to one scenario process. The host reports 24 GiB physical memory; this is a
guardrail, not a substitute for releasing scenario state. The reduced proof
run deliberately used only 1,024 MB.

## Implemented runner architecture

The parent runner now executes:

```text
baseline child → flush and validate → load compact summary
repeat child   → flush and validate → load compact summary
different child → flush and validate → load compact summary
finalizer      → read three compact summaries → evaluate 15 gates
```

- Scenario order is deterministic and strictly serial.
- Each scenario is an independent Node child process; process exit releases its
  entire V8 heap.
- A failed child leaves already-flushed scenario artifacts and writes
  `aborted-run.json`; finalization is explicitly skipped.
- The parent never constructs a combined
  `{ baseline, repeat, different }` raw-result object.
- Reduced mode is verification-only and must be explicitly enabled. The
  default child remains 30 residents × 30 World Days; reduced parameters are
  now forwarded only when requested.

## Serialization, artifact layout, and finalizer

Each scenario writes the existing machine-readable evidence into:

```text
<run>/scenarios/baseline/
<run>/scenarios/repeat/
<run>/scenarios/different/
```

Each directory contains the 14 required artifacts: manifest, scenario summary,
run summary, action statistics, resident summary, causal evidence, Coverage v2
funnel, event summary, replay summary, determinism comparison,
failure/recovery summary, diagnostics, hard gates placeholder, and checksums.
The final run root contains the baseline evidence projection plus a compact
`scenario-summaries.json` index and the finalized `hard-gates.json`.

- JSON files are written through atomic temporary-file + rename writes.
- Causal evidence and Coverage v2 rows use an array streaming writer; no single
  combined array string is created by the writer.
- Large JSON validation is parsed in a short-lived validator child so the
  scenario child does not read a second full large JSON object into its own
  heap after retaining the simulation object.
- `hashJsonArray()` updates SHA-256 incrementally per canonical array element.
  The test suite confirms the resulting bytes equal the legacy whole-array hash
  for the same input. Historical hashes are never recomputed or overwritten.
- The finalizer reads `scenario-summary.json` and the small manifest from each
  scenario. It does not deserialize causal, coverage, event, or replay arrays.
  It copies already-flushed bytes into the final artifact root and evaluates
  gates from compact summaries.

The artifact schema versions remain `m3-simulation-manifest-v1`,
`m3-story-gate-scenario-summary-v1`, `m3-story-gate-coverage-v2`, and
`m3-story-sanity-v2`. No Story Gate contract or Hard Gate predicate changed.

All evidence remains present: causal chains retain next-observation links;
TALK keeps the complete negative funnel and `UNKNOWN` behavior; live/full/
suffix/genesis replay hashes remain emitted; determinism still compares the
same-seed and different-seed story digests. Verification orchestration does
not enter World decision inputs.

## Verification evidence

| Check                                          | Result                                                                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Runner/serializer/finalizer/abort/run-ID tests | `25/25 PASS` in the API test command                                                                                                      |
| Generated-memory stress                        | 120,000 generated evidence rows, child heap 64 MB, valid JSON, `PASS`                                                                     |
| Streaming writer failure cleanup               | temporary file removed, `PASS`                                                                                                            |
| Reduced real child                             | 30 residents, 1,920 World Minutes, 1,024 MB heap, 66,440 coverage rows, 15 artifacts flushed and validated, `PASS` as infrastructure-only |
| Reduced endpoint semantics                     | 26 active activities remain at the one-day test boundary; not a Story Gate result                                                         |
| Fresh PostgreSQL API integration               | `42/42 PASS`, including lifecycle 15/15, Coverage Fix 7/7, and existing PRE-AL-GATE 30×30 1/1                                             |
| `pnpm install --frozen-lockfile`               | `PASS`                                                                                                                                    |
| `pnpm lint` and format check                   | `PASS`                                                                                                                                    |
| `pnpm typecheck`                               | `PASS`                                                                                                                                    |
| `pnpm test`                                    | `PASS`                                                                                                                                    |
| `pnpm build`                                   | `PASS`                                                                                                                                    |
| Official npm production audit                  | `PASS`; HIGH=0, CRITICAL=0                                                                                                                |
| `git diff --check`                             | `PASS` on the remediation commits                                                                                                         |

The disposable PostgreSQL containers and their anonymous volumes were removed
after the reduced run and integration suite. Existing compose services and
existing project databases were not reset or seeded. Temporary verification
artifact directories and marker files were moved to the user's Trash rather
than left as active resources.

## Production and immutable-evidence audit

The implementation diff is limited to Story Gate runner/serializer/finalizer
scripts, the API verification test registration, the Coverage collector's
clone-preserving internal path, and the minimal Prettier exclusion for
immutable generated evidence. No production package source, fixture, seed,
schema, migration, ADR, or world behavior file changed.

The immutable run-08 bundle and run-14 manifest/aborted record were not
formatted, rewritten, rehashed, resumed, or reused. The runner rejects
`20260911-run-14` before creating or touching artifacts. A new run ID is
required.

## Status and next task

`M3` remains `IN_PROGRESS`. The historical Story Gate remains
`FAIL / RERUN_REQUIRED`; run-14 remains `INFRA_FAILURE` and is not a 15-gate
failure. `M3-T05` remains `DEFINED / NOT_STARTED`. No new full Story Gate,
M3-T05, Final Status Review #2, or M4+ work was started.

Remote CI is now verified for both the pull request and the merged `main`
commit. The next allowed formal task is a new immutable
`M3-LIFECYCLE-STORY-GATE` rerun with a new run ID. This report does not
authorize that rerun.
