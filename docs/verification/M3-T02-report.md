# M3-T02 Verification Report

## Result

`M3-T02 = PASS`。`M3 = IN_PROGRESS`。

本任务实现了纯 deterministic Needs evaluator，并严格按 `ADR-M3-001` 将 M3 v1 收敛为三个 CORE pressure。没有实现 Goal、Candidate Action、Action Loop、ActionResult、scheduler、Memory、Relationship、Economy、AI 或 3D。

## Task and source boundary

- Task ID：`M3-T02`
- 原始目标：Needs 模型；原始任务列出的历史字段为 `energy/hunger/social/stress/money_pressure/purpose`，要求随时间变化、值域 `0..100`、tick 稳定。
- 当前执行事实源：`docs/adr/ADR-0007-m3-life-engine-needs-model-v1.md`（`ADR-M3-001 = PASS / ACCEPTED`）。
- 研究辅助：RES-M3-001、RES-M3-002；研究中的 30×30 是后续完整 Life Engine 验收，不在本任务伪造为已完成。

## Actual implementation

新增 `packages/life-engine`：

- `src/needs.ts`：纯 `evaluateNeeds` 与 stable-order `evaluateResidentsNeeds`。
- `src/needs.test.ts`：M3-T02 contract、边界和 M3-T01 fixture 集成测试。
- `package.json`、TypeScript 配置；无新增 production dependency。
- `pnpm-lock.yaml`：仅增加 workspace importer，无外部生产依赖版本变化。

## ADR-0007 compliance

### CORE Needs

仅实现：

- `HungerPressure`
- `RestPressure`
- `SocialPressure`

统一语义为 `0 = satisfied`、`100 = critical`，所有输出都 clamp 在 `0..100`。

### Derived and deferred

- `EnergyLevel = 100 - RestPressure`，同源派生，不独立衰减、不独立持久化。
- `conditionBand` 是基于三个 CORE pressure 的派生分类，使用 policy hysteresis。
- `stress`、`safety`、`money_pressure`、`purpose` 未实现。
- `foodUnits`、`cashCents` 没有被 evaluator 读取或修改；资源不等于 Need。

### NeedPolicy

- 版本：`m3-needs-v1`
- calibration baseline 集中在 `NEED_POLICY_V1`，不是不可改变的 World Law。
- 起始速率：清醒时 hunger 约 `+0.45/hour`、rest 约 `+4/hour`、social 约 `+0.35/hour`；RESTING 时 hunger 约 `+0.15/hour`、rest 约 `-12/hour`。
- 稳定个体差异使用 `[0.96, 1.04]` 的 SHA-256 派生 variation，并由 T01 resident/profile 输入调制；没有 `Math.random()`。
- band threshold 与 activation/release hysteresis 也集中在 policy：`40/30`、`70/60`、`90/80`。

## Time, anchor and authority

- 输入是 `World Time`、world status、resident seed/profile、Need Anchor 和 policy version。
- `RUNNING` 只按 `currentWorldTime - anchor.worldTime` lazy 计算；时间回退按零 elapsed 处理。
- `PAUSED` / `MAINTENANCE` 强制零 elapsed，Need 不推进。
- anchor 是某次权威输入/accepted result 后的重算起点，不是每分钟历史；进食、休息、社交的未来 committed result 由调用方形成新的 anchor。
- evaluator 不写世界时间、位置、资源、关系、event ledger 或 ActionRequest；没有 Goal→Action 旁路。
- evaluator 不读取 wall clock；实现没有 `Date.now()`、`new Date()`、`performance.now()`、timer 或进程状态。

## Persistence, database, events and replay

- 采用 pure evaluator + lazy anchor；没有 Needs 表、migration、repository、runtime tick 或 cache truth。
- 没有新增 Event Registry，也不产生 `HUNGER_CHANGED`、`REST_CHANGED` 或 `SOCIAL_CHANGED` 高频事件。
- 连续 Need 值可由 anchor、World Time、resident/profile 和 policy 重建；重放不依赖进程内 tick 历史。
- 相同 world/resident/anchor/status/time/policy 输入得到相同结果；批量评估按 `residentId` 显式排序，独立于输入遍历顺序。
- M2 Event Ledger、Checkpoint/Replay 和 Kernel 写入边界未修改。

## 30-resident fixture and performance

- 复用 M3-T01 `generateResidentSeed`，不创建第二份居民名单。
- 30 个 `NATIVE` resident 全部成功评估三个 CORE Needs；测试覆盖无 NaN、无 Infinity、无超界、stable ordering、stable variation 和重复计算一致性。
- 纯 evaluator benchmark：30 residents × 1000 次，`0.08 ms/evaluation`；1000 synthetic residents × 100 次，`2.5004 ms/evaluation`。这不是 30×30 simulation，也不证明完整 Action Loop。

## Verification evidence

### TDD and package checks

- 先运行失败测试：stub evaluator 下 7 项断言失败，静态边界测试通过。
- 实现后 `@mirror/life-engine`：10 tests PASS。
- package lint、typecheck、build：PASS。

### Repository regression

- `pnpm install --frozen-lockfile`：PASS
- `pnpm lint`：PASS
- `pnpm typecheck`：PASS
- `pnpm test`：PASS；DB 6、Contracts 15、World Kernel 25、Web 3、API 6、Life Engine 10
- `pnpm build`：PASS
- Docker PostgreSQL/Redis/MinIO：healthy
- `pnpm db:setup`：PASS
- clean temporary PostgreSQL migration/seed + M2 integration：PASS，World Clock/Event Ledger/Replay-Checkpoint/Action Request `4/4`
- `pnpm audit --prod --registry=https://registry.npmjs.org/`：PASS，No known vulnerabilities found；HIGH=0、CRITICAL=0

复用已有 append-only 主库的第一次 Replay integration 因历史时间事件链已存在而拒绝，随后使用明确命名的临时 clean database 重跑并完整通过；临时数据库已清理，没有删除主库历史事件。

### CI

- implementation commit：`b4518859482301a95732734f599441d8bc9d74a3`
- GitHub Actions `foundation-ci`： [run 34220974174](https://github.com/zl2796195822/mirror-world/actions/runs/34220974174)，success
- 本次实现验证对应的 main HEAD：`b4518859482301a95732734f599441d8bc9d74a3`

## Risk levels and known blockers

- P0：0。
- 新增 P1：0。
- 继承 P1：`MIRROR-FIND-001` ActionResult/committed-event feedback；Observation、ActorRef、MOVE/SLEEP completion、bounded replan、scheduler/driver 与完整 resident/domain replay 仍未关闭。这些不是本纯 evaluator 的实现范围，但在 M3 Action Loop/Gate 前必须处理。
- P2：`causation_id`、版本化领域 Event payload、scheduler/heartbeat 边界，按既有状态保留。
- P3：文档库 manifest 文件数量/文件名不一致；GitHub Actions 外部 action 的 Node.js 20 runtime warning。

## State and next step

- `PROJECT_STATE.md` 已同步为 `M3-T02 = PASS`、`M3 = IN_PROGRESS`。
- `MEMORY.md` 已记录实现、验证、边界和未决问题。
- `ADR-0007` 保持 `Accepted`，没有因 calibration 修改核心架构决策。
- 下一允许任务仅为 `M3-T03`，本轮不执行。
