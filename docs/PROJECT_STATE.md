# PROJECT_STATE

Current milestone: M1
Current task: M1-T01 Next.js 产品壳
Status: PASS
Last verified implementation commit: 8b486e7a3ce8798502fc5907e7babd43b12d20ba

## Completed

- M0 工程地基、数据库、Docker 依赖、官方 production audit 与 GitHub Actions 基线已通过。
- 已完成 M1-T01 Next.js App Router 产品壳：深色低密度视觉、首页、世界、居民、事件、设置导航及非游戏 HUD。
- 已通过 1440px 桌面宽度与 390px 移动宽度的真实生产构建浏览器验证，所有路由无横向溢出。
- 所有未接入后端能力均显示诚实空状态；产品壳不连接数据库、Redis、API 或 World Kernel，也不写入世界事实。
- 已登记 M1-T01 新增的 Next.js、React、React DOM 与 React 类型依赖；许可证均为 MIT。

## In progress

- 无。M1-T01 已完成。

## Blocked

- 无。

## P0/P1

- 未发现已确认的 P0/P1。

## Known P2/P3

- 文档库 `manifest_v1.2.json` 与实际文件数量/文件名存在不一致，沿用 M0 文档基线记录。
- M1-T02 开发身份/登录、M1-T03 World Overview 数据、M1-T04 API skeleton 及后续任务均未实现，属于当前范围外。

## Migrations since last state

- 无。M1-T01 只实现产品壳，没有数据库 schema 或 migration 变更。
- M0 基线数据库只读核对仍为 `migrations=1`、`users=1`、`worlds=1`。

## API/Event changes

- 无。产品壳不调用业务 API、不产生 world event，也不建立绕过 World Kernel 的事实写入路径。

## Relevant ADRs

- `docs/adr/ADR-0000-template.md`
- M1-T01 未产生需要新增 ADR 的持久化或事实写入架构变更；架构边界记录于 M1-T01 验证报告。

## Verification report

- `docs/verification/M1-T01-report.md`
- M0 历史报告：`docs/verification/M0-report.md`

## Next allowed task

- M1-T02；本轮未执行，禁止提前进入 M1-T03、M1-T04 或 M2。
