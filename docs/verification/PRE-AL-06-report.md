# PRE-AL-06 Verification Report

## Result

`PRE-AL-06 = IMPLEMENTED_UNVERIFIED`（等待 GitHub Actions 对本次实现提交
完整通过后升级为正式 `PASS`）。本地、clean PostgreSQL、全仓质量门禁和
官方 dependency audit 已通过；本报告不把本地结果替代远程 CI Gate。

## Task and baseline

- Task ID: `PRE-AL-06`
- Task name: `Bounded Replan / Failure Policy`
- Original main HEAD: `1359cd91317352ac8268cd7220a3abc9aa8e832f`
- Starting branch: `main`
- Starting `HEAD == origin/main`: yes
- Scope: pure Failure Classification / Replan Policy / Contract boundary
- Policy version: `m3-replan-v1`
- Gate decision: `CASE A`

## Failure Audit

|   # | Audit item                  | Current formal result                                                                                                                                                                                                 |
| --: | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | KernelOutcome statuses      | Durable `COMMITTED`, `REJECTED`, `CONFLICT` only                                                                                                                                                                      |
|   2 | Action call dispositions    | `EXECUTED`, `REUSED`, `IDEMPOTENCY_CONFLICT`; resident completion additionally exposes `NOT_DUE` and `REJECTED`                                                                                                       |
|   3 | MOVE rejection reasons      | `KERNEL_INVALID_ACTION`, `KERNEL_ACTOR_NOT_FOUND`, `KERNEL_PERMISSION_DENIED`, `KERNEL_INVALID_LOCATION`, `WORLD_NOT_RUNNING`, `KERNEL_CONFLICT`; resource/funds reasons remain part of the shared validator taxonomy |
|   4 | SLEEP rejection reasons     | Same shared Kernel taxonomy; PRE-AL-05 semantic location/busy failures resolve to `KERNEL_INVALID_LOCATION` or `KERNEL_INVALID_ACTION`                                                                                |
|   5 | Conflict reason             | Durable `CONFLICT / KERNEL_CONFLICT` for stale actor/runtime version or other fenced stale state                                                                                                                      |
|   6 | Idempotency conflict        | Same world/key with a different fingerprint is call disposition `IDEMPOTENCY_CONFLICT`; no new outcome and no new key                                                                                                 |
|   7 | Duplicate                   | Same fingerprint reuses the original request/outcome as `REUSED`; it does not execute again                                                                                                                           |
|   8 | Transport timeout           | No prior durable Kernel status; PRE-AL-06 adds a policy-layer `TIMED_OUT` recovery signal, not a Kernel status                                                                                                        |
|   9 | Executor exception          | Existing transaction boundary rolls back and throws an executor/store error; it does not fabricate a Kernel outcome                                                                                                   |
|  10 | Permanent failures          | Invalid action, missing actor, invalid location; authorization is terminal separately                                                                                                                                 |
|  11 | Stale observation           | `CONFLICT / KERNEL_CONFLICT` maps to `STALE_STATE` and requires a new observation                                                                                                                                     |
|  12 | Temporary world-state       | `NOT_DUE` maps to `TEMPORARY_NOT_DUE`; resource shortage maps to `RESOURCE_UNAVAILABLE`                                                                                                                               |
|  13 | Same-request reconciliation | Only `TIMED_OUT`, using original request ID/key and a world-scoped durable lookup result                                                                                                                              |
|  14 | Blind retry                 | No generic retry path; only timeout with `NOT_FOUND` reconciliation and remaining submission budget                                                                                                                   |
|  15 | REOBSERVE                   | Only stale conflict; consumes conflict recovery budget                                                                                                                                                                |
|  16 | REPLAN                      | Permanent/resource failure only when an alternative candidate is explicitly available; consumes replan budget                                                                                                         |
|  17 | STOP                        | Unknown/internal/authorization/world-not-running/idempotency errors, no feasible permanent alternative, unavailable reconciliation, and exhausted budgets                                                             |
|  18 | Goal stability              | Existing M3-T03 active-goal switch margin remains unchanged; PRE-AL-06 only bounds same-cycle recovery                                                                                                                |
|  19 | Existing counters           | No prior runtime attempt budget; PRE-AL-06 adds ephemeral submission/conflict/replan counters                                                                                                                         |
|  20 | Decision-cycle identity     | No durable ID; one policy input/recovery sequence is the ephemeral cycle scope                                                                                                                                        |
|  21 | Persistence                 | Not required; no crash-recovery workflow is created                                                                                                                                                                   |
|  22 | Migration                   | None                                                                                                                                                                                                                  |
|  23 | World Event                 | None                                                                                                                                                                                                                  |
|  24 | Production dependency       | None                                                                                                                                                                                                                  |
|  25 | Minimal contract            | `FailureClass`, `ActionRecoverySignal`, `DecisionAttemptBudget`, `ReplanPolicyInput`, `ReplanDecision`                                                                                                                |
|  26 | Test plan                   | Contract matrix, policy matrix, timeout ambiguity, budget exhaustion, determinism, immutability, finite-failure harness, full regression and clean PostgreSQL                                                         |

## Gate decision

`CASE A`：Failure Classification、Replan Decision、bounded budgets 和
World-Time reconsideration 可以在不实现 scheduler、完整 M3-T04 或自动
resident loop 的前提下独立成立，因此继续实现。本轮没有进入被阻止的
Action Loop 范围。

## Contract and policy

### Kernel outcome and call disposition taxonomy

The existing Kernel durable taxonomy remains unchanged:

```text
KernelActionOutcome.status = COMMITTED | REJECTED | CONFLICT
call disposition          = EXECUTED | REUSED | IDEMPOTENCY_CONFLICT
resident completion       = EXECUTED | REUSED | NOT_DUE | REJECTED
transport recovery        = TIMED_OUT (policy signal only)
```

`DUPLICATE` is the existing persistence/request concept; the public outcome
disposition is `REUSED`. `TIMED_OUT` is never accepted by the durable
KernelActionOutcome schema.

### FailureClass and FailureClassifier

`packages/life-engine/src/replan-policy.ts` maps the current formal reasons:

| Source                                                                       | FailureClass           |
| ---------------------------------------------------------------------------- | ---------------------- |
| `COMMITTED`, including `REUSED` committed outcome                            | `SUCCESS`              |
| `CONFLICT / KERNEL_CONFLICT`                                                 | `STALE_STATE`          |
| `KERNEL_INVALID_ACTION`, `KERNEL_ACTOR_NOT_FOUND`, `KERNEL_INVALID_LOCATION` | `PERMANENT_INVALID`    |
| `KERNEL_PERMISSION_DENIED`                                                   | `AUTHORIZATION`        |
| `KERNEL_INSUFFICIENT_RESOURCE`, `KERNEL_INSUFFICIENT_FUNDS`                  | `RESOURCE_UNAVAILABLE` |
| `WORLD_NOT_RUNNING`                                                          | `WORLD_NOT_RUNNING`    |
| `NOT_DUE`                                                                    | `TEMPORARY_NOT_DUE`    |
| `IDEMPOTENCY_CONFLICT`                                                       | `IDEMPOTENCY_ERROR`    |
| executor error                                                               | `INTERNAL_ERROR`       |
| unknown error                                                                | `UNKNOWN_FAILURE`      |

An unrecognized future Kernel reason falls through to `UNKNOWN_FAILURE` rather
than defaulting to retry.

### ReplanDirective matrix

| Outcome/disposition                                      | Directive                                                            | Budget effect        | World Event / worldSeq                 |
| -------------------------------------------------------- | -------------------------------------------------------------------- | -------------------- | -------------------------------------- |
| `COMMITTED` or `REUSED` with committed outcome           | `SUCCESS`                                                            | none                 | none / unchanged                       |
| `CONFLICT / KERNEL_CONFLICT`                             | `REOBSERVE_NOW` until recovery limit; then `STOP / BUDGET_EXHAUSTED` | conflict recovery +1 | none / unchanged                       |
| Permanent invalid with alternative                       | `REPLAN_NOW` until replan limit; then `STOP / BUDGET_EXHAUSTED`      | replan +1            | none / unchanged                       |
| Permanent invalid without alternative                    | `STOP / NO_FEASIBLE_ALTERNATIVE`                                     | none                 | none / unchanged                       |
| Resource unavailable with alternative                    | bounded `REPLAN_NOW`                                                 | replan +1            | none / unchanged                       |
| Resource unavailable without alternative                 | `DEFER_UNTIL_WORLD_TIME`                                             | no submission retry  | none / unchanged                       |
| `NOT_DUE` before due World Time                          | `DEFER_UNTIL_WORLD_TIME` at `dueAtWorldTime`                         | no submission retry  | none / unchanged                       |
| `IDEMPOTENCY_CONFLICT`                                   | `STOP / IDEMPOTENCY_ERROR`                                           | none                 | none / unchanged                       |
| `TIMED_OUT` + found outcome                              | consume/reclassify found outcome                                     | none                 | depends only on found existing outcome |
| `TIMED_OUT` + no outcome                                 | one `RETRY_SAME_REQUEST` while budget remains                        | submission +1        | none / unchanged                       |
| `TIMED_OUT` + reconciliation unavailable                 | `STOP / RECONCILIATION_REQUIRED`                                     | none                 | none / unchanged                       |
| authorization, world stopped, executor/internal, unknown | `STOP`                                                               | none                 | none / unchanged                       |

## Decision Cycle and budgets

A Decision Cycle is an ephemeral scope for one observation-to-terminal/defer
recovery sequence. It is not a durable workflow identity and does not cross a
resident's lifetime. The v1 policy centralizes:

```text
maxSubmissionAttempts = 2
maxConflictRecoveries  = 2
maxReplans             = 2
```

`RETRY_SAME_REQUEST` returns both the original `requestId` and original
`idempotencyKey`. It cannot mint a replacement key. `REOBSERVE_NOW` and
`REPLAN_NOW` are separate directives, and the latter is only emitted when an
alternative candidate is explicitly available.

## Timeout reconciliation and read boundary

PRE-AL-01 already exposes `findKernelActionOutcome` and its transaction-scoped
world/request lookup. PRE-AL-06 does not add another read API. The policy
contract accepts a reconciliation result:

- `FOUND`: the result must match the timed-out `requestId` and `worldId`, then
  the existing outcome is consumed;
- `NOT_FOUND`: retrying the same request/key is allowed only under the
  submission budget;
- `UNAVAILABLE`: stop and require reconciliation.

This covers caller timeout with a committed Kernel outcome without duplicate
events, and caller timeout where no durable outcome exists without a blind new
operation. A found rejected/conflict outcome is still consumed and classified
by the normal Kernel taxonomy.

## MOVE / SLEEP failure matrix

PRE-AL-06 does not change PRE-AL-05. Invalid destination, illegal semantic
location, busy resident, stale runtime version and world pause behavior remain
Kernel-owned. The policy consumes their existing outcomes:

| PRE-AL-05 condition                               | Existing signal                      | PRE-AL-06 decision                                             |
| ------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| invalid MOVE destination / illegal SLEEP location | `REJECTED / KERNEL_INVALID_LOCATION` | replan only with explicit alternative; otherwise stop          |
| busy MOVE/SLEEP resident                          | `REJECTED / KERNEL_INVALID_ACTION`   | permanent invalid handling                                     |
| stale runtime/action version                      | `CONFLICT / KERNEL_CONFLICT`         | reobserve with bounded conflict budget                         |
| completion before due                             | `NOT_DUE` with due World Time        | defer to due World Time                                        |
| paused/maintenance world                          | `REJECTED / WORLD_NOT_RUNNING`       | stop; no wall-clock retry                                      |
| duplicate start/completion                        | `REUSED` original outcome            | success or classification of original outcome; no re-execution |

## World Time, determinism, and replay

Resource reconsideration uses the explicit input World Time and deterministic
delay `min(60, 2 * 2^replans)`; completion deferral uses the explicit Kernel
`dueAtWorldTime`. No `Date.now()`, timer, sleep, random number, LLM or
unordered input participates. Paused/maintenance World Time remains governed by
the existing World Clock and does not progress because of this policy.

Policy decisions and counters are orchestration state, not World Facts. They do
not append events, advance `worldSeq`, mutate runtime/resources, or alter M2
Replay. Future simulation reruns can feed the same outcome sequence and budget
to obtain the same directives; authoritative replay remains committed facts.

## Persistence, dependencies, and scope audit

- Production dependency changes: none; `pnpm-lock.yaml` unchanged.
- Schema/migration changes: none.
- World Event/Event Registry changes: none.
- Life Engine writes: none.
- Scheduler/driver/worker/automatic resident loop: none.
- M3-T04, 30×30 simulation, M5 Agent Runtime and M4/M6/M7 work: not executed.

## Performance

The implementation is pure in-memory schema/policy work. Existing unit tests
exercise 1000 synthetic permanent failures and prove finite terminal
convergence; no production SLA or benchmark claim is made.

## Verification evidence

| Check                                                              | Result                                                                  |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                   | PASS                                                                    |
| `pnpm lint`                                                        | PASS                                                                    |
| `pnpm typecheck`                                                   | PASS                                                                    |
| `pnpm test`                                                        | PASS; contracts 36, life-engine 38, world-kernel 43, db 6, API 6, web 3 |
| `pnpm build`                                                       | PASS                                                                    |
| clean PostgreSQL double `db:setup`                                 | PASS; disposable DB, removed after verification                         |
| clean PostgreSQL integration                                       | PASS; M2 4/4 and PRE-AL-01～05 suites all passed                        |
| official `pnpm audit --prod --registry=https://registry.npmjs.org` | PASS; no known vulnerabilities, HIGH=0, CRITICAL=0                      |
| contract/policy matrix                                             | PASS; contracts 36 and life-engine 38 tests                             |
| 1000 synthetic failures                                            | PASS; terminal within bounded policy steps                              |

## Red-line audit

The PRE-AL-06 diff contains no scheduler, timer, worker loop, M3-T04,
automatic resident decision loop, LLM, Life Engine DB write, World Event,
wall-clock retry, unbounded retry loop, or `catch { retry() }`. No migration,
new dependency, ActionOutcome schema mutation, or MOVE/SLEEP semantic change
was made.

## P0/P1/P2/P3 and remaining blockers

- P0: `0`.
- P1 closed by this task: bounded replan/failure policy contract and
  classification boundary.
- P1 remaining: PRE-AL-07 Scheduler/Simulation Driver and the full resident/
  domain replay / 30×30 readiness gate.
- `M3-T04` remains `BLOCKED_BY_PRE_ACTION_LOOP_GATE` until its official
  ActionRequest/result-driven deterministic integration boundary is explicitly
  re-gated.
- P2: `causation_id` and fine-grained versioned event payload schema remain
  existing follow-ups.
- P3: existing documentation manifest mismatch and external Node.js 20 action
  warning remain unchanged.

## Git and remote CI

- Implementation commit: pending local commit and remote CI verification.
- Final main HEAD: pending remote CI verification.
- `HEAD == origin/main`: required before push and rechecked after push.
- Worktree: required clean after commit.
- GitHub Actions: pending; this is why the current report status is
  `IMPLEMENTED_UNVERIFIED`.

## State synchronization gate

Only after the implementation commit's complete GitHub Actions run is green,
this report may be updated to `PRE-AL-06 = PASS`, and `docs/PROJECT_STATE.md`
and `MEMORY.md` may record the formal PASS. The next allowed task is only
`PRE-AL-07` (or a blocker audit result); it must not be executed in this task.
