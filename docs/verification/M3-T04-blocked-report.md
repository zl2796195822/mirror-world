# M3 T04 规则决策器阻断报告

## 结论

- Task ID: `M3-T04`
- Official Task Name: 规则决策器
- Status: `BLOCKED_BY_PRE_ACTION_LOOP_GATE`
- Milestone: `M3 = IN_PROGRESS`
- Gate case: `CASE B`
- Gate date: 2026-09-08

本轮没有实现 M3-T04 runtime。正式任务并非只输出 Candidate Action/Score/Selected Action；其 30×30 验收链要求接入现有 Action Contract、提交 ActionRequest、消费真实 Kernel ActionResult，并由结果驱动下一次规划。因此继续实现会越过 Pre-Action-Loop Gate。

## Official task and DoD

正式里程碑任务书定义：

> `M3-T04 规则决策器：候选行为 → 硬约束 → 评分 → 动作；不调用 LLM`

原始 DoD 是：

> `30 人 30 天模拟可完成`

相关 Life Engine 规格还要求固定 seed 下同报告稳定、无 LLM 可生活、无明显卡死/瞬移/集体同步。RES-M3-001 的正式接入顺序进一步明确 M3-T04 要接入规则决策、现有 Action Contract 和真实 Kernel ActionResult；30×30 矩阵要求保存 ActionRequest、ActionResult、world event history 与最终摘要。

## Gate assessment

| 项目                       | 官方范围判定                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 输入                       | world observation、resident state、Needs、Goals/Routines、地点/edge、工作义务、只读资源、Action Contract、seed/world time/epoch |
| Candidate Action           | 是                                                                                                                              |
| Constraint filtering       | 是；Life Engine 只能做 advisory preflight，不能代替 Kernel                                                                      |
| Scoring                    | 是；必须 deterministic、版本化、稳定排序                                                                                        |
| Selected Action            | 是；但不能被当作世界事实                                                                                                        |
| ActionRequest              | 是；正式接入现有六类 Action Contract                                                                                            |
| Kernel execution           | 是；Kernel 是唯一事实写入口                                                                                                     |
| ActionResult/ActionOutcome | 是；30×30 需要真实执行结果、reason、事件/seq 反馈                                                                               |
| Retry/replan               | 是；拒绝、资源不足、版本冲突和长期失败需要 bounded alternative/backoff/blocked 状态                                             |
| Runtime loop               | 是；连续 30 天生活依赖结果驱动的下一次规划                                                                                      |
| Scheduler/driver           | 是；M3 Gate 前需要真实 scheduler 或等价 deterministic driver                                                                    |
| Observation/query boundary | 是；当前尚无正式 snapshot/query port                                                                                            |
| ActorRef integration       | 是；Resident 不等于 Kernel Actor，需正式行动引用边界                                                                            |
| MOVE semantics             | 是；travel/activity/in-flight/completion 尚未冻结                                                                               |
| SLEEP semantics            | 是；默认时长与结果反馈尚未冻结                                                                                                  |

## Blocking evidence

1. `RES-M3-001/08-world-kernel-integration.md` 的正式接入顺序将 M3-T04 定义为接入规则决策、Action Contract 与真实 Kernel ActionResult。
2. `RES-M3-001/05-30-residents-30-days-test-matrix.md` 的 P0/P1 矩阵要求 ActionRequest、ActionResult、事件历史、拒绝处理、暂停、重放和 bounded blocked 状态。
3. `RES-M3-002/03-action-result-gap.md`：当前 M2 只有 request row 持久化，没有执行状态、resulting events、seq、result payload 或原请求 outcome 回读；该缺口明确阻塞真实 Action Loop。
4. `RES-M3-002/04-observation-snapshot-contract.md`：当前没有正式 `WorldObservationSnapshot`、projection、query port 或 durable resident read model。
5. `RES-M3-002/05-resident-actor-mapping.md`：Resident、Digital/Auth Identity 与 Kernel Actor 必须分离，T01 的 fixture-only ActorRef 不能代替正式 execution mapping。
6. `RES-M3-002/08-move-travel-semantics.md`：MOVE contract 只有 destination，duration、busy、in-flight、arrival event 与 completion 尚未实现；SLEEP 默认 world-minute cost 同样未冻结。
7. `RES-M3-002/15-pre-m3-blocking-matrix.md`：ActionOutcome、Observation、ActorRef、MOVE/SLEEP、bounded replan、scheduler/driver 和 full resident replay 是 Action Loop/M3 Gate 前置项。

## Required blockers before implementation

- ActionOutcome / ActionResult / committed event feedback
- 最小只读 Observation/query boundary
- Resident → ActorRef 正式映射与 version/location/resource capability
- 只读 resource snapshot boundary
- MOVE travel/activity/completion semantics
- SLEEP duration/completion semantics
- bounded replan/backoff/terminal rejection semantics
- deterministic driver 或 scheduler/lease 等价物
- full resident/domain replay 与 30×30 outcome/event evidence

RES-M5-001 仅作 research-only 参考。本轮不采用其数据库字段建议，不新增 `committed_event_id`，不冻结单一事件指针，也不把 `PERSISTED`、`DUPLICATE`、`TIMED_OUT` 等研究状态直接写入正式 schema。未来必须区分 Kernel Execution Outcome、Transport Outcome 与 Agent Operation Outcome；一个 ActionRequest 可能对应 0、1 或 N 个事件。

## Implementation boundary

- Runtime implementation: none
- Candidate/score evaluator: not added
- ActionRequest submission: not added
- Kernel validator/execution: not called or changed
- Retry/replan/runtime loop/scheduler: not added
- API/Event Ledger/Replay: unchanged
- Migration/table/column: none
- Production dependency: none
- LLM/AI SDK/BullMQ/provider SDK: none
- World facts/database: unchanged

The existing M3-T01 resident fixture, M3-T02 Needs evaluator, M3-T03 Goal evaluator, M2 Action Contract, M2 Kernel and M2 Replay remain unchanged.

## Verification

- `git fetch origin`: PASS
- starting branch: `main`
- starting `HEAD`: `a36b109eca669f9b9f1984da35269bff13af47c4`
- starting `origin/main`: `a36b109eca669f9b9f1984da35269bff13af47c4`
- starting worktree: clean
- code/runtime tests: not rerun because no runtime change was made
- production audit: no new dependency; not rerun

This is a scope/gate report, not a claim that M3-T04 or the 30×30 simulation has passed.

## P0/P1/P2/P3

- P0: 0 identified in this gate.
- P1: ActionOutcome/ActionResult feedback, Observation/query boundary, ActorRef integration, MOVE/SLEEP semantics, bounded replan, and full resident/domain replay remain open and block the Action Loop.
- P2: deterministic scheduler/driver and versioned domain event payload details remain open before the M3 Gate.
- P3: document manifest filename/count mismatch remains unrelated.

## Git and state

- Implementation commit: none; runtime was not modified.
- Documentation sync: this report plus `PROJECT_STATE.md` and `MEMORY.md` only.
- Final main HEAD: the post-sync commit is reported by the completing Git record; no runtime commit is claimed.
- CI: documentation-only push must be verified by GitHub Actions before this task is considered synchronized.

## Next step

No M3-T05 or later task is authorized by this report. A separate explicit task must close the Pre-Action-Loop blockers and re-run the Gate before M3-T04 implementation can begin.
