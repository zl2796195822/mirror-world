# M3-T04 Verification Report (RETRY)

## Result

`M3-T04 = PASS`。`M3 = IN_PROGRESS`。

本任务实现了正式 Rule Decision Maker 与 bounded Action Loop 闭环，证明一个
Resident 可从真实 Observation 出发，经 Needs → Goals → Candidate →
Decision → ActionRequest → World Kernel → KernelActionOutcome → Replan →
Scheduler due completion 再次 Observation。本任务没有执行 30×30 autonomous
simulation、full resident projection replay、PRE-AL-GATE 或任何后续 M4+ 任务。

## Task and baseline

- Task ID: `M3-T04` RETRY
- Official Task Name: 规则决策器
- Policy versions: `m3-rule-decision-v1`, `m3-action-loop-v1`
- Starting origin/main: `2e526d3b22209ba949584abf4e1f9505a7469e37`
- Starting branch: `main` (`HEAD == origin/main`, worktree clean)
- Implementation commit: `c32c0c941d979c7cb25c67fd56e265865b4b6070`
- Docs sync commit: `87b5d79c8923c894dc5b78f65a50ed24547522c3`
- Worktree: `/Users/alin/AI项目/mirror-world-m3-t04-retry`
- Branch: `task/m3-t04-rule-decision-maker-retry`
- Readiness at start: `M3-T04 readiness = READY_TO_RETRY`
- Formal status at start: `M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE`

## Retry Readiness Review

| Field                                             | Value                                                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CURRENT M3 STATUS                                 | `IN_PROGRESS`                                                                                                                                               |
| CURRENT M3-T04 STATUS                             | `BLOCKED_BY_PRE_ACTION_LOOP_GATE` / `READY_TO_RETRY`                                                                                                        |
| PRE-AL-07 STATUS                                  | `PASS`                                                                                                                                                      |
| M3-T04 READINESS                                  | `READY_TO_RETRY`（原实现 blocker 已由 PRE-AL-01～07 关闭）                                                                                                  |
| CURRENT BLOCKERS for rule decision implementation | none remaining among outcome/Observation/ActorRef/resource/MOVE-SLEEP/replan/scheduler                                                                      |
| REQUIRED CONTRACTS                                | Action Contract、KernelActionOutcome、Observation、ActorRef、ResourceReadPort、runtime states、MOVE/SLEEP lifecycle、replan policy、scheduler/driver 均存在 |
| NEXT ALLOWED FORMAL TASK                          | 本会话正式授权任务为 M3-T04 RETRY                                                                                                                           |

PRE-AL-GATE remaining items（lease/fence、typed event registry、resident
projection replay、manifest/canonical hash、full 30×30 evidence）继续保留为
后续 Gate，不在本任务内顺手关闭。

## Gap found

| Component                 | Status before          | Status after                                     |
| ------------------------- | ---------------------- | ------------------------------------------------ |
| Needs evaluator           | EXISTS                 | reused                                           |
| Goals evaluator           | EXISTS                 | reused                                           |
| Candidate generation      | MISSING                | added pure `evaluateRuleDecision`                |
| Hard constraints + score  | MISSING                | added deterministic policy `m3-rule-decision-v1` |
| ActionRequest builder     | MISSING                | added stable draft → formal ActionRequest        |
| Action Loop orchestration | MISSING                | added `runResidentActionLoopStep`                |
| Outcome feedback          | EXISTS (PRE-AL-01)     | consumed via submission port                     |
| Replan                    | EXISTS (PRE-AL-06)     | consumed, not rewritten                          |
| Scheduler/driver          | EXISTS (PRE-AL-07)     | reused for due completion                        |
| Observation refresh       | EXISTS (PRE-AL-02～04) | reused after each Kernel transition              |

## Contracts reused

- `@mirror/contracts` ActionRequest / KernelActionOutcome / replan / observation / scheduler
- `@mirror/life-engine` `m3-needs-v1`, `m3-goals-v1`, `m3-replan-v1`
- `@mirror/world-kernel` `executeResidentActionRequest`, `createPostgresObservationQuery`, `createDeterministicSimulationDriver`
- `@mirror/db` T01 30-resident seed, first-street fixtures, runtime bootstrap
- No second Kernel, Life Engine, Scheduler, Event Ledger, or resident-state authority

## Rule Decision Pipeline

```text
Observation
  → Needs (anchor + world time)
  → Goals (selectedGoal)
  → bounded Candidate Actions
  → Hard Constraints (advisory pre-filter)
  → deterministic Score
  → selected Candidate
  → ActionRequest draft → formal ActionRequest
  → World Kernel
  → KernelActionOutcome
  → Replan Policy
  → next due/wake (Scheduler owns WHEN)
```

Hard constraints used in `m3-rule-decision-v1`:

- `WORLD_RUNNING`
- `RESIDENT_IDLE`
- `GOAL_PRESENT`
- `DESTINATION_KNOWN` / `DESTINATION_DIFFERS` (MOVE)
- `SLEEP_HOME_ONLY` (SLEEP)
- `GOAL_HAS_ACTION_PATH`

Score is advisory only. Kernel remains final legality authority.

## Candidate model

Executable M3 v1 candidates are limited to current Kernel resident lifecycle:

- `MOVE { destinationId }`
- `SLEEP {}`

Goal mapping:

- `REST`: MOVE home if away; SLEEP if already home
- `RETURN_HOME`: MOVE home if away
- `FULFILL_WORK_OBLIGATION`: MOVE workplace if away
- `SATISFY_HUNGER` / `MAKE_SOCIAL_CONTACT`: no executable EAT/TALK lifecycle yet → infeasible candidates + bounded defer

This is intentional: M3-T04 does not invent EAT/WORK/TALK/BUY lifecycle or Economy.

## Determinism

- No `Math.random`, wall-clock domain time, LLM, external API, or unstable iteration
- Candidate sort: feasible desc → score desc → stable key asc
- Request/idempotency identity: SHA-256 stable derivation with UUID version/variant bits
- Same world time / resident / observation / needs / goal / decision epoch → same candidate order and selection
- `PAUSED` / `MAINTENANCE` produce no action (`WORLD_NOT_RUNNING`)

## Outcome integration

Submission port returns formal `KernelActionOutcome`:

- `COMMITTED` → `SUCCESS` replan; runtime activity start is durable via Kernel
- `REJECTED` → classified through PRE-AL-06 (example: `KERNEL_INVALID_ACTION` → `PERMANENT_INVALID` → `STOP` / `NO_FEASIBLE_ALTERNATIVE` when no alternative)
- `CONFLICT` → PRE-AL-06 `STALE_STATE` path
- missing outcome → treated as timeout/reconciliation path, not faked as durable Kernel result

## Bounded replan

Reuses `m3-replan-v1` only. No new failure policy. Idle/no-feasible path uses
deterministic world-time defer (`DEFER_UNTIL_WORLD_TIME`) with policy delay.

## Scheduler / due / wake boundary

- Scheduler/driver still owns WHEN and MOVE/SLEEP due completion
- Decision loop does not become a second scheduler
- After COMMITTED start, resident becomes busy until Kernel completion
- After completion, Observation refresh sees IDLE + new location/anchors inputs
- Sleep completion updates need anchors through existing pure adapter

## Isolation

- World isolation: decision and ActionRequest carry one `worldId`
- Resident isolation: anchors and observation are resident-scoped
- Integration asserts ActionRequest never targets another world

## Files changed

- `packages/life-engine/src/rule-decision.ts` (new)
- `packages/life-engine/src/rule-decision.test.ts` (new)
- `packages/life-engine/src/action-loop.ts` (new)
- `packages/life-engine/src/action-loop.test.ts` (new)
- `packages/life-engine/src/index.ts` (exports)
- `apps/api/package.json` (`@mirror/life-engine` workspace dep + integration script)
- `apps/api/scripts/resident-action-loop.integration.test.mjs` (new)
- `pnpm-lock.yaml` (workspace dependency edge only)
- `docs/verification/M3-T04-report.md` (this report)
- `docs/PROJECT_STATE.md`, `MEMORY.md` (state sync)

## Tests

| Suite                         | Result                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------- |
| life-engine unit              | 56/56 PASS（含新增 rule-decision 12 + action-loop 6）                        |
| contracts unit                | 45/45 PASS                                                                   |
| world-kernel unit             | 46/46 PASS                                                                   |
| db unit                       | 6/6 PASS                                                                     |
| web unit                      | 3/3 PASS                                                                     |
| api contract                  | 6/6 PASS                                                                     |
| M2 + PRE-AL integration       | PASS（clock/event/replay/request/outcome/observation/runtime/action/driver） |
| M3-T04 PostgreSQL integration | 3/3 PASS                                                                     |
| lint / prettier               | PASS                                                                         |
| typecheck                     | PASS                                                                         |
| build                         | PASS                                                                         |
| official production audit     | PASS；HIGH=0，CRITICAL=0                                                     |

### Clean PostgreSQL evidence

Disposable PostgreSQL 18.6 (`m3-t04-pg`, port 55432) was used for formal
integration. Migrations + seed applied via `pnpm db:setup`. New M3-T04 tests:

1. Observation → REST decision → Kernel MOVE home → driver completion → SLEEP start → driver completion → rest-anchor update → next decision
2. Away-from-home REST maps to MOVE (not illegal SLEEP)
3. World isolation of decision/request identity

Disposable database was removed after verification.

## Replay / 30×30 boundaries

- Replay boundary: this is not Full Replay PASS. M2 generic replay remains
  unchanged. Resident projection replay / typed reducers / manifest hash stay
  open.
- 30×30 boundary: this is not 30 residents × 30 world days autonomous Gate.
  `M3-T04 PASS ≠ M3 PASS`.

## PENDING items (not claimed)

- `PENDING_REPLAY_CONTRACT`: durable decision-evidence table / full decision replay schema not added
- `PENDING_NEED_ANCHOR_DURABILITY`: need anchors are in-memory loop state, resettable from sleep adapter; no new migration
- PRE-AL-GATE remaining: lease/fence owner, typed event registry, resident projection replay, SimulationManifest, full 30×30 evidence
- EAT/WORK/TALK/BUY lifecycle and Economy remain non-goals

## Formal state update

- `M3-T04 = PASS`
- `M3 = IN_PROGRESS`
- `NEXT_ALLOWED_FORMAL_TASK = PRE-AL-GATE`（或正式 audit 发现的额外 P1）

本任务完成后停止，不执行 PRE-AL-GATE、30×30、Full Replay Gate、M3 next task、M4+。
