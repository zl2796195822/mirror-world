# M3-T03 Verification Report

## Result

`M3-T03 = PASS`。`M3 = IN_PROGRESS`。

本任务实现了纯 deterministic Routine/Goal evaluator。输出止于 Goal candidate 与 selected Goal；没有生成 Candidate Action、提交 ActionRequest 或执行任何动作。

## Task and source boundary

- Task ID：`M3-T03`
- Official Task Name：`Routine/Goal`
- 原始目标：工作日/休息日、睡眠、吃饭；目标可打断 routine。
- 原始 DoD：事件导致合理改道。
- M3 总目标：30 个居民在无 LLM 情况下能吃饭、睡觉、上班、回家、社交。
- 正式来源：`镜界_Codex里程碑任务书_v1.0.docx`、`镜界_M0-M13实施规格与依赖矩阵_v1.0.docx`、`镜界_LifeEngine详细规格_v1.0.docx`。
- 约束来源：`ADR-0007`、RES-M3-001、RES-M3-002。正式 M3-T04 才负责“候选行为→硬约束→评分→动作”，因此本任务没有实现 Candidate Action。

## Definition of Done evidence

| DoD                    | Evidence                                                                                             | Result |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| Routine/Goal           | `evaluateGoals` 产生 Need、routine、obligation、context 四类来源的 machine-readable Goal candidate   | PASS   |
| 目标可打断 routine     | `RETURN_HOME_REQUIRED` context Goal 以高优先级改道；active Goal 在稳定窗口内保持                     | PASS   |
| 事件导致合理改道       | context event 改变 selected Goal，且只输出 Goal，不旁路到动作                                        | PASS   |
| M3-T02 compatibility   | 复用 `NeedState` 与 `m3-needs-v1`，不新增 Need                                                       | PASS   |
| Deterministic baseline | 固定 seed、world time、resident/profile、Needs、obligation、context、policy 得到稳定候选、分数和选择 | PASS   |

## Implementation

- `packages/life-engine/src/goals.ts`
  - 新增 `m3-goals-v1` 集中式 GoalPolicy。
  - 新增 Goal sources：`NEED`、`ROUTINE`、`OBLIGATION`、`CONTEXT`。
  - 新增 Goal types：`SATISFY_HUNGER`、`REST`、`FULFILL_WORK_OBLIGATION`、`MAKE_SOCIAL_CONTACT`、`RETURN_HOME`。
  - 使用显式 World Time UTC routine window；支持 meal、sleep、social routine。
  - work obligation 只读输入 `DUE/LATE`；不会创建工资、账户、库存或经济压力。
  - 输出有限的 candidate list、selected Goal、reason code、priority、score、deadline、progress 和 target location reference。
  - active Goal 仅作为输入稳定性提示；没有 Goal runtime、scheduler 或持久化。
- `packages/life-engine/src/goals.test.ts`
  - 9 项 M3-T03 contract、来源、改道、迟滞、排序、30-resident 与边界测试。
- `packages/life-engine/src/index.ts`
  - 导出 Goal evaluator、policy 与类型。
- 无新增 production dependency；无 `pnpm-lock.yaml` 外部版本变化。

## Inputs and outputs

Inputs are `worldId`、versioned seed、explicit world time/status、T01 resident profile、T02 `NeedState`、read-only work obligation、minimal context event、optional active Goal and `GoalPolicy`。

Outputs are `GoalEvaluation`：`policyVersion`、sorted `candidates` 和 `selectedGoal`。每个 candidate 至少包含 resident、world、type、source、reasonCode/trigger、priority、score、createdAtWorldTime、status、progress，以及适用时的 deadline/targetLocationId。没有自然语言推理、chain-of-thought 或 ActionRequest。

## Needs integration

- 继续使用 ADR-0007 冻结的三个 CORE pressure：`HungerPressure`、`RestPressure`、`SocialPressure`。
- `HungerPressure >= 80` 可产生 `SATISFY_HUNGER/HUNGER_HIGH`。
- `RestPressure >= 80` 可产生 `REST/REST_HIGH`。
- `SocialPressure >= 70` 可产生 `MAKE_SOCIAL_CONTACT/SOCIAL_HIGH`。
- `EnergyLevel`、`conditionBand`、`stress`、`safety`、`money_pressure`、`purpose` 的 T02 边界没有变化。
- Need 只提高 Goal 紧迫度；Need 不等于 Goal，Goal 不等于 Action。

## Routine and obligation integration

- T01 routine profile 的 sleep phase、meal phase、social window 通过 UTC world time 映射到有限 routine windows。
- routine window 可分别产生 `SATISFY_HUNGER/MEAL_WINDOW`、`REST/SLEEP_WINDOW` 和 `MAKE_SOCIAL_CONTACT/SOCIAL_WINDOW`。
- work obligation 不是 Need；只有 employed resident 的只读 `DUE/LATE` obligation 才产生 `FULFILL_WORK_OBLIGATION`，并保留 workplace/deadline 输入。
- 没有 obligation 的居民不会被伪造为工作；休息日因此不会产生工作 Goal。
- `cashCents`、`foodUnits` 仍是只读 fixture/resource boundary，没有任何扣减或写入。

## Goal policy, determinism and stability

- GoalPolicy version：`m3-goals-v1`。
- policy 集中定义 activation thresholds、priority、routine start hour、routine window、active Goal switch margin；没有散落 magic numbers。
- candidate order：`score desc → priority desc → stable candidate key asc`。
- stable candidate key 使用 Goal type/source/reason/target；相同 score 的候选不会依赖输入遍历顺序。
- Goal id 使用 SHA-256 对 policy/seed/world/resident/world time/type/reason 的稳定摘要。
- active Goal 在新候选仍同类型且分差不超过 policy margin 时保持；分差超过 margin 才切换。该稳定性不是 retry/replan runtime。
- 没有 `Math.random()`、`Date.now()`、`performance.now()`、timer、LLM、网络响应顺序或数据库 created-at 输入。
- `PAUSED` / `MAINTENANCE` 返回空 candidate 与 null selected Goal，不推进 routine 或 Goal。

## Persistence, database, events and replay

- Goal evaluator 是纯函数式 domain boundary；没有 goals/plans/agent_tasks 表、migration、repository 或 cache truth。
- 没有新增 API、Action API、Event Registry、`GOAL_CHANGED` 或任何 Event Ledger 写入。
- 没有修改 PostgreSQL schema、World Kernel、M2 Event Ledger、Checkpoint/Replay 或 world facts。
- Goal 可以由 seed/profile、world time、Needs、obligation、context 重新计算；本任务不声称已经完成完整 30×30 domain replay。
- 没有 ActionRequest submission、Kernel execution、ActionResult feedback、location/resource/activity mutation。

## 30-resident integration and performance

- 复用 `generateResidentSeed` 的正式 30-resident fixture；没有创建第二份居民名单或 Needs fixture。
- 30 个居民均通过 T01 profile/employment → T02 NeedState → T03 Goal pipeline；批量结果按 `residentId` 稳定排序。
- 当前机器轻量 benchmark：30 residents × 1000 batches 平均 `0.142 ms/batch`；1000 synthetic residents × 100 batches 平均 `4.610 ms/batch`。
- 该 benchmark 只衡量纯 Goal evaluator，不是 30×30 simulation、scheduler、Action Loop 或生产 SLA。

## Verification evidence

### TDD and package checks

- 先加入失败测试：实现文件不存在时 test suite 因无法解析 `./goals.js` 失败。
- 实现后 `@mirror/life-engine`：19/19 tests PASS（T02 Needs 10、T03 Goal 9）。
- life-engine lint/typecheck/build：PASS。

### Repository regression

- `pnpm install --frozen-lockfile`：PASS。
- `docker compose up -d`：PostgreSQL、Redis、MinIO healthy。
- `pnpm db:setup` 连续两次：PASS。
- `pnpm lint`：PASS；Prettier check PASS。
- `pnpm typecheck`：PASS。
- `pnpm test`：PASS；DB 6、Contracts 15、World Kernel 25、Web 3、API 6、Life Engine 19。
- `pnpm build`：PASS。
- clean temporary PostgreSQL 上 `@mirror/api test:integration`：4/4 PASS（World Clock、Event Ledger、Replay/Checkpoint、Action Request）；临时数据库已删除。
- 已有主库 replay suite 的重复运行不作为验收证据：append-only 历史事件链会使 replay fixture 拒绝不连续的复用状态。随后只用 `pnpm db:setup` 恢复 seed 的 `PAUSED/1x`，未删除任何事件；主库当前为 5 migrations、1 user、1 world、0 action requests、35 events、0 checkpoints。
- `pnpm audit --prod --registry=https://registry.npmjs.org/`：PASS；No known vulnerabilities found，HIGH=0、CRITICAL=0。

## Risk levels and Pre-Action-Loop blockers

- P0：0。
- 本任务新增 P1：0。
- 继承 P1：`MIRROR-FIND-001` ActionResult/committed-event feedback；Observation Snapshot/query boundary；ActorRef integration；read-only resource adapter；MOVE/SLEEP completion semantics；bounded replan；scheduler/driver；full resident/domain replay。它们没有被本任务伪造为已关闭。
- P2：`causation_id`、版本化领域 Event payload、scheduler/heartbeat 边界，继续保留。
- P3：文档库 manifest 文件数量/文件名不一致；GitHub Actions 外部 action Node.js 20 runtime warning。
- Pre-Action-Loop status：未触碰、未关闭；本任务没有 ActionRequest、ActionResult、Kernel executor、bounded replan 或 scheduler。

## Git, CI and state

- Implementation commit：`ee0617dfd24e617979680184a7fb88c67d64af66`。
- Verification main HEAD：`45eefe173bc8625b6235e14293b9b16480abd6db`。
- GitHub Actions `foundation-ci`： [run 34223831452](https://github.com/zl2796195822/mirror-world/actions/runs/34223831452)，success；foundation install、lint、typecheck、unit tests、build 全部通过。
- CI 保留既有外部 action 的 Node.js 20 deprecation warning；不影响项目门禁。
- `PROJECT_STATE.md`：同步为 `M3-T03 = PASS`、`M3 = IN_PROGRESS`。
- `MEMORY.md`：同步记录实现、验证、边界和未决 blocker。

## Next allowed step

只记录下一允许任务 `M3-T04`；本轮完成后立即停止，不执行 M3-T04 或任何后续任务。
