# PROJECT_STATE

Current milestone: M3 Life Engine v1
Current task: M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX (completed; main CI pending)
Status: M3-LIFECYCLE-ADR-FORMALIZATION = PASS; M3-T04 = PASS; PRE-AL-GATE = PASS; M3 Behavioral Lifecycle Extension = PASS; M3-LIFECYCLE-STORY-GATE = FAIL / RERUN_REQUIRED; coverage reconciliation = PASS; coverage fix = PASS / MAIN_CI_PENDING; M3 remains IN_PROGRESS
Last verified implementation commit: 780e491c6ee2d14bb7d44eaa8114ee2402721de9
Last verified main/doc baseline: 85b8cdd7b5a0421e2ac14d7e18d9d81589f4f727

## Completed

- M0 工程地基、数据库、Docker 依赖、官方 production audit 与 GitHub Actions 基线已通过。
- 已完成 M1-T01 Next.js App Router 产品壳：深色低密度视觉、首页、世界、居民、事件、设置导航及非游戏 HUD。
- 已通过 1440px 桌面宽度与 390px 移动宽度的真实生产构建浏览器验证，所有路由无横向溢出。
- 所有未接入后端能力均显示诚实空状态；产品壳不连接数据库、Redis、API 或 World Kernel，也不写入世界事实。
- 已登记 M1-T01 新增的 Next.js、React、React DOM 与 React 类型依赖；许可证均为 MIT。
- GitHub Actions `foundation-ci` 已对最终文档同步提交真实执行并 PASS：run `34152941758`。
- 已实现 M1-T02 开发身份：开发环境 seed 用户、Auth Adapter 边界、HttpOnly 会话、受保护路由与生产 fail-closed 守门。
- 本地 lint、typecheck、test、build、开发/生产浏览器验收均通过。
- GitHub Actions `foundation-ci` 已对 M1-T02 最终验证提交真实执行并 PASS：run `34176497873`，install、lint、typecheck、unit tests、build 全部成功。
- M1-T03 World Overview 已在现有认证产品壳中实现诚实的世界时间、运行状态、30 居民占位与最近事件空状态。
- M1-T03 未连接 API、数据库、Redis 或 World Kernel；没有世界事实写入，也没有新增依赖。
- M1-T04 已实现 Fastify `/api/v1/health`、`/api/v1/ready`、`/api/v1/worlds`、统一 error envelope/requestId 与 OpenAPI 生成。
- M1-T04 `/worlds` 只读 PostgreSQL 世界元信息；`/health` 不访问依赖；`/ready` 与世界读取在依赖不可用时 fail-closed。
- M1-T04 本地 install、lint、typecheck、test、build、真实 API runtime、浏览器回归与官方 production audit 均 PASS。
- GitHub Actions `foundation-ci` 对 M1-T04 最终代码验证提交真实执行并 PASS：run `34183633011`。
- M1 Milestone Gate 基于当前 main HEAD 重新完成架构、产品、认证、API、OpenAPI、安全、依赖、基础设施与 CI 复核，结果为 `M1 = PASS`。
- 本轮真实失库验证确认 `/health` 保持 200，`/ready` 与 `/worlds` 均 503 且使用统一 error envelope/requestId。
- 本轮重新执行 frozen install、lint、typecheck、test、build 与官方 npm audit，均 PASS；P0=0、P1=0、HIGH=0、CRITICAL=0。
- 本轮补齐第三方登记的官方 source links，并修正 ADR-0001 的 SameSite 文案与实际 Strict cookie 实现一致。
- M2-T01 已实现最小 World Clock：显式 wall-clock 输入、world-time 推进、开发态 pause/1x/10x/100x、生产态 1x 守门，以及 PostgreSQL durable anchor。
- 新增 `@mirror/world-kernel`，API 时钟读写只能通过 Kernel store 进入 PostgreSQL transaction；没有新增 Action、Event Ledger、Checkpoint、Replay 或后续领域能力。
- 新增 M2-T01 migration，补充 `clock_anchor_at` 与 `worlds` 的 status/time-scale 数据库约束；clean DB migration/seed 与真实时钟 integration test 已通过。
- M1 API/Web 回归、lint、typecheck、test、build 与官方 npm audit 已通过；GitHub Actions run `34187838878` 对实现 commit 真实 PASS。
- M2-T02 已新增 `@mirror/contracts` Action Contract：六类基础动作的结构化 Zod schema、类型与纯解析入口；非法字段、类型、格式和参数边界由 schema 拒绝。
- M2-T02 没有新增数据库、API、事件、事实写入、幂等执行或 Kernel validator；新增 Zod 已登记并完成官方 production audit。
- M2-T02 本地与 GitHub Actions 均真实通过；run `34196620662` 执行 install、DB setup、lint、typecheck、unit tests、World Clock integration 与 build，结果为 PASS。
- M2-T03 已新增 Kernel action validator：复用 Action Contract，并使用显式 World Clock 与只读领域 snapshot 校验 actor、权限、world 状态、时间、版本、位置、资源和六类动作前置条件。
- M2-T03 已新增最小 `action_requests` durable request metadata 表与 migration；PostgreSQL 唯一约束、transaction、fingerprint 支持 duplicate/conflict 幂等语义，但没有写入世界事实。
- M2-T03 本地 lint、typecheck、unit tests、build、真实 PostgreSQL integration、双次 db:setup、官方 production audit 与 GitHub Actions run `34199405422` 均 PASS。
- M2-T04 已新增 PostgreSQL Event Ledger：`world_events` append-only、world-local `world_seq`、数据库一致性 triggers，以及 World Kernel 的 state+event 同 transaction 提交入口。
- M2-T04 已将 World Clock 的实际 world-time 推进记录为 `WORLD_TIME_ADVANCED`，事件时间使用 world time；没有新增 ActionResult、Projection、Checkpoint、Replay、Simulator 或后续领域能力。
- M2-T04 本地 install、双次 db:setup、lint、typecheck、unit tests、build、真实 PostgreSQL integration 与官方 production audit 均 PASS；GitHub Actions run `34201564067` 对提交 `57e53e128ee805e3503aa91491c15d1805779cbc` 真实 PASS。
- M2-T05 已新增 `simulation_checkpoints` 与 migration `0004_old_ares.sql`；checkpoint 只作为可删除、可重建的恢复/加速数据，PostgreSQL Event Ledger 仍是 durable truth。
- M2-T05 已新增固定 seed + ordered event replay、canonical SHA-256 history/summary hash、checkpoint suffix replay，以及 world/seq/schema/checksum 校验；Replay 不重新执行 ActionRequest。
- M2-T05 本地 frozen install、clean database 双次 setup、lint、typecheck、unit tests、build、真实 PostgreSQL 全 M2 integration 与官方 production audit 均 PASS；GitHub Actions run `34204276572` 对实现提交 `838c6e5eede3aaf413c5a9966893444ae7cb92ad` 真实 PASS。
- M2 Milestone Gate 已复核 M2-T01～T05 的 authority、clock、Action Contract、validator、幂等、Event Ledger、transaction、sequence、world isolation、checkpoint 与 deterministic replay；发现并修复 wall-clock rollback 下的 control anchor 回写缺陷，补齐 checkpoint 错误 world/schema/corruption 与重复 suffix replay 证据。
- M2 Gate 本地真实验证、API/Web 回归、官方 production audit 与范围审计均 PASS；Gate 修复提交为 `7f5377f37d441c9989dd94ce2f6d97f30980603d`，最终状态为 `M2 = PASS`。
- `ADR-M3-001` 已 ACCEPTED：完成 4/6/7 Needs source audit；M3 v1 的三个独立 CORE Need 为 `HungerPressure`、`RestPressure`、`SocialPressure`。
- `EnergyLevel`、`conditionBand`、工作义务与资源快照明确为 derived/input boundary；`stress`、`safety`、`money_pressure`、`purpose` 延后，不创建伪事实。
- Needs authority 已确定为 `World Facts + World Time + Resident Seed/Profile + NeedPolicyVersion → Current Need State`；采用 World-Time lazy evaluation，暂停世界不推进 Needs；没有新增 runtime、schema、migration、API 或事件。
- Needs 来源审计记录于 `docs/architecture/m3-needs-source-audit.md`，正式 ADR 为 `docs/adr/ADR-0007-m3-life-engine-needs-model-v1.md`。
- M3-T02 已新增纯 `@mirror/life-engine` Needs evaluator：`HungerPressure`、`RestPressure`、`SocialPressure`，统一 `0=satisfied`、`100=critical`，并输出同源 `EnergyLevel` 与带 hysteresis 的 `conditionBand` 派生值。
- M3-T02 使用 `NeedPolicyVersion=m3-needs-v1`、resident seed/profile 稳定 variation、World-Time lazy evaluation 与 anchor；`PAUSED/MAINTENANCE` 不推进，没有 timer、scheduler、Needs migration、Event Registry 或事实写入。
- M3-T02 的 30 resident fixture、全仓回归、clean PostgreSQL M2 integration、性能基线、官方 audit 均通过；GitHub Actions `foundation-ci` run `34220974174` 对 `b4518859482301a95732734f599441d8bc9d74a3` 真实 PASS。
- M3-T03 已按正式 `Routine/Goal` 任务实现纯 deterministic Goal evaluator：Needs、routine、work obligation、context 四类 Goal source，`m3-goals-v1` policy、stable ordering、tie-break 与 active Goal stability。
- M3-T03 只输出 Goal candidates/selected Goal；没有 Candidate Action、ActionRequest、ActionResult、Kernel execution、scheduler、replan、migration、API、Event Ledger 或事实写入。
- M3-T03 复用 M3-T01 30 resident fixture 与 M3-T02 `NeedState`；本地 life-engine 19 tests、全仓 lint/typecheck/test/build、clean PostgreSQL M2 integration 4/4 与官方 audit 均 PASS。
- M3-T04 Gate 已完成正式任务定义重读：官方任务为规则决策器，但 30×30 验收链要求 ActionRequest、真实 Kernel ActionResult、结果驱动 replan/runtime 与 deterministic driver；因此本轮判定 `BLOCKED_BY_PRE_ACTION_LOOP_GATE`。
- M3-T04 仅新增 blocked verification report 与状态同步；没有修改 runtime、Action Contract、Kernel、schema、migration、API、Event Ledger、Replay 或数据库事实。
- PRE-AL-00 已定位 main CI 红灯根因：已提交的 `docs/verification/M3-T04-blocked-report.md` 未通过仓库 Prettier 检查；GitHub 两次失败 Run 实际停在 `Lint and format`，Typecheck 被跳过。
- PRE-AL-00 仅格式化该报告并新增证据记录 `docs/verification/PRE-AL-00-diagnostic.md`；没有修改 workflow、TypeScript、依赖、lockfile、runtime、schema 或 migration。
- PRE-AL-00 本地 frozen install、lint、typecheck、test、build、clean PostgreSQL M2 integration 4/4、M3-T01/T02/T03 回归与官方 npm audit 均通过；根因修复 run `34227318851` 与最终状态同步 run `34227826950` 均完整 `Success`，main CI baseline 已恢复 GREEN。
- PRE-AL-01 已完成正式 `ActionRequest → World Kernel → KernelActionOutcome` 反馈闭环：durable status 只有 `COMMITTED`、`REJECTED`、`CONFLICT`；`DUPLICATE`/`IDEMPOTENCY_CONFLICT` 为调用处置；`TIMED_OUT` 不落 Kernel outcome。
- PRE-AL-01 新增 outcome contract、0/1/N event association、同事务多事件提交、幂等结果复用、版本冲突/拒绝 reason code、executor rollback 与 world-scoped 复合约束；没有实现 Observation、ActorRef、Resource Bridge、MOVE/SLEEP、replan、scheduler 或 Action Loop。
- PRE-AL-01 本地 frozen install、lint、typecheck、test、build、clean PostgreSQL 双次 setup、M2 integration 4/4、ActionOutcome integration 1/1、M3-T01/T02/T03 regression 与官方 npm audit 均通过；实现提交 `58b81b30b9f05404084421708381c1ff1409e747` 的 GitHub Actions run `34232707578` 完整 `Success`。
- PRE-AL-02 已建立确定性、bounded、world-scoped、resident-scoped、read-only 的 Decision Observation / Query Boundary；Life Engine 只依赖 Observation contract/port，不直接依赖 DB、SQL、Drizzle 或 Event Ledger。
- PRE-AL-02 明确以现有 `worlds` authority 与 T01 30-resident fixture 构建 `m3-observation-v1` snapshot，携带 `sourceWorldSeq`；ActorRef、location/activity runtime、obligation source、Resource Bridge 与 local context 未伪造，按 contract 返回 unavailable capability。
- PRE-AL-02 本地完整回归、clean PostgreSQL M2 integration 4/4、PRE-AL-01、M3-T01/T02/T03、官方 audit 与 GitHub Actions run `34237453432` 均通过；实现提交为 `3907e56414957f4fbc377868b18bf6b84fd5fbc9`。
- PRE-AL-03 已新增共享 `ActorRef`、`ResidentResourceSnapshot`、`ResidentActorResolver` 与只读 `ResourceReadPort`；复用 T01 的 deterministic seed fixture，0 migration、0 外部 production dependency、无 Auth/Digital Identity 合并。
- PRE-AL-03 已将 default Observation 的 `actorRef` 与 `resources` 从 `UNAVAILABLE` 接为 bounded batch `AVAILABLE`；`location`、`activity`、`workObligation` 与 `localContext` 仍为真实 `UNAVAILABLE`。
- PRE-AL-03 已验证 30 resident stable ordering、world isolation、unknown resident errors、deep immutability、fixture drift protection、read-only Observation 与 clean PostgreSQL M2/ActionOutcome/Observation integration；报告为 `docs/verification/PRE-AL-03-report.md`。
- PRE-AL-03 implementation commit `071862681346cf75d1a8e1715842f468cd04c7ea` 的 GitHub Actions `foundation-ci` run `34241852554` 真实 PASS；最终 docs-only sync 不改变 runtime。
- PRE-AL-04 已建立 world-scoped、resident-scoped 的 `resident_runtime_states` durable authority；初始 location 显式来自 home fixture，初始 activity 显式为 `IDLE`，bootstrap 幂等且不覆盖已有 runtime state。
- PRE-AL-04 已将 `location`、`activity`、`workObligation` 接入 `m3-observation-v1` 的 `AVAILABLE` union；work obligation 按 employment、固定 UTC 工作日 09:00–17:00 与 World Time 确定性推导，无业居民返回 `NO_CURRENT_OBLIGATION`。
- PRE-AL-04 Life Engine 仍只读 Observation；没有 MOVE/SLEEP executor、ActionRequest submission、World Event、scheduler、replan 或事实写入路径。新增 migration 为 `packages/db/drizzle/0007_flawless_mach_iv.sql`。
- PRE-AL-04 本地 frozen install、lint、typecheck、test、build、官方 audit、双次 db:setup 与 clean PostgreSQL 7/7 integration 均通过；GitHub Actions run `34248913024`/`34249840037` 暴露 clean runner 未先构建 contracts 的 seed 边界，已由 `@mirror/db db:seed` 显式构建 contracts 修复。
- PRE-AL-04 最终实现验证 run `34250817438` 的 migration、seed、lint、typecheck、unit tests、integration tests、build 全部 PASS；当前正式状态为 `PRE-AL-04 = PASS`，M3 仍 `IN_PROGRESS`。
- PRE-AL-05 已建立正式 MOVE/SLEEP 两阶段 Kernel lifecycle：`STARTED → COMPLETED`；MOVE 在完成时才切换 location，SLEEP 仅允许 HOME 且固定 480 World Minutes。
- PRE-AL-05 新增 `TRAVELING`/`SLEEPING` 最小 activity metadata、集中式 `m3-action-semantics-v1` duration policy、显式 completion command、四类 lifecycle events 与同一 KernelActionOutcome 的 0/1/N association。
- PRE-AL-05 复用既有 Action Contract（MOVE `{ destinationId }`、SLEEP `{}`），没有新增 production dependency、Action API、scheduler、replan 或 autonomous loop；Life Engine/Observation 仍无 runtime 写入口。
- PRE-AL-05 本地 frozen install、lint、typecheck、test、build、官方 production audit、双次 clean db:setup、clean PostgreSQL 8-stage integration、并发/回滚/30+30 event-boundary tests 均通过；GitHub Actions `foundation-ci` run `34325594982` 对实现提交真实完整 PASS。
- PRE-AL-06 已建立 `m3-replan-v1` bounded replan/failure policy：Failure Classification、SUCCESS/STOP/REOBSERVE_NOW/REPLAN_NOW/RETRY_SAME_REQUEST/DEFER_UNTIL_WORLD_TIME 分离，timeout reconciliation 仅允许原 request/key 的有界重试。
- PRE-AL-06 已将 submission、conflict recovery、replan 三类预算分别有界；未知、内部、授权、世界未运行、幂等冲突与无可行替代均 fail-closed，World-Time defer 使用确定性延迟；没有新增 migration、World Event、worldSeq、scheduler、worker 或自动 resident loop。
- PRE-AL-06 本地完整回归、clean PostgreSQL integration、官方 production audit 与 GitHub Actions `foundation-ci` run `34337678714` 均完整 PASS；实现提交为 `d8160ed78d2371d272bd59e37720a5ab1513dca8`。
- PRE-AL-07 已建立 `m3-scheduler-v1` deterministic serial scheduler/driver：显式 World-Time advance、bounded due activity processing、stable UUID-byte ordering、completion-before-wake phases 与 machine-readable step result。
- PRE-AL-07 due MOVE/SLEEP 只通过既有 Kernel completion boundary 执行；runtime state-version fence、Kernel Outcome/Event Ledger、重复处理安全、PAUSED/MAINTENANCE、world isolation 与 30-resident mixed batch 均有 clean PostgreSQL integration evidence。
- PRE-AL-07 新增最小 `scheduled_wake_registrations` durable projection 与 runtime due index；deferred wake 可按 world/dedupe key 重建，scheduler/step/wake 不成为 World Truth；没有 generic queue、worker、timer 或新 production dependency。
- PRE-AL-07 明确永久边界 `Scheduler = WHEN`、`Life Engine = WHAT`、`World Kernel = CAN / COMMIT`；decision wake 不携带 selected action，也不执行 M3-T04。
- PRE-AL-07 compatibility review 已完成：RES-M3-003 研究 branch 只读且未合并；lease/fence、full manifest/semantic hash、typed event registry/reducers、resident projection replay 与 30×30 full evidence 保持后续 blocker；旧 contiguous event-ref 文字与正式 main contract 的交错 seq-gap 语义冲突已记录。
- M3-T04 RETRY 已正式实现并 PASS：新增 `m3-rule-decision-v1` 纯 Rule Decision Maker 与 `m3-action-loop-v1` bounded Action Loop，复用 Needs/Goals/Observation/ActorRef/Resource/Runtime/MOVE-SLEEP/Kernel Outcome/Replan/Scheduler，不重写任何已 PASS authority。
- M3-T04 闭环证据覆盖 Observation → Needs → Goals → Candidate → Hard Constraints → Score → ActionRequest → Kernel → Outcome → Replan → due completion → refreshed Observation；COMMITTED/REJECTED 路径、world isolation 与 clean PostgreSQL integration 均已验证。
- M3-T04 没有执行 30×30 autonomous simulation、full resident projection replay、typed event registry、driver lease/fence owner 或 SimulationManifest；这些继续作为 PRE-AL-GATE / M3 Gate 前置项。
- M3-T04 新增文件仅限 life-engine rule-decision/action-loop、对应 unit tests、API integration test、workspace dependency edge 与 verification/state docs；没有新增 migration、World Event type、Action API 或 production external dependency。
- PRE-AL-GATE 已在实现 commit `15d2b25733ba44c7dcd43dbc3e4fe60babc1b651` 上完成：加入 world-scoped simulation driver lease/fencing、M3 typed event registry/reducer、resident projection replay、checkpoint suffix replay 与机器证据 harness。
- clean disposable PostgreSQL 上真实 30×30 运行达到 30 World Days / 43,200 World Minutes：30 residents、153 action attempts、127 committed、26 rejected、0 conflicts、final `worldSeq=1617`；live projection、full replay、suffix replay、checkpoint 删除后 genesis rebuild 与 A/B deterministic digest 均一致。
- PRE-AL-GATE fault/recovery evidence 通过：pause/resume、stale driver rejection/takeover、wake restart/requery/ack、ActionRequest/completion idempotency、poison resident bounded STOP=3 且其余 29 人继续、world/resident isolation、zero-LLM。
- implementation main CI `foundation-ci` run `34363874063` 对 commit `15d2b25733ba44c7dcd43dbc3e4fe60babc1b651` 为 `Success`；完整 report 为 `docs/verification/PRE-AL-GATE-report.md`，机器证据在 `docs/verification/artifacts/PRE-AL-GATE/`。

## 2026-09-10 M3-LIFECYCLE-STORY-GATE

- 正式 Gate 在 latest `origin/main=590d19d000fc04723028556e267cdbed362b4da8` 上完成；preflight 确认 `HEAD == origin/main`、初始 worktree clean，`foundation-ci` run `34464740586` 为 `success`。
- 使用三套独立 clean PostgreSQL（PostgreSQL 18.6、12 migrations、fresh seed）执行 baseline、same-seed repeat、different-seed 三次 30 residents × 43,200 World Minutes；没有删除 append-only Event Ledger。
- Run endpoint、fixture、causal evidence、Need、WORK obligation、resource conservation、TALK atomicity、bounded recovery、liveness、spatial safety、replay、determinism、isolation 等 Gate 结果通过；Hard Gate #3 `Accepted action coverage = FAIL`，因此本 Gate 总体为 `FAIL`。
- baseline action evidence：MOVE 950、SLEEP 702、EAT 60、WORK 4、TALK 203；5 名固定居民初始 `foodUnits=0`，11 名居民无 TALK completion，23 名就业居民无 WORK completion，4 名居民无 MOVE completion。诊断为 `RESOURCE_DEPLETION=30`、`SOCIAL_STARVATION=11`、`WORK_ABSENCE=23`。
- baseline/repeat 均精确到达 `2026-10-07T00:00:00.000Z`、`worldSeq=10668`，different-seed 也到达目标；四路 replay projection hash 一致，same-seed digest 相同，BUY/LLM/跨世界污染均为 0。
- 机器证据与 manifest 位于 `docs/verification/artifacts/M3-LIFECYCLE-STORY-GATE/20260910-run-08/`；正式报告为 `docs/verification/M3-LIFECYCLE-STORY-GATE-report.md`。Run-07 作为 artifact-writer failure lineage 保留，run-08 为最终自洽 bundle。
- `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、官方 npm production audit 与 clean PostgreSQL API integration 全部通过；回归通过不覆盖生命周期 Gate 的 Hard Gate #3 失败。
- 失败分类保留为 `GATE_CONTRACT_FIXTURE_CONFLICT` 与 `POLICY_COVERAGE_MISMATCH`，没有调参、补资源、改 fixture、改工作时间、改 TALK/Hard Gate 或修改生产事实。

## 2026-09-10 M3 Lifecycle ADR Formalization

- 冻结规格已从 `spec/m3-lifecycle-story-sanity-v1` 的 `292850f80792f42a2dd6d42c5d2c78bb1e6683b0` 至 final tip `0b667c3e6cd6da29b50b625e8e956bfbc88d88dd` 审计并 promote；只包含 spec/docs/governance 与 7 行事实性 MEMORY 记录，冻结语义未改。
- `ADR-M3-EAT-KERNEL-CONSUMABLE-CAPABILITY` 已由 `docs/adr/ADR-0011-m3-eat-kernel-consumable-capability.md` Accepted；资源真相为单一 Kernel/PostgreSQL world/resident/item food seam，`ResourceReadPort` 保持只读，CAS 与事件/Outcome 在同一 Kernel transaction，M6 不得创建第二库存真相。
- `ADR-M3-TALK-PAIRED-RUNTIME-LOCK` 已由 `docs/adr/ADR-0012-m3-talk-paired-runtime-lock.md` Accepted；保持单 initiator + participant reference，world-first 后按 resident UUID bytes 锁定两行，shared activity 与单一 completion，核心 ActionRequest/Event Ledger 不变。
- WORK 复用 employment + UTC work-obligation read model，attendance-only、NO PAYROLL，判定 `ADR_NOT_REQUIRED`。新增 ADR index 为 `docs/adr/README.md`。
- 正式注册 `M3 Behavioral Lifecycle Extension`，无自创永久数字编号：`FORMAL_TASK_REGISTERED_WITHOUT_NUMERIC_ID`；同步注册 `M3-LIFECYCLE-STORY-GATE = DEFINED / NOT_STARTED`，并将 `M3-T05 = DEFINED / NOT_STARTED`、定义状态 `CLARIFIED_AND_MACHINE_GATED`。
- 本治理任务没有修改生产代码、schema、migration、依赖或运行时测试；没有执行 EAT/WORK/TALK、30×30、M3-T05、M4/M5/M6。验证报告为 `docs/verification/M3-LIFECYCLE-ADR-FORMALIZATION-report.md`；`foundation-ci` run `34433236275` 对治理提交 `69fcf40b83fea3b30428ea87997c8458935a0bdc` 为 `Success`。

## 2026-09-11 M3 Story Gate Coverage Contract

- 已将 `M3-LIFECYCLE-STORY-GATE-COVERAGE-RECONCILIATION` 正式纳入当前主线文档，并接受 [Hard Gate #3 Coverage Contract v2](verification/M3-LIFECYCLE-STORY-GATE-COVERAGE-CONTRACT-v2.md)；保留冻结 v1、run-08 `FAIL` 及其 manifest/statistics/diagnostics/causal evidence/hash，不做 retroactive reclassification。
- Hard Gate #3 v2 仅澄清计量与 predicate：`ACTION_COUNT` 与 unique initiator/participant/eligible/feasible/completed resident counts 分离；统一 funnel 为 `TOTAL → ELIGIBLE → FEASIBLE → OPPORTUNITY → CANDIDATE_GENERATED → SELECTED → REQUESTED → COMMITTED → COMPLETED`；缺失 negative funnel 记录为 `UNKNOWN` 并失败，不得静默缩小 denominator。
- EAT 按 Need episode 与资源 feasibility 分离，zero-food 不触发伪造食物；TALK participant 计入 completed contact union 但保留 initiator 指标；MOVE 按正式 necessity/goal；SLEEP 在当前固定 manifest 保留 30/30；WORK 保持 26 employed、exact 09:00、LATE 不合法。
- 已注册唯一后续 remediation `M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX = DEFINED / NOT_STARTED`：包含 Work Preparation Wake Fix 与 EAT/TALK/MOVE/WORK funnel evidence extension；未注册未经证实的 TALK policy fix。本轮没有执行该任务、生产修复、Gate rerun 或 M3-T05。
- 本轮验证确认 review commit `ded7c6d…` 为 read-only analysis + 23 Markdown/3 JSON；保留工作区既存正确 run-summary SHA-256，并补正 review funnel 的 `OPPORTUNITY` 阶段。验证报告为 `docs/verification/M3-LIFECYCLE-STORY-GATE-COVERAGE-DEFINITION-report.md`。
- 治理提交 `0fda99c486694a65c1e05b96ca2aa30a4f827ecc` 已推送到 `gate/m3-lifecycle-story` 并 fast-forward 到 `origin/main`；GitHub Actions `foundation-ci` run `34548099657` 为 `success`，本任务正式收口。

## 2026-09-11 M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX

- 已完成正式 `M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX` 的最小生产修复：复用 `m3-scheduler-v2` 增加 bootstrap-wide、World-Time-only 的 WORK pre-shift preparation wake；26 名 employed resident 均可注册 preparation wake，精确 09:00 WORK 与 09:01/LATE rejection 保持不变。
- WORK targeted clean PostgreSQL 证据覆盖 wake → Observation → `WORK_PREPARATION` Goal → MOVE → Kernel completion → workplace arrival at the exact boundary → WORK → 17:00 completion；10/15-minute route、restart/requery、dedupe、weekend、unemployed、already-at-workplace、busy、pause/maintenance、stale fence 与 world isolation 均通过。
- 已将既有 Story Gate harness 接入 `m3-story-gate-coverage-v2` funnel/negative evidence collector/evaluator；TALK A/B/C/D/E cases、initiator/participant union、EAT unavailable-resource、MOVE necessity 与 `UNKNOWN = fail` 均有机器测试。证据 artifacts 位于 `docs/verification/artifacts/M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX/`。
- EAT、MOVE、TALK policy/paired-lock/topology、fixture、BUY、Kernel authority、migration/schema 与 immutable `20260910-run-08` 均未修改；没有创建新的 Story run，没有执行 M3-T05 或后续里程碑。正式报告为 `docs/verification/M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX-report.md`。
- Node 24 本地 frozen install、format/lint/typecheck/unit/build、official production audit、clean disposable PostgreSQL targeted 7/7 与完整 API integration 42/42 均通过；实现提交为 `780e491c6ee2d14bb7d44eaa8114ee2402721de9`，feature/main CI 待 PR 集成后补录。

## In progress

- M3-T01/T02/T03/T04 已 PASS；`ADR-M3-001 = PASS / ACCEPTED`；M3 仍为 `IN_PROGRESS`。
- Memory、Relationship、Economy、AI、3D、Digital Identity 与 Offline Simulation 均未执行。
- PRE-AL-GATE 已关闭；M3 仍为 `IN_PROGRESS`，不得从本 Gate 自动进入 M4+。

## Blocked

- `PRE-AL-GATE = PASS`；`M3-LIFECYCLE-STORY-GATE = FAIL`，Hard Gate #3 未通过，M3 不得关闭。
- `M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX = PASS / MAIN_CI_PENDING`；targeted DoD 已完成，待最终 main CI GREEN 后才可申请新的 immutable Gate run。
- `M3 = IN_PROGRESS` 保持；M3-T05 已由冻结规格 reconciliation 正式定义为 `DEFINED / NOT_STARTED`，不得据此执行 T05 或自动开始 M4+。

## P0/P1

- P0：0。
- `MIRROR-FIND-001` 的 Action execution result / committed event feedback 已由 PRE-AL-01 关闭；Observation/query boundary、ActorRef、Resource Bridge、MOVE/SLEEP semantics、bounded replan、scheduler/driver、M3-T04 rule decision/action loop、lease/fence、typed event/reducer、manifest/canonical state、resident projection replay 与 30×30 evidence 均已由对应 Gate 证据关闭。

## Known P2/P3

- `MIRROR-FIND-002`：`causation_id`，P2，M3/M6 前处理。
- `MIRROR-FIND-003`：细粒度、版本化 Event payload schema，P2，具体领域事件落地前处理。
- `MIRROR-FIND-004`：scheduler/heartbeat；PRE-AL-07 已关闭 deterministic domain driver，long-lived lease/heartbeat 仍为后续条件项，P2。
- 4/6/7 Needs 范围冲突已由 `ADR-M3-001` 关闭；ActionResult、Observation、ActorRef、MOVE/SLEEP、bounded replan 与 current scheduler/driver boundary 已关闭；full resident replay、typed event/reducer、manifest/canonical state、lease/fence 与 30×30 evidence 仍开放。
- GitHub Actions action Node.js 20 runtime deprecation warning 属于外部 action 提示，不影响项目代码门禁。
- 文档库 `manifest_v1.2.json` 与实际文件数量/文件名存在不一致，列为 P3，沿用 M0 文档基线记录。
- M3、Life、Memory、Relationship、Economy、AI、3D、Digital Identity、Offline Simulation 及其他后续任务均未执行。
- M3-T02 只完成纯 evaluator；ActionResult/Observation/ActorRef/Resource Bridge 已关闭；MOVE/SLEEP completion、authoritative location/activity/obligation、bounded replan、scheduler/driver 与完整 domain replay 仍是后续 M3 前置边界。

## Migrations since last state

- 新增 migration `packages/db/drizzle/0001_late_karma.sql`：`worlds.clock_anchor_at`、status/time_scale check constraints；clean migration/seed 已通过。
- 新增 migration `packages/db/drizzle/0002_wandering_moonstone.sql`：M2-T03 `action_requests` durable request metadata 与幂等唯一约束。
- 新增 migration `packages/db/drizzle/0003_cold_viper.sql`：M2-T04 `world_events`、`world_seq`、append-only 与 sequence consistency triggers。
- 新增 migration `packages/db/drizzle/0004_old_ares.sql`：M2-T05 `simulation_checkpoints`、版本/序列约束与 checkpoint position trigger。
- 新增 migrations `packages/db/drizzle/0005_previous_fabian_cortez.sql` 与 `0006_absurd_stephen_strange.sql`：Kernel Action Outcome、0/1/N event association 与 world-scoped 复合约束。
- 新增 migration `packages/db/drizzle/0009_odd_killmonger.sql`：最小 `scheduled_wake_registrations` durable wake projection、world/dedupe unique constraint 与 due indexes；未新增 generic queue/retry/lease table。
- 新增 migration `packages/db/drizzle/0010_dizzy_falcon.sql`：world-scoped `simulation_driver_leases`、owner 与 monotonic fencing token constraints。
- 当前本地 Docker 数据库已应用 10 个 migration journal entries；由于本轮及此前 integration 使用 append-only event ledger，主机存在历史测试 world/event 数据，不能作为 clean evidence，未删除或改写历史事件。PRE-AL-GATE 正式 clean evidence 使用一次性 PostgreSQL database，验证后保留容器但不作为主线 durable truth。

## API/Event changes

- M1 API skeleton 保持；新增 `GET /api/v1/worlds/:worldId` 与 development-only `POST /api/v1/worlds/:worldId/admin/time`，OpenAPI 已同步。
- 新增内部 `@mirror/contracts` ActionRequest schema；本轮没有新增 Action API、Event Ledger、WebSocket 或事件写入。
- 新增 `world_events` Event Ledger、world-local `world_seq` 与 `WORLD_TIME_ADVANCED` 事件写入；没有新增 Action API、ActionResult、Projection、Checkpoint、Replay 或 WebSocket。
- 新增内部 World Kernel Replay/Checkpoint store；没有新增 API、ActionResult、Projection、Simulator 或事件 schema 破坏性变更。
- M2 Gate 仅新增测试证据与 rollback 修复；没有新增 Action API、ActionResult、Projection、Simulator 或 M3+ 领域事实写入口。
- M3-T01 仅新增纯 deterministic resident seed fixture：30 个 `NATIVE` 居民、稳定住处/工作引用、5×6 profile、26/4 employment 与非负只读资源 fixture；没有新增居民表、运行时或 Kernel Actor 集成。
- M3-T01 的 GitHub Actions `foundation-ci` run `34215453306` 对 main commit `84a64d6` 真实 PASS；实现 commit 为 `9077be3b660f2e7ea41a5729e07d001bb68e6f07`。
- ADR-M3-001 只新增 Needs 来源审计和架构决策文档；没有新增 migration、表、API、Event Registry、seed fixture 或 runtime。
- M3-T02 新增 `packages/life-engine` 纯 evaluator 与测试；没有新增 migration、表、API、Event Registry、Action Loop 或 World Kernel 写入。
- M3-T03 新增 `packages/life-engine/src/goals.ts` 与 `goals.test.ts`，并从 `src/index.ts` 导出；没有新增 production dependency、migration、表、API、Event Registry、Action Loop 或 World Kernel 写入。
- M3-T04 只新增 `docs/verification/M3-T04-blocked-report.md`；没有新增 production dependency、migration、表、API、Event Registry、Action Loop 或 World Kernel 写入。
- PRE-AL-00 只新增 `docs/verification/PRE-AL-00-diagnostic.md`、`docs/verification/PRE-AL-00-report.md` 并格式化既有 M3-T04 blocked report；没有新增 production dependency、migration、表、API、Event Registry、Action Loop 或 World Kernel 写入。
- PRE-AL-01 新增 `kernel_action_outcomes`、`kernel_action_outcome_events`、Kernel Action Outcome contract/store、多事件事务提交与 PostgreSQL integration；没有新增 production dependency、Action API、Observation、Action Loop、replan 或 scheduler。
- PRE-AL-03 新增 shared ActorRef/resource contracts、M3 seed resolver/resource bridge 与 Observation capability wiring；没有新增 migration、table、Action API、World Event、ActionRequest、KernelActionOutcome 或 Action Loop。
- PRE-AL-04 新增 `resident_runtime_states` 与 migration `0007_flawless_mach_iv.sql`，并新增 runtime-state contract/read port、Kernel read authority、bootstrap 与 Observation wiring；没有新增 Action API、ActionRequest、KernelActionOutcome、runtime event、scheduler 或 Action Loop。
- PRE-AL-05 新增 migration `0008_curvy_tony_stark.sql` 扩展 active runtime metadata；新增 `m3-action-semantics-v1`、MOVE/SLEEP executor/completion、四类 lifecycle event 与 replay-ready payload validation；没有新增 production dependency、Action API、scheduler、replan、自动 loop 或资源写入。
- PRE-AL-06 没有新增 migration、表、World Event、Action API 或 production dependency；新增 `m3-replan-v1` contracts、纯 Failure Classification/Replan Policy 与对应 tests，不写入 Life Engine、runtime、worldSeq 或 Event Ledger。
- PRE-AL-07 新增 scheduler contracts/order、bounded due-activity read port、durable deferred-wake read/register boundary、World-Time driver 与 completion state-version fence；复用现有 Clock、Kernel Outcome、Event Ledger 与 MOVE/SLEEP events，不新增 Action API、Life Engine decision、generic queue 或 distributed worker。
- M3-T04 新增 life-engine `m3-rule-decision-v1` / `m3-action-loop-v1` 与 clean PostgreSQL action-loop integration；没有新增 migration、World Event type、Action API 或 external production dependency。
- PRE-AL-GATE 新增 `simulation_driver_leases` 与 fence-aware World Clock/Action Kernel boundary、M3 typed resident projection replay、Gate integration harness 与 machine-readable artifacts；没有新增 LLM、Economy、Memory、Relationship、3D 或第二套 Kernel/Scheduler。

## Relevant ADRs

- `docs/adr/ADR-0000-template.md`
- `docs/adr/ADR-0001-m1-t02-development-auth.md`
- M1-T02 的开发身份与生产 fail-closed 边界记录于 ADR-0001。
- `docs/adr/ADR-0002-m2-t01-world-clock.md`
- M2-T01 的 wall-clock anchor、生产 1x、Kernel 写边界与 migration 记录于 ADR-0002。
- `docs/adr/ADR-0003-m2-t02-action-contract.md`
- M2-T02 的结构化 Action Contract 字段、参数边界与后续 Kernel 分层记录于 ADR-0003。
- `docs/adr/ADR-0004-m2-t03-kernel-validation-idempotency.md`：M2-T03 validator snapshot、World Clock 输入与 PostgreSQL 幂等边界。
- `docs/adr/ADR-0005-m2-t04-event-ledger.md`：M2-T04 append-only Event Ledger、world-local seq 与 state+event 原子提交边界。
- `docs/adr/ADR-0006-m2-t05-checkpoint-replay.md`：M2-T05 replay authority、checkpoint rebuildability、canonical hash 与版本边界。
- `docs/adr/ADR-0007-m3-life-engine-needs-model-v1.md`：M3 Needs 的 CORE/DERIVED/DEFER、authority、lazy evaluation、pause、determinism、persistence/replay 与 T02 contract。
- `docs/adr/ADR-0008-pre-al-01-kernel-action-outcome.md`：Kernel execution outcome status、调用处置/transport 分离、0/1/N event association、事务、幂等与 world isolation。
- `docs/adr/ADR-0011-m3-eat-kernel-consumable-capability.md`：`ADR-M3-EAT-KERNEL-CONSUMABLE-CAPABILITY` Accepted；M3 EAT resource CAS seam。
- `docs/adr/ADR-0012-m3-talk-paired-runtime-lock.md`：`ADR-M3-TALK-PAIRED-RUNTIME-LOCK` Accepted；M3 TALK paired runtime lock。
- `docs/architecture/m3-needs-source-audit.md`：4/6/7 Needs 定义来源逐项审计。

## Verification report

- `docs/verification/M1-T02-report.md`
- `docs/verification/M1-T03-report.md`
- `docs/verification/M1-T04-report.md`
- `docs/verification/M1-T01-report.md`
- `docs/verification/M1-milestone-report.md`
- `docs/verification/M2-T01-report.md`（M2-T01 = PASS）
- `docs/verification/M2-T02-report.md`（M2-T02 = PASS）
- `docs/verification/M2-T03-report.md`（M2-T03 = PASS）
- `docs/verification/M2-T04-report.md`（M2-T04 = PASS）
- `docs/verification/M2-T05-report.md`（M2-T05 = PASS）
- `docs/verification/M2-milestone-report.md`（M2 = PASS）
- `docs/verification/M3-T01-report.md`（M3-T01 = PASS；M3 仍 IN_PROGRESS）
- `docs/architecture/m3-needs-source-audit.md`（ADR-M3-001 source audit）
- `docs/verification/M3-T02-report.md`（M3-T02 = PASS；M3 仍 IN_PROGRESS）
- `docs/verification/M3-T03-report.md`（M3-T03 = PASS；M3 仍 IN_PROGRESS）
- `docs/verification/M3-T04-blocked-report.md`（历史：M3-T04 曾 = BLOCKED_BY_PRE_ACTION_LOOP_GATE）
- `docs/verification/M3-T04-report.md`（M3-T04 = PASS；M3 仍 IN_PROGRESS）
- `docs/verification/PRE-AL-00-diagnostic.md`（CI failure evidence）
- `docs/verification/PRE-AL-00-report.md`（PRE-AL-00 = PASS；Main CI Baseline = GREEN）
- `docs/verification/PRE-AL-01-report.md`（PRE-AL-01 = PASS；Kernel Action Outcome feedback loop）
- `docs/verification/PRE-AL-03-report.md`（PRE-AL-03 = PASS；Resident ActorRef + Resource Read Bridge）
- `docs/verification/PRE-AL-04-report.md`（PRE-AL-04 = PASS；Resident Runtime State Authority）
- `docs/adr/ADR-0009-pre-al-05-action-semantics.md`（PRE-AL-05 MOVE/SLEEP lifecycle decision）
- `docs/verification/PRE-AL-05-report.md`（PRE-AL-05 = PASS；MOVE/SLEEP lifecycle）
- `docs/adr/ADR-0010-pre-al-06-bounded-replan.md`（PRE-AL-06 bounded replan/failure policy）
- `docs/verification/PRE-AL-06-report.md`（PRE-AL-06 = PASS；bounded replan/failure policy）
- `docs/adr/ADR-0010-pre-al-07-deterministic-scheduler.md`（PRE-AL-07 deterministic scheduler/driver decision）
- `docs/verification/PRE-AL-07-RES-M3-003-COMPATIBILITY.md`（RES-M3-003 compatibility matrix）
- `docs/verification/PRE-AL-07-report.md`（PRE-AL-07 = PASS；deterministic scheduler/driver）
- `docs/verification/PRE-AL-GATE-report.md`（PRE-AL-GATE = PASS；M3 仍 IN_PROGRESS）
- `docs/verification/M3-LIFECYCLE-ADR-FORMALIZATION-report.md`（治理完成记录；不含 lifecycle/T05 实现）
- `docs/verification/M3-BEHAVIORAL-LIFECYCLE-EXTENSION-report.md`（M3 Behavioral Lifecycle Extension = PASS；CI runs `34463283837`/`34463309484`/`34464013190`）
- `docs/verification/M3-LIFECYCLE-STORY-GATE-report.md`（M3-LIFECYCLE-STORY-GATE = FAIL；Hard Gate #3）
- `docs/verification/M3-LIFECYCLE-STORY-GATE-COVERAGE-CONTRACT-v2.md`（Hard Gate #3 accepted governance clarification）
- `docs/verification/M3-LIFECYCLE-STORY-GATE-COVERAGE-DEFINITION-report.md`（coverage reconciliation/registration governance report）
- M0 历史报告：`docs/verification/M0-report.md`

## Next allowed task

- `M3-LIFECYCLE-ADR-FORMALIZATION = PASS`；`M3 = IN_PROGRESS` remains.
- `M3 Behavioral Lifecycle Extension`（正式 ID：`FORMAL_TASK_REGISTERED_WITHOUT_NUMERIC_ID`）保持 `PASS`；PR #1 已合并到 main。
- `M3-LIFECYCLE-STORY-GATE = FAIL`；不存在自动下一任务。必须先由独立任务处理 Gate contract/fixture/policy coverage mismatch，再由用户明确授权新的 immutable Gate run。
- `M3-LIFECYCLE-STORY-GATE-COVERAGE-RECONCILIATION = PASS`；v2 contract 已接受，`M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX = PASS / MAIN_CI_PENDING`，下一允许任务为新的 immutable Story Gate rerun。
- `M3-T05 = DEFINED / NOT_STARTED`、M3 Final Status Review #2 与 M4+ 均未开始，不能因本 Gate 失败而自动进入。
- 不执行 M4/M5/M6/M7/M8/M9/M10，不修改冻结 research worktree，不把本 Gate 扩展为 Economy/Memory/Relationship/AI/3D 或规模验收。
