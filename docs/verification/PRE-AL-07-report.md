# PRE-AL-07 Verification Report

## Result

`PRE-AL-07 = PASS`。本任务只建立 deterministic scheduler / simulation
driver 的 formal gate；没有执行 M3-T04、30×30 autonomous simulation、
PRE-AL-GATE 或任何后续 M4-M7 任务。

## Task and baseline

- Task ID: `PRE-AL-07`
- Task name: `Deterministic Scheduler / Simulation Driver`
- Original main HEAD: `b3229aef5b820fc261443c7f6d8a50f9c3b473c6`
- Starting branch: `main`
- Starting `HEAD == origin/main`: `yes`
- Research input: `RES-M3-003@46511b78f75b1250c780059402879e67598c2f93`, read-only,
  `FREEZE = ON`
- Gate decision: `CASE A`
- Policy version: `m3-scheduler-v1`

## Scheduler Audit

|   # | Audit question               | Formal current-main answer                                                                                                                                           |
| --: | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | World Time authority         | `worlds.world_time`，通过 World Clock / Kernel 读取和写入。                                                                                                          |
|   2 | How World Time advances      | `advanceWorldTimeTo` 在锁定 world row 的 Kernel transaction 中推进；running advance 写既有 `WORLD_TIME_ADVANCED` event。                                             |
|   3 | PAUSED / MAINTENANCE         | 目标时间相同为 `NO_OP`；目标时间更早拒绝；非-running 返回 `BLOCKED`，不推进 domain time。                                                                            |
|   4 | MOVE due state               | `resident_runtime_states` 的 `TRAVELING + activity_due_at_world_time`。                                                                                              |
|   5 | SLEEP due state              | `resident_runtime_states` 的 `SLEEPING + activity_due_at_world_time`；PRE-AL-05 固定 480 World Minutes。                                                             |
|   6 | Activity identity            | `activity_instance_id` 与对应 MOVE/SLEEP `action_requests.id` 一致。                                                                                                 |
|   7 | Completion boundary          | `completeResidentAction`，由 World Kernel 控制 transaction、outcome、event 和 runtime transition。                                                                   |
|   8 | Duplicate completion         | 完成后 runtime 不再是 due activity；重复处理返回无 work，既有 outcome 可安全复用，state fence 防止旧 work item 覆盖新状态。                                          |
|   9 | PRE-AL-06 defer structure    | `ReplanDirective.DEFER_UNTIL_WORLD_TIME` 携带明确 `dueAtWorldTime`；scheduler 接受同一 World Time 语义的 `DEFERRED_REPLAN` registration。                            |
|  10 | Durable defer need           | 需要跨 scheduler restart 保留的 deferred wake 使用 durable registration；纯 step output 仍是 orchestration result。                                                  |
|  11 | Due source                   | runtime activity due projection 与 `scheduled_wake_registrations`。两者均按 world 查询。                                                                             |
|  12 | Scheduler stub / global tick | 没有既有 scheduler stub，也没有 global tick。                                                                                                                        |
|  13 | Timer domain dependency      | 没有 `setInterval`、`setTimeout`、`Date.now()` 或 wall-clock due decision。                                                                                          |
|  14 | Database table               | 仅为 durable deferred wake 与 due lookup index 新增最小 schema；没有 generic jobs/retry/queue table。                                                                |
|  15 | Redis / queue dependency     | 不需要 Redis、BullMQ 或其它 distributed queue。                                                                                                                      |
|  16 | World Event impact           | 仅复用 World Clock 与 PRE-AL-05 lifecycle events；scheduler 自身不写 `SchedulerStarted`、`WakeGenerated` 或 `TickProcessed`。                                        |
|  17 | Stable fields                | due World Time、resident UUID bytes、wake reason、decision epoch；最终 tie-break 使用 activity/wake identity。                                                       |
|  18 | Crash rebuild                | 清空内存 work list 后，从 active runtime rows 和 durable wakes 重新 query，结果不丢。                                                                                |
|  19 | Executable scope             | 只执行 due MOVE/SLEEP completion；decision wake 只输出，不选择或提交 Action。                                                                                        |
|  20 | Future wake-only scope       | `DEFERRED_REPLAN`、`INITIAL_DECISION`、`WORK_BOUNDARY` 只生成/返回 wake item，未来由 Decision boundary 消费。                                                        |
|  21 | Advance/process order        | 先将 World Time 推到显式 target，再处理 `due <= target`；completion phase 先于 decision-wake phase。                                                                 |
|  22 | 30×30 requirement            | 本任务只做 30-resident scheduler validation；完整 43,200-minute life simulation 与 Gate 保持后续。                                                                   |
|  23 | Test plan                    | contract、ordering、due query、MOVE/SLEEP、exact due、requery、durable wake、pause/maintenance、world isolation、bounded batch、30-resident integration 与全仓回归。 |

## Scheduler architecture

```text
Scheduler / Driver = WHEN
Life Engine         = WHAT
World Kernel        = CAN / COMMIT
```

`DeterministicSimulationDriver` 是围绕真实 World Clock、durable due source
和 Kernel completion boundary 的调用适配器。它不实现 Needs/Goals，不产生
selected action，不提交新的 ActionRequest，不拥有 world truth。

### Driver API and step result

正式 surface 为：

- `advanceWorldBy(worldId, worldMinutes)`
- `advanceWorldTo(worldId, targetWorldTime)`
- `runUntil(worldId, targetWorldTime)`
- `runForDays(worldId, days)`
- `processDueWork(worldId, options)`
- `processDueActivities(worldId, options)`
- `collectDueWork(worldId)`

`SchedulerStepResult` 是 machine-readable orchestration output，不是 World
Event，包含 `from/to World Time`、`from/to worldSeq`、processed/completed
counts、Kernel outcomes、wake items、failure items 和 `nextDueWorldTime`。

## Work contract and stable ordering

`m3-scheduler-v1` 定义两类 work：

| Work type             | Current behavior                                                   |
| --------------------- | ------------------------------------------------------------------ |
| `ACTIVITY_COMPLETION` | 绑定 activity instance；只用于 due TRAVELING/SLEEPING completion。 |
| `DECISION_WAKE`       | 绑定 wake reason；不携带 selected action，不执行 T04。             |

同一 phase 内排序为：

```text
(dueWorldTime, residentId UUID bytes, wakeReason, decisionEpoch, stable identity tie-break)
```

phase 顺序固定为：

```text
1. ACTIVITY_COMPLETION
2. DECISION_WAKE
```

因此同一 timestamp 的 completed activity 先让 Kernel 改变 runtime 并产出
completion outcome，再返回 decision wake；不会让未来 Decision 先观察到仍为
`SLEEPING` 或 `TRAVELING` 的 state。实现不依赖 Promise completion order、DB
insert order 或 locale-sensitive ordering。

## DueActivityReadPort and wake boundary

`DueActivityReadPort` 是 world-scoped、read-only、bounded query boundary：
只查询 `TRAVELING/SLEEPING`、非空 activity identity、非空 due time 且
`due <= targetWorldTime` 的 runtime rows，默认最大 batch 为 30。数据库使用
`(world_id, current_activity, activity_due_at_world_time)` index，并提供同一
durable source 的 next-due query；不会在 JavaScript 中扫描全表或为每个
resident 单独 due query。

`scheduled_wake_registrations` 是最小 deferred-wake projection，以
`(world_id, dedupe_key)` 唯一约束去重，并保留 source state/world sequence、
decision epoch 与 policy version。当前不 ack/delete：未来 Decision layer
拥有消费确认；重复读取是安全的 at-least-once wake delivery，不产生 World
Fact。

## World Time, MOVE/SLEEP completion, and idempotency

`advanceWorldTimeTo` 锁定目标 world。当前时间返回 `NO_OP`，回拨返回
`WORLD_TIME_REWIND`，`PAUSED/MAINTENANCE` 返回 `BLOCKED`；running advance
通过既有 Event Ledger / Kernel transaction 写入 `WORLD_TIME_ADVANCED`。显式
target 是 domain input；runner 的 wall-clock 不是 domain schedule。

MOVE due item 传入真实 `completeResidentAction`，由 Kernel 在一次事务内
完成 destination、`IDLE`、state version、completion event 和
`KernelActionOutcome`。SLEEP 同样走该 boundary，并由 PRE-AL-05 的固定
480-minute semantics 生成 rest-anchor transition；driver 不直接更新
location、activity、resource 或 anchor。

completion operation 使用 action/request identity 和 `expectedStateVersion`
fence。完成后的 active due row 被清除，重复 `processDueWork` 不产生第二个
completion event、worldSeq、state version 或 rest-anchor transition。Kernel
outcome 的 event refs 必须同 world、event index 保序且 seq 严格递增；不同
resident 的交错 commit 可以产生合法 seq gap。

## Wake reasons and deferred replan

当前 wake reasons 为：

- `ACTIVITY_COMPLETED`：Kernel completion 成功后由 step result 返回；
- `DEFERRED_REPLAN`：PRE-AL-06 defer 的 durable registration；
- `INITIAL_DECISION`：未来初始 decision boundary；
- `WORK_BOUNDARY`：未来 work obligation boundary。

wake 只说明 `WHEN` 和 `WHY`，不说明 `WHAT`。PRE-AL-06 的 retry/reobserve/
replan/defer policy 未被 scheduler 改写；本任务只把明确的 defer time 接入
rebuildable read boundary。

## Pause, maintenance, wall clock, fairness, and poison work

暂停或维护状态不会偷推进 World Time、Needs、backoff 或新 request，也不处理
due completion。每 step 有 `maxWorkItemsPerStep <= 30`；处理产生的 output
不会在同一调用中无限递归。stale/invalid/execution failure 变为有界、
machine-readable `failureItems`，不会在 step 内自旋；后续是否 retry 由未来
orchestration policy 决定。

每个 world 独立读取 world row、runtime due rows 和 wake registrations；driver
不会跨 world 混取 work。due work 按稳定顺序重新读取，当前 serial policy 不
因其它 resident 的 Promise/transaction 完成顺序而饿死同一 due bucket 的
resident。完整带 lease/fence 的多进程公平性仍是后续 Gate 项，而不是本任务
的隐含承诺。

## Observation / Needs / Goals / Replan regression

- Observation 继续从正式 runtime authority 读取 location/activity/work
  obligation；scheduler 不直接写 Observation，也不引入第二份 runtime truth。
- MOVE/SLEEP completion 后，现有 Observation contract 可读到新的 location、
  `IDLE` activity、ActorRef、resources 与 work obligation；没有 Life Engine
  写权限。
- SLEEP 的 rest-anchor transition 仍由 PRE-AL-05 Kernel completion event
  表达；scheduler 不存或直接修改 Hunger/Rest/Social Need。
- Goal Engine 仍是纯 evaluator；decision wake 只触发未来重新观察/评估，
  当前不调用 Goal→Action loop。
- PRE-AL-06 contract/policy regression 继续通过；scheduler 不自行发明
  recovery directive。

## Database, migration, dependencies, and World Events

- Migration: `packages/db/drizzle/0009_odd_killmonger.sql`，新增
  `scheduled_wake_registrations`、world/due index，并为 runtime due lookup
  增加最小 index；同步 generated snapshot/journal。
- Database impact: no generic scheduler job、retry、agent queue、lease table
  or Redis durable truth；existing durable runtime/event/outcome tables remain
  authoritative。
- Production dependencies: none added；`apps/api/package.json` 只扩展真实
  PostgreSQL integration script，`pnpm-lock.yaml` 未变。
- World Events: running world-time advance 复用现有 `WORLD_TIME_ADVANCED`；
  MOVE/SLEEP completion 复用 PRE-AL-05 lifecycle events；scheduler/wake/step
  output 不写 Event Ledger。

## Replay and RES-M3-003 compatibility

历史 replay 仍直接使用 committed Event Ledger facts，不需要重新运行
scheduler 才能知道已发生的事实。当前 lifecycle payload 已保留 replay-ready
world/resident/action/due/completion fields，并由现有 replay validation 检查；
完整 resident runtime projection reducer、canonical state、manifest hash、
full/suffix projection replay 和 deterministic resimulation 尚未实现。

逐项兼容性结果见
[`PRE-AL-07-RES-M3-003-COMPATIBILITY.md`](./PRE-AL-07-RES-M3-003-COMPATIBILITY.md)。
其中旧研究 invariant `E-04` 的 contiguous refs 与正式 main contract 冲突：
在多 resident action 交错提交时，正式语义是同 world、严格递增、允许 gap，
并已由 contract test 固化。

## M3-T04 readiness and PRE-AL-GATE blockers

### M3-T04 readiness

PRE-AL-05、PRE-AL-06、PRE-AL-07 已分别关闭 MOVE/SLEEP semantics、bounded
replan 和 scheduler/driver 这三个前置边界。按当前输入/输出 readiness，
`M3-T04 readiness = READY_TO_RETRY`；但正式状态仍保持
`M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE`，本任务不启动 T04。

### Remaining PRE-AL-GATE blockers

1. world driver lease/fence ownership、single active driver 与 lost-fence
   stop/recover evidence；当前只有 resident state-version fence。
2. versioned typed event registry、payload schemas、reducer compatibility 和
   causality boundary；当前 generic event ledger/lifecycle payload 还不是完整
   resident domain registry。
3. resident runtime projection reducer：从 resident genesis + committed facts
   重建 location/activity/Need anchor/resource projection，并与 live state 做
   canonical hash comparison。
4. machine-readable SimulationManifest、policy content digests、stable logical
   ID mapping、canonical authoritative/derived hashes 与 event/day checkpoints。
5. full 30-resident × 30-World-Day Action Loop evidence：Observation → Life
   decision → ActionRequest → real Kernel Outcome/Event → reobserve/replan，
   以及 full/suffix replay、same-manifest resimulation 和 fault evidence。
6. 若 30×30 profile 扩大到资源 mutation，还需正式 resource authority、
   committed resource events 和 reducer；当前 fixture-only read capability
   不能替代 Economy proof。

这些是 exact follow-up blockers，不在 PRE-AL-07 中顺手实现。

## 30-resident validation and performance boundary

clean PostgreSQL integration 使用正式 T01 30-resident fixture：15 个 MOVE 与
15 个 SLEEP 在不同 due boundary 上启动，driver 以 serial stable order 完成
全部 30 个 activity，runtime 最终回到 30 个 `IDLE` rows，completion event
顺序和 world-local seq 可验证。另覆盖单 MOVE、单 SLEEP、exact due、future
work、duplicate/requery、durable deferred wake、PAUSED/MAINTENANCE、world
isolation 和 `maxWorkItemsPerStep = 1` bounded behavior。

due activity path 是单次 bounded SQL batch；scheduled wake 是单次 world-scoped
query；没有 per-resident due-scan N+1。该证据是 correctness/query-shape
验证，不是 production SLA。1000 synthetic probe 与 30×30 full simulation
未执行，因为不属于本任务验收边界。

## Verification evidence

| Check                              | Result                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`   | PASS                                                                       |
| `pnpm lint`                        | PASS                                                                       |
| `pnpm typecheck`                   | PASS                                                                       |
| `pnpm test`                        | PASS                                                                       |
| `pnpm build`                       | PASS                                                                       |
| clean PostgreSQL migration/seed    | PASS；disposable database，验证后移除                                      |
| M2 PostgreSQL integration          | PASS；4/4                                                                  |
| PRE-AL-01～06 regressions          | PASS                                                                       |
| M3-T01～03 regressions             | PASS                                                                       |
| PRE-AL-07 scheduler integration    | PASS；MOVE/SLEEP、ordering、wakes、pause、isolation、bounded、30 residents |
| official production audit          | PASS；HIGH=0，CRITICAL=0                                                   |
| research/experiment boundary audit | PASS；未读取未合并实现，未 cherry-pick、未修改其 branch/worktree           |

## P0/P1/P2/P3

- P0: `0`。
- P1 closed: deterministic scheduler/driver、World-Time due completion、
  rebuildable deferred wake、stable serial order、pause/maintenance、bounded
  step 与 current world isolation。
- P1 remaining: driver lease/fence、typed event registry/reducers、resident
  projection replay、canonical manifest/hash、full 30×30 action-loop evidence。
- P2: `causation_id`、fine-grained versioned event payload compatibility，以及
  long-lived heartbeat semantics remain conditional follow-ups。
- P3: existing document manifest file count/name mismatch 与 external GitHub
  Action Node.js 20 runtime deprecation warning。

## Git and CI

- Implementation commit: `a3581a5db6500bb44282b19ccc5ada03d5c4beeb`。
- Implementation CI: [foundation-ci run 34344722893](https://github.com/zl2796195822/mirror-world/actions/runs/34344722893)，完整 `Success`。
- Final main/doc baseline: this report's final documentation synchronization is
  docs-only after the verified implementation commit; the final local/remote
  HEAD is reported by the completion check below and in the handoff response。
- Final condition: `HEAD == origin/main` and worktree clean。

## Formal state update

`docs/PROJECT_STATE.md` 将同步为：

- `PRE-AL-07 = PASS`
- `M3 = IN_PROGRESS`
- `M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE`
- `M3-T04 readiness = READY_TO_RETRY`
- 下一允许工作为 `PRE-AL-GATE` 或正式 audit 发现的额外 P1；本任务完成后停止。
