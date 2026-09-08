# PROJECT_STATE

Current milestone: M2 World Kernel
Current task: M2-T05 Checkpoint / Replay
Status: PASS
Last verified implementation commit: 838c6e5eede3aaf413c5a9966893444ae7cb92ad

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

## In progress

- M2-T05 已完成本地与远程 Gate；本轮停止，不执行 M2 Milestone Gate、M3 或任何后续任务。

## Blocked

- 无。

## P0/P1

- 未发现已确认的 P0/P1。

## Known P2/P3

- 文档库 `manifest_v1.2.json` 与实际文件数量/文件名存在不一致，沿用 M0 文档基线记录。
- GitHub Actions action Node.js 20 runtime deprecation warning 属于外部 action 提示，不影响项目代码门禁。
- M3、Life、Memory、Relationship、Economy、AI、3D、Digital Identity、Offline Simulation 及其他后续任务均未执行。

## Migrations since last state

- 新增 migration `packages/db/drizzle/0001_late_karma.sql`：`worlds.clock_anchor_at`、status/time_scale check constraints；clean migration/seed 已通过。
- 新增 migration `packages/db/drizzle/0002_wandering_moonstone.sql`：M2-T03 `action_requests` durable request metadata 与幂等唯一约束。
- 新增 migration `packages/db/drizzle/0003_cold_viper.sql`：M2-T04 `world_events`、`world_seq`、append-only 与 sequence consistency triggers。
- 新增 migration `packages/db/drizzle/0004_old_ares.sql`：M2-T05 `simulation_checkpoints`、版本/序列约束与 checkpoint position trigger。
- 当前本地数据库为 `migrations=4`、`users=1`、`worlds=1`、`action_requests=0`；`world_events` 保留真实 integration 追加的 20 条账本事件，world 已恢复 `PAUSED/1x`，checkpoint 表为空，world fact 与 event ledger 均由 PostgreSQL 保存。

## API/Event changes

- M1 API skeleton 保持；新增 `GET /api/v1/worlds/:worldId` 与 development-only `POST /api/v1/worlds/:worldId/admin/time`，OpenAPI 已同步。
- 新增内部 `@mirror/contracts` ActionRequest schema；本轮没有新增 Action API、Event Ledger、WebSocket 或事件写入。
- 新增 `world_events` Event Ledger、world-local `world_seq` 与 `WORLD_TIME_ADVANCED` 事件写入；没有新增 Action API、ActionResult、Projection、Checkpoint、Replay 或 WebSocket。
- 新增内部 World Kernel Replay/Checkpoint store；没有新增 API、ActionResult、Projection、Simulator 或事件 schema 破坏性变更。

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
- M0 历史报告：`docs/verification/M0-report.md`

## Next allowed task

- M2 Milestone Gate；本轮只完成 M2-T05，不执行 M2 Milestone Gate、M3 或任何后续任务。
