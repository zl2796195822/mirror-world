# ADR-0010 PRE-AL-06 Bounded Replan / Failure Policy

- 状态：Accepted
- 日期：2026-09-09
- 范围：PRE-AL-06

## 背景

PRE-AL-01 已确定 Kernel 的 durable execution outcome 只有
`COMMITTED`、`REJECTED`、`CONFLICT`。调用处置与 transport 结果不属于
Kernel outcome：相同幂等指纹的调用复用为 `REUSED`，不同指纹的相同
`(worldId, idempotencyKey)` 返回 `IDEMPOTENCY_CONFLICT`，调用超时不能推断
Kernel 没有提交。

PRE-AL-05 已提供 MOVE/SLEEP 的真实 Kernel 生命周期、`NOT_DUE` completion
边界、`WORLD_NOT_RUNNING`、`KERNEL_CONFLICT`、幂等和 runtime version 语义。
Action Loop 仍未实现，因此本 ADR 只建立可被未来 orchestration 调用的
纯 policy/contract，不创建 scheduler、worker 或自动 resident loop。

## Decision

1. `@mirror/contracts` 新增 `m3-replan-v1` 的
   `FailureClass`、`ActionRecoverySignal`、`DecisionAttemptBudget`、
   `ReplanPolicyInput` 和 `ReplanDecision` contract。所有对象为 strict
   schema；未知字段、负数预算和非法 World Time 被拒绝。
2. `@mirror/life-engine` 新增纯 `classifyFailure` 与 `decideReplan`。
   相同 signal、budget、World Time 和 policy version 必须得到相同结果；
   不读取 wall clock、不使用随机数、不执行 action。
3. 当前正式 outcome/disposition 的分类如下：

   | 输入                                                                                    | FailureClass           | 默认 directive                                                        |
   | --------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------- |
   | `COMMITTED`，包括 `REUSED` 的 committed outcome                                         | `SUCCESS`              | `SUCCESS`                                                             |
   | `CONFLICT / KERNEL_CONFLICT`                                                            | `STALE_STATE`          | `REOBSERVE_NOW`                                                       |
   | `REJECTED / KERNEL_INVALID_ACTION`, `KERNEL_ACTOR_NOT_FOUND`, `KERNEL_INVALID_LOCATION` | `PERMANENT_INVALID`    | 有替代候选时 `REPLAN_NOW`，否则 `STOP`                                |
   | `REJECTED / KERNEL_PERMISSION_DENIED`                                                   | `AUTHORIZATION`        | `STOP`                                                                |
   | `REJECTED / KERNEL_INSUFFICIENT_RESOURCE`, `KERNEL_INSUFFICIENT_FUNDS`                  | `RESOURCE_UNAVAILABLE` | 有替代候选时 `REPLAN_NOW`，否则按 World Time `DEFER_UNTIL_WORLD_TIME` |
   | `REJECTED / WORLD_NOT_RUNNING`                                                          | `WORLD_NOT_RUNNING`    | `STOP`                                                                |
   | `NOT_DUE`                                                                               | `TEMPORARY_NOT_DUE`    | `DEFER_UNTIL_WORLD_TIME`                                              |
   | `IDEMPOTENCY_CONFLICT`                                                                  | `IDEMPOTENCY_ERROR`    | `STOP`                                                                |
   | `EXECUTOR_ERROR`                                                                        | `INTERNAL_ERROR`       | `STOP`                                                                |
   | 未知 failure                                                                            | `UNKNOWN_FAILURE`      | `STOP`                                                                |

4. `RETRY_SAME_REQUEST` 只允许用于 `TIMED_OUT`。调用方必须先用原始
   `requestId` 和原始 `idempotencyKey` reconciliation：
   - 已找到属于原 request/world 的 durable outcome：消费该 outcome，不再提交；
   - 未找到 outcome：在 submission budget 未耗尽时最多按同一 request/key 重试；
   - reconciliation 不可用：`STOP / RECONCILIATION_REQUIRED`；
   - reconciliation 找到 `CONFLICT` 或 `REJECTED` 时，消费该真实 outcome，
     再按本 ADR 分类。
5. `IDEMPOTENCY_CONFLICT` 永远不自动生成新 key。`CONFLICT` 永远不在旧
   snapshot 上重试；`REOBSERVE_NOW` 表示未来 orchestration 必须通过
   PRE-AL-02 query boundary 获取新 snapshot 后再开始新的 decision。
6. M3 v1 的 budget 集中为：`maxSubmissionAttempts = 2`、
   `maxConflictRecoveries = 2`、`maxReplans = 2`。每个 decision cycle
   的预算是 ephemeral orchestration state，不跨居民生命周期累积；达到
   上限返回 `STOP / BUDGET_EXHAUSTED`。
7. 没有替代候选的资源失败使用显式 World-Time reconsideration delay：
   `2, 4, 8, 16, 32` 分钟，随后封顶 `60` 分钟。`NOT_DUE` 直接使用
   Kernel 给出的 `dueAtWorldTime`。暂停或维护状态不推进 World Time；本
   policy 不创建 timer 或 wake queue。
8. `SUCCESS`、`STOP`、`REOBSERVE_NOW`、`REPLAN_NOW`、
   `RETRY_SAME_REQUEST` 和 `DEFER_UNTIL_WORLD_TIME` 都是内部
   orchestration decisions，不是 World Fact，不推进 `worldSeq`，不写
   Event Ledger，不进入 authoritative Replay。
9. 现有 World Kernel 的 `findKernelActionOutcome` 已提供 world-scoped、
   request-scoped read boundary。本任务不新增 generic history API 或新的
   read port；policy 只消费已完成的 reconciliation signal。

## Consequences

- COMMITTED 和 duplicate reuse 是 terminal success，不会二次执行、二次
  commit 或重复产生事件。
- 永久非法、授权失败、世界未运行、幂等冲突、executor/internal error 和
  unknown failure 都 fail closed。
- 每个 conflict recovery、same-request timeout retry 和 alternative replan
  都有独立计数；retry、reobserve、replan 三者不会被一个模糊的 `FAILED`
  状态替代。
- Policy 不重新设计 M3-T03 Goal stability；有限 replan budget 只提供
  当前 decision cycle 的振荡上界。
- `Decision Cycle` 只是一次 ephemeral `Observation → Goal → Action →
recovery → terminal/defer` 的 scope，不创建 `decision_cycles`、
  `replan_attempts`、`retry_jobs` 或 scheduler 表。

## Scope exclusions

本 ADR 不实现 PRE-AL-07 scheduler/driver、M3-T04 规则决策器、完整 Action
Loop、30×30 simulation、LLM/Agent Runtime、任何新的 Action executor、
World Event、migration、Life Engine database write 或 production dependency。

## Verification

Contract 与 policy tests 覆盖 outcome/disposition matrix、MOVE/SLEEP 现有
reason codes、COMMITTED/reuse、conflict budget、permanent/resource/not-due
处置、timeout reconciliation、same-key bounded retry、unknown fail-closed、
World-Time determinism、immutability 和 1000 次 synthetic failure 的有限
terminal 收敛。
