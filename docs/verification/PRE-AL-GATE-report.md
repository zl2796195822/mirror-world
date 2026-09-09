# PRE-AL-GATE Verification Report

## Status

`PRE-AL-GATE = PASS` for the declared M3 v1 fixture-only capability profile.
`M3 = IN_PROGRESS` remains; this Gate does not close an unnamed M3 final task or
authorize M4+ work.

The Gate was run through the real Observation → Life Engine → ActionRequest →
World Kernel → KernelActionOutcome → Scheduler → Wake → Replay path on clean
disposable PostgreSQL. It did not use an in-memory TestKernel, LLM, frontend,
Realtime path, or a second simulation truth writer.

## Baseline and authority

| Item                   | Result                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `origin/main` at start | `a35a6cbd3058b2b7b9785267dc8f5e1aa335cd5a`                                                                                           |
| Branch                 | `main`                                                                                                                               |
| Implementation commit  | `15d2b25733ba44c7dcd43dbc3e4fe60babc1b651`                                                                                           |
| Main CI                | [foundation-ci run 34363874063](https://github.com/zl2796195822/mirror-world/actions/runs/34363874063), `Success`                    |
| Gate baseline main SHA | `15d2b25733ba44c7dcd43dbc3e4fe60babc1b651`                                                                                           |
| Schema                 | migration `0010_dizzy_falcon`, schema version `10`                                                                                   |
| Clean database         | disposable PostgreSQL `mirror-pre-al-gate-pg`, clean `mirror_gate` database                                                          |
| Formal inputs          | `PROJECT_STATE.md`, M3-T04/PRE-AL-07 reports, ADR-0008/0009/0010, PRE-AL-07 compatibility review, frozen `RES-M3-003` research input |

The main CI preflight for `a35a6cb` was already green (run `34350672611`). The
implementation commit was then pushed and its post-push CI was also green.

## Gate definition and scope

The run uses exactly 30 fixed M3-T01 residents for exactly 30 World Days:
43,200 World Minutes. The driver advances World Time to deterministic due
points, then drains work due at or before the exact terminal time. It does not
run a wall-clock 30-day wait or a second minute-loop implementation.

The declared capability profile is:

- actions: `MOVE`, `SLEEP`;
- resource authority: `M3_FIXTURE_READONLY`;
- event registry: `m3-domain-event-registry-v1`;
- resident projection: `m3-resident-projection-v1`;
- deferred: EAT/BUY mutation, Economy, Relationship, Memory, AI, 3D and scale
  beyond the 30-resident M3 Gate.

## Runtime implementation

- `simulation_driver_leases` provides one world-scoped active owner and a
  monotonically increasing `fence_token`.
- World-Time advance, action submission and action completion validate the
  current fence inside their PostgreSQL transaction. A stale driver is rejected
  before it can advance or commit due work.
- Scheduler truth remains `Scheduler = WHEN`, `Life Engine = WHAT`,
  `World Kernel = CAN / COMMIT`. The driver only uses the existing due activity,
  wake, clock, Kernel and Event Ledger boundaries.
- Deferred wakes remain durable projections. A wake is returned for decision,
  remains queryable until acknowledgement, and is not treated as acknowledged
  merely because it was dequeued.
- MOVE/SLEEP completion remains Kernel-owned and state-version fenced.

## Typed replay and projection

The typed registry covers the current M3 domain only:

`WORLD_TIME_ADVANCED`, `RESIDENT_MOVE_STARTED`,
`RESIDENT_MOVE_COMPLETED`, `RESIDENT_SLEEP_STARTED`, and
`RESIDENT_SLEEP_COMPLETED`.

Unknown event types, unsupported payload versions, world mismatch, sequence
gaps, invalid checkpoints and invalid transitions fail closed. The resident
projection reducer starts from the fixed seed/runtime genesis and consumes
committed ordered facts; it does not resubmit ActionRequests or read the latest
mutable state as historical input.

## Manifest and evidence hashes

The machine-readable manifest is
[`artifacts/PRE-AL-GATE/manifest.json`](./artifacts/PRE-AL-GATE/manifest.json).

| Hash/input                      | Value                                                              |
| ------------------------------- | ------------------------------------------------------------------ |
| Manifest hash                   | `4dd0000ae1528b004015f82a9cb3f2e30912ed219e2125b29b307fd5a6e289a8` |
| Resident fixture hash           | `f0ab06cc9870f5ba06e6de73b56baa34a1c101c020f1723c4247d69da22b2548` |
| Initial snapshot hash           | `2ae89c219dc751eac3ba8b7935970162c45293fd6d4aec2960dc60240101f5ef` |
| Live projection hash            | `8c506f4ce2ab9b13fc56c7b73a015d9ca8c19de276e8aa30a1d0f0b49f48a861` |
| Full replay projection hash     | `8c506f4ce2ab9b13fc56c7b73a015d9ca8c19de276e8aa30a1d0f0b49f48a861` |
| Full/suffix ledger history hash | `0fd849607dffd7e12d0baa0c0a4585233a7166c5b51ea10b737483f842f2cd33` |
| A/B deterministic digest        | `4d2b570830545df66e7314a9d1f8094646ef2b96a6f3d109bd40c2a53baa87ec` |

Pinned policy versions are recorded in the manifest: `m3-needs-v1`,
`m3-goals-v1`, `m3-rule-decision-v1`, `m3-action-loop-v1`,
`m3-action-semantics-v1`, `m3-replan-v1`, `m3-scheduler-v1`,
`m3-runtime-state-v1`, and `m3-domain-event-registry-v1`.

## 30×30 result

| Metric                     |                     Result |
| -------------------------- | -------------------------: |
| World Days reached         |                         30 |
| World Minutes reached      |                     43,200 |
| Terminal World Time        | `2026-10-07T00:00:00.000Z` |
| Residents present/executed |                    30 / 30 |
| Action attempts            |                        153 |
| `COMMITTED`                |                        127 |
| `REJECTED`                 |                         26 |
| `CONFLICT`                 |                          0 |
| Bounded replans            |                          0 |
| Deferred decisions/wakes   |                      4,209 |
| Final `worldSeq`           |                      1,617 |
| Events                     |                      1,617 |
| Due work at endpoint       |                          0 |

The baseline event stream contains 1,364 `WORLD_TIME_ADVANCED`, 127
`RESIDENT_SLEEP_STARTED`, and 126 `RESIDENT_SLEEP_COMPLETED` events. MOVE is
also covered through the real Kernel, scheduler and action-loop integration
tests; this baseline fixture's selected committed path was sleep-heavy rather
than a claim of Economy or richer action coverage.

Per-resident metrics, event counts, invariants, replay data and fault results
are retained in the machine-readable artifact directory.

## Fault, recovery and isolation evidence

- Pause/resume: PASS; a paused world did not advance World Time or process due
  work, then resumed at the explicit target.
- Driver takeover/fencing: PASS; stale driver A was rejected after driver B
  acquired a higher fence token, while B continued through the real driver.
- Wake restart/requery: PASS; a due wake remained durable after the first
  driver stopped before acknowledgement, was re-queried by the takeover driver,
  and was acknowledged exactly once afterward.
- ActionRequest idempotency: PASS; repeated request disposition was `REUSED`
  with the original outcome.
- Completion idempotency: PASS; repeated completion was `REUSED` and the
  `world_events` count did not change.
- Poison resident: PASS; the injected resident reached bounded `STOP` count 3
  and the other 29 residents continued committing work.
- World/resident isolation: PASS; all reads, rows, requests, events, leases and
  projections were world-scoped, with no cross-world contamination.
- Zero-LLM: PASS; the Gate invokes no model/provider path.

## Replay and checkpoint evidence

The live terminal resident projection equals full genesis replay by both
canonical object comparison and SHA-256 projection hash. A durable checkpoint
prefix at `worldSeq=808` was replayed with its suffix and matched full replay.
The checkpoint was deleted and the same ledger was rebuilt from genesis with
the same ledger history hash. Checkpoint data was therefore used only as an
accelerator, not as durable truth.

## Invariants and liveness

The machine invariant result is
[`invariant-summary.json`](./artifacts/PRE-AL-GATE/invariant-summary.json).
It records exact endpoint, monotonic World Time/sequence, 30 residents,
projection and suffix replay equality, deterministic repeat equality, no due
work at the endpoint, world isolation, no duplicate committed side effect, and
bounded poison failure as PASS.

The runner has an iteration bound of 20,000 and a stagnation guard of 100
unchanged steps. The baseline reached the endpoint, drained due work, and did
not trigger either bound. This is a correctness Gate for 30 residents, not a
scale or latency claim.

## Repository verification

| Check                                                              | Result                                                                  |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                   | PASS                                                                    |
| format / Prettier                                                  | PASS                                                                    |
| `pnpm lint`                                                        | PASS                                                                    |
| `pnpm typecheck`                                                   | PASS                                                                    |
| `pnpm test`                                                        | PASS; contracts 45, life-engine 56, world-kernel 49, DB 6, Web 3, API 6 |
| `pnpm build`                                                       | PASS                                                                    |
| clean `pnpm db:setup`                                              | PASS                                                                    |
| clean API integration including PRE-AL-GATE                        | PASS                                                                    |
| official `pnpm audit --prod --registry=https://registry.npmjs.org` | PASS; no known vulnerabilities                                          |
| HIGH / CRITICAL                                                    | 0 / 0                                                                   |

The default mirror's audit endpoint was unavailable; that is not treated as an
audit result. The official registry audit is the recorded dependency result.

## Final state and non-claims

- `PRE-AL-GATE = PASS`.
- `M3 = IN_PROGRESS`; the Gate does not infer M3 final closure because the
  current authority names no additional M3 task to execute after this Gate.
- Full Replay = PASS for the declared current M3 resident/runtime projection
  profile; this does not claim replay for deferred Economy/Relationship/Memory
  domains.
- 30×30 = PASS for the declared M3 fixture-only MOVE/SLEEP profile.
- No remaining PRE-AL-GATE P1 blocker was found.
- EAT/BUY mutation, Economy, Memory, Relationship, AI, 3D, Realtime and
  population scaling remain outside this Gate.
- No automatic next formal task is selected; perform only an explicit M3 final
  status review when authorized. Do not start M4+ from this report.

## Artifacts

- [`manifest.json`](./artifacts/PRE-AL-GATE/manifest.json)
- [`run-summary.json`](./artifacts/PRE-AL-GATE/run-summary.json)
- [`resident-summary.json`](./artifacts/PRE-AL-GATE/resident-summary.json)
- [`event-summary.json`](./artifacts/PRE-AL-GATE/event-summary.json)
- [`replay-summary.json`](./artifacts/PRE-AL-GATE/replay-summary.json)
- [`failure-injection-summary.json`](./artifacts/PRE-AL-GATE/failure-injection-summary.json)
- [`checksums.json`](./artifacts/PRE-AL-GATE/checksums.json)
- [`invariant-summary.json`](./artifacts/PRE-AL-GATE/invariant-summary.json)
