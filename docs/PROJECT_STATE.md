# PROJECT_STATE

Current milestone: M2 World Kernel
Current task: M2-T01 世界时钟
Status: IN_PROGRESS
Last verified implementation commit: pending

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
- M1 API/Web 回归、lint、typecheck、test、build 与官方 npm audit 已通过；GitHub Actions 最终结果待本轮提交后补录。

## In progress

- M2-T01 已完成本地实现与验证，等待最终 GitHub Actions 结果后关闭本任务。

## Blocked

- 无。

## P0/P1

- 未发现已确认的 P0/P1。

## Known P2/P3

- 文档库 `manifest_v1.2.json` 与实际文件数量/文件名存在不一致，沿用 M0 文档基线记录。
- GitHub Actions action Node.js 20 runtime deprecation warning 属于外部 action 提示，不影响项目代码门禁。
- M2-T02 及后续任务均未实现；本轮只执行 M2-T01。

## Migrations since last state

- 新增 migration `packages/db/drizzle/0001_late_karma.sql`：`worlds.clock_anchor_at`、status/time_scale check constraints；clean migration/seed 已通过。
- 当前本地数据库基线为 `migrations=2`、`users=1`、`worlds=1`；world fact 仍由 PostgreSQL 保存，Redis 未存时钟事实。

## API/Event changes

- M1 API skeleton 保持；新增 `GET /api/v1/worlds/:worldId` 与 development-only `POST /api/v1/worlds/:worldId/admin/time`，OpenAPI 已同步。
- 本轮没有新增 Event Ledger、ActionRequest、WebSocket 或事件写入；时钟写入只经过 `@mirror/world-kernel`。

## Relevant ADRs

- `docs/adr/ADR-0000-template.md`
- `docs/adr/ADR-0001-m1-t02-development-auth.md`
- M1-T02 的开发身份与生产 fail-closed 边界记录于 ADR-0001。
- `docs/adr/ADR-0002-m2-t01-world-clock.md`
- M2-T01 的 wall-clock anchor、生产 1x、Kernel 写边界与 migration 记录于 ADR-0002。

## Verification report

- `docs/verification/M1-T02-report.md`
- `docs/verification/M1-T03-report.md`
- `docs/verification/M1-T04-report.md`
- `docs/verification/M1-T01-report.md`
- `docs/verification/M1-milestone-report.md`
- `docs/verification/M2-T01-report.md`
- M0 历史报告：`docs/verification/M0-report.md`

## Next allowed task

- M2-T02；只记录，不执行，直到 M2-T01 最终 Gate 完成。
