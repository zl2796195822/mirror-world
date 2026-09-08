# PROJECT_STATE

Current milestone: M1
Current task: M1 Milestone Gate
Status: PASS
Last verified implementation commit: 15c02dfd43067bdfadb242e27ba777c4a78c7a19

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

## In progress

- 无；M1 已完成 Milestone Gate 并通过，本轮停止于 M1，不进入 M2。

## Blocked

- 无。

## P0/P1

- 未发现已确认的 P0/P1。

## Known P2/P3

- 文档库 `manifest_v1.2.json` 与实际文件数量/文件名存在不一致，沿用 M0 文档基线记录。
- GitHub Actions action Node.js 20 runtime deprecation warning 属于外部 action 提示，不影响项目代码门禁。
- M2 及后续任务均未实现；下一允许任务只记录为 M2-T01。

## Migrations since last state

- NO DATABASE CHANGE。M1-T04 未修改数据库 schema/migration；仅新增只读数据库查询与 readiness 检查。
- M0 基线数据库只读核对仍为 `migrations=1`、`users=1`、`worlds=1`。

## API/Event changes

- 新增 M1 API skeleton 只读路由与 OpenAPI；无 Event Ledger、ActionRequest 或世界事实写入。
- 没有新增 API 写入路径；未来世界事实仍必须经 World Kernel。

## Relevant ADRs

- `docs/adr/ADR-0000-template.md`
- `docs/adr/ADR-0001-m1-t02-development-auth.md`
- M1-T02 的开发身份与生产 fail-closed 边界记录于 ADR-0001。

## Verification report

- `docs/verification/M1-T02-report.md`
- `docs/verification/M1-T03-report.md`
- `docs/verification/M1-T04-report.md`
- `docs/verification/M1-T01-report.md`
- `docs/verification/M1-milestone-report.md`
- M0 历史报告：`docs/verification/M0-report.md`

## Next allowed task

- M2-T01；只记录，不执行。
