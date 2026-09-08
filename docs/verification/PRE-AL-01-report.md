# PRE-AL-01 Verification Report

## Task

- Task ID: `PRE-AL-01`
- Task name: Kernel Action Outcome / Execution Feedback
- Initial main HEAD: `1fe3fe4a9ec0ce98b53f246633a73726e7391a52`
- Initial `HEAD == origin/main`: yes
- Initial worktree: clean
- Scope: `ActionRequest → World Kernel → KernelActionOutcome`

## Original goal and DoD

为一次 ActionRequest 建立正式、稳定、幂等、可查询的 Kernel execution
feedback，使调用方能够知道请求是成功、被拒绝还是版本冲突，并能够追溯该请求
实际产生的 `0 / 1 / N` 个权威 World Events。

DoD：

- `KernelActionOutcome` durable contract 只表达 Kernel execution outcome；
- 成功请求与其实际提交的全部 World Events 原子关联；
- rejected/conflict 不产生世界事实、不推进 world seq；
- 并发重复提交只执行一次，相同请求重试可复用结果；
- 同一 idempotency key 在不同 world 之间隔离；
- executor exception 回滚事务，不伪造 `TIMED_OUT`；
- 契约、PostgreSQL integration、全仓回归、audit 与 GitHub Actions 全部通过。

## Formal outcome model

Durable execution status 只有：

- `COMMITTED`: 至少一个 World Event 已在同一 transaction 提交；
- `REJECTED`: Kernel 拒绝，零事件；
- `CONFLICT`: Kernel 发现版本冲突，零事件。

调用处置与执行状态严格分离：

- `EXECUTED`: 本次调用创建了 durable outcome；
- `REUSED`: 相同 fingerprint 的重试复用既有 outcome；
- `IDEMPOTENCY_CONFLICT`: 相同 world/key 的 fingerprint 不同，不创建第二个 outcome；
- executor 抛错：transaction rollback，由 transport/agent 层处理，不落
  `TIMED_OUT`。

## Implementation

- `packages/contracts/src/action-outcome-contract.ts` 新增严格的
  `KernelActionOutcome` schema、reason codes、0/1/N event references、seq range
  与 `TIMED_OUT` 禁止规则。
- `packages/world-kernel/src/action-outcome-store.ts` 新增正式执行入口、结果查询、
  validation rejection/conflict 持久化、同事务 outcome/event link 写入和重试复用。
- `packages/world-kernel/src/action-request-store.ts` 抽出事务内 request ensure，
  保留 M2-T03 既有 persistence 行为。
- `packages/world-kernel/src/world-events-store.ts` 新增同事务多事件提交；保留既有
  单事件 API 与 `.event` 兼容结果，同时返回 `.events`。
- `packages/db/src/schema.ts` 新增 `kernel_action_outcomes` 与
  `kernel_action_outcome_events`，并增加 request/event world-scoped 复合约束。
- 新增 migration `0005_previous_fabian_cortez.sql` 与
  `0006_absurd_stephen_strange.sql`。
- 新增 ADR：`docs/adr/ADR-0008-pre-al-01-kernel-action-outcome.md`。

## Persistence and event impact

Outcome、event links、World Events 与 `worlds.world_seq` 均在同一 PostgreSQL
transaction。World row lock 下按顺序写入多个 event，保持 world-local seq 连续。
关联表使用 `eventIndex + eventId + eventSeq`，不使用单一
`committed_event_id`；复合外键保证 outcome、event 与 world 一致。

`REJECTED` 和 `CONFLICT` 只写 request metadata 与 outcome，不写 World Event，
不改变 world seq。World Event Ledger 仍 append-only；本任务没有修改 Replay，Replay
仍读取已经提交的历史事件，不重新执行 Life Engine 或 ActionRequest。

## Concurrency and isolation

PostgreSQL `(world_id, idempotency_key)` 唯一约束负责并发登记；相同 fingerprint
的并发调用在唯一约束等待后只有一个 executor 进入，后续调用读取既有 outcome。
不同 fingerprint 返回 `IDEMPOTENCY_CONFLICT`。Outcome、request、event link 和
event 的 world 由复合关系约束隔离；相同 key 可以在不同 world 独立执行。

## Explicitly out of scope

本任务没有实现 Observation/query boundary、Resident↔ActorRef、Resource Bridge、
MOVE/SLEEP duration、bounded replan、scheduler/simulation driver、M3-T04、M4、M5
或 M6。没有新增 production dependency、LLM、Action Loop 或 API route。

## Verification

| Check                                   | Result                                                     |
| --------------------------------------- | ---------------------------------------------------------- |
| `pnpm install --frozen-lockfile`        | PASS                                                       |
| `pnpm lint`                             | PASS                                                       |
| `pnpm typecheck`                        | PASS, 9/9 Turbo tasks                                      |
| `pnpm test`                             | PASS, 9/9 Turbo tasks                                      |
| `pnpm build`                            | PASS, 6/6 Turbo tasks                                      |
| clean PostgreSQL `db:setup` twice       | PASS, migrations 0000–0006                                 |
| M2 PostgreSQL integration               | PASS, 4/4: clock, ledger, replay/checkpoint, ActionRequest |
| PRE-AL-01 PostgreSQL integration        | PASS, 1/1: ActionOutcome                                   |
| M3-T01/T02/T03 regression               | PASS through full unit suite                               |
| official npm registry production audit  | PASS, HIGH=0, CRITICAL=0                                   |
| production dependency / lockfile change | none                                                       |

The ActionOutcome integration covers durable query, 0/1/N events, rejection,
version conflict, concurrent duplicate submission, idempotency conflict, cross-world
same-key isolation, world sequence isolation, and executor exception rollback.

## P0/P1/P2/P3

- P0: 0 introduced.
- P1: Observation/query boundary, ActorRef integration, Resource Bridge,
  MOVE/SLEEP semantics, bounded replan and scheduler remain required before a runtime
  Action Loop; they are not silently implemented here.
- P2: future domain event payload evolution and causation details remain open under the
  existing project findings.
- P3: document manifest filename/count mismatch remains unrelated.

## GitHub Actions and final state

- Implementation commit: `58b81b30b9f05404084421708381c1ff1409e747`
- GitHub Actions: [foundation-ci run 34232707578](https://github.com/zl2796195822/mirror-world/actions/runs/34232707578), `Success`
- CI-verified implementation HEAD: `58b81b30b9f05404084421708381c1ff1409e747`
- Status synchronization: `PROJECT_STATE.md` and `MEMORY.md` now record `PRE-AL-01 = PASS` and the next allowed task only.
- Worktree status before this documentation commit: clean.

## Project state and next task

The green implementation workflow has been verified; state synchronization records:

- `PRE-AL-01 = PASS`
- `M3 = IN_PROGRESS`
- `M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE`
- Main CI baseline remains `GREEN`
- Next allowed task: `PRE-AL-02 · Observation / Query Boundary`

No next task is being started by this report.
