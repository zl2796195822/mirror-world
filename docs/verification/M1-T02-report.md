# M1-T02 验证报告

## 结论

`M1-T02 = IMPLEMENTED_UNVERIFIED`

本地实现与产品验收已通过；GitHub Actions 远程验证将在提交并 push 后执行，当前报告先保留为未完成远程验证状态。本报告只覆盖 M1-T02，不执行 M1-T03、M1-T04、M2 或任何后续任务。

## Task ID

`M1-T02`

## 文档中的原始目标

M1-T02「开发身份」要求：

- 提供开发环境 seed 用户。
- 预留 Auth Adapter 边界。
- 生产环境禁用免登录开发身份。
- 通过环境变量切换开发身份；生产构建不得误开启 dev auth。

真实身份、真人扫描、数字人、代理、World Overview 数据、API skeleton、World Kernel、Life、Memory、Economy、AI、3D 与第一条街均不属于本任务。

## 实际目标与实现

- 在 `NODE_ENV=development` 且 `MIRROR_DEV_AUTH=true` 时提供 M0 seed 用户 `dev@mirror.local`。
- 使用 `AuthAdapter` 接口隔离当前开发适配器，为后续真实认证保留替换边界。
- 使用 HttpOnly、SameSite=Strict 的开发会话 cookie 保存 seed 用户会话；适配器会校验环境和用户 ID。
- 受保护路由在没有有效开发会话时统一重定向到 `/login`。
- 登录页明确标注“开发环境 seed 用户”；真实认证尚未接入时显示不可用状态，不伪造身份或世界数据。
- Shell 在已认证状态显示开发身份和退出操作，未认证状态隐藏世界导航。
- `@mirror/web` production build 在 `MIRROR_DEV_AUTH=true` 时 fail-closed；未设置或为 `false` 时构建成功。

## 允许范围与禁止范围

### 允许

- `apps/web` 的开发身份、会话边界、登录入口和受保护路由。
- 必要的环境模板、构建守门、测试、项目文档和 ADR。

### 禁止且未实现

- M1-T03 World Overview 数据。
- M1-T04 API skeleton。
- 真实登录、OAuth、密码、真人身份、摄像头扫描、人脸/声音原始数据、Avatar、Proxy。
- World Kernel、Life Engine、Memory Engine、Economy、AI Agent、离线模拟、3D 第一条街。
- 任何 UI 事实写入、数据库 schema/migration、Redis durable truth 或世界事件写入。

## 修改文件

- `.env.example`
- `.gitignore`
- `AGENTS.md`
- `README.md`
- `apps/web/.env.example`
- `apps/web/package.json`
- `apps/web/app/actions/auth.ts`
- `apps/web/app/components/shell.tsx`
- `apps/web/app/events/page.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/login/page.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/residents/page.tsx`
- `apps/web/app/settings/page.tsx`
- `apps/web/app/world/page.tsx`
- `apps/web/lib/auth/adapter.ts`
- `apps/web/lib/auth/config.ts`
- `apps/web/lib/auth/require-user.ts`
- `apps/web/lib/auth/session.ts`
- `apps/web/scripts/validate-production-env.mjs`
- `apps/web/scripts/validate-production-env.test.mjs`
- `docs/adr/ADR-0001-m1-t02-development-auth.md`
- `docs/PROJECT_STATE.md`
- `docs/verification/M1-T02-report.md`
- `MEMORY.md`

未修改 `pnpm-lock.yaml`；没有新增第三方依赖，因此 `docs/third-party/THIRD_PARTY_REGISTER.md` 无变化。

## 设计稿映射

- `UI/D组_世界外固定UI/D01_身份创建入口.jpg`：仅参考世界外身份入口的注意力层级和入口气质。
- 未实现 D01 的真人身份创建、摄像头扫描、人脸/声音、Avatar 或身份保险库。
- A01-A04 与其他设计稿没有被实现为页面；本任务没有提前进入 Temporal 或 Intelligence。

## 架构决策

- 认证边界通过 `AuthAdapter` 表达；当前实现只服务本地开发 seed 用户。
- 会话不是事实源。当前 cookie 只携带已知 seed 用户 ID，服务端每次请求仍校验开发环境和 ID。
- PostgreSQL 仍是 durable truth；本任务不读取/写入业务事实，不改变 World Kernel、Redis 或数据库 schema。
- 生产构建 fail-closed，生产运行只呈现“身份认证不可用”，不提供免登录入口。
- 详细决策见 [`docs/adr/ADR-0001-m1-t02-development-auth.md`](../adr/ADR-0001-m1-t02-development-auth.md)。

## 自动化验证

| 检查                                                   | 结果               | 证据                                                                                  |
| ------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------- |
| `pnpm lint`                                            | PASS               | `@mirror/db`、`@mirror/web` lint 与 Prettier 全部通过                                 |
| `pnpm typecheck`                                       | PASS               | 两个 workspace 类型检查通过                                                           |
| `pnpm test`                                            | PASS               | DB 1 个测试 + Web production guard 2 个测试，共 3 个测试通过                          |
| `MIRROR_DEV_AUTH=true pnpm --filter @mirror/web build` | PASS（按预期失败） | production guard 阻断构建，退出码 1，明确报错不允许 dev auth                          |
| `NODE_ENV=production MIRROR_DEV_AUTH=false pnpm build` | PASS               | DB build 与 Next.js 16.3.4 production build 成功                                      |
| Production dependency audit                            | N/A                | 本任务未新增 production dependency；沿用 M1-T01 官方 registry 结果 HIGH=0、CRITICAL=0 |
| Database migration                                     | NO DATABASE CHANGE | 未修改 schema、migration 或数据库写入路径                                             |

## Docker 与数据库

- PostgreSQL：healthy。
- Redis：healthy。
- MinIO：healthy。
- 只读核对：M0 seed 用户为 `00000000-0000-4000-8000-000000000001|dev@mirror.local|ACTIVE`。
- migration/seed 状态未改变；本任务明确为 `NO DATABASE CHANGE`。

## 浏览器产品验收

使用真实 Playwright 浏览器，开发服务为 `http://localhost:3100`，设置 `MIRROR_DEV_AUTH=true`：

- 未登录访问 `/world` 重定向到 `/login`。
- 登录页只显示明确标注的开发环境 seed 用户 `dev@mirror.local`。
- 点击“以开发身份进入”后进入 `/world`；Shell 显示“开发身份”、邮箱与“退出”。
- 浏览器上下文 cookie 核验：`httpOnly=true`、`sameSite=Strict`、`secure=false`（仅本地 HTTP 开发环境）；`document.cookie` 返回空字符串，证明脚本不可读。
- 刷新 `/world` 后仍保持身份；退出后回到 `/login` 且 cookie 清除。
- 手工注入无效会话值后访问 `/world` 重定向 `/login`，未接受任意 cookie 作为身份。
- 1440×1000：`/`、`/world`、`/residents`、`/events`、`/settings` 的 `scrollWidth=1440`、`bodyScrollWidth=1440`。
- 390×844：上述五个路由的 `scrollWidth=390`、`bodyScrollWidth=390`。
- 路由内容保持真实空状态；未出现居民自主生活、世界模拟、AI 分析或已发生事件等伪数据。
- 开发服务浏览器 console：Errors=0、Warnings=0；页面错误=0。
- production 服务 `http://localhost:3200`（`MIRROR_DEV_AUTH=false`）显示“身份认证不可用”；访问 `/world` 重定向 `/login`，console Errors=0、Warnings=0，未出现开发登录按钮。
- 基础可访问性：使用语义化 `nav/main/footer`、可访问按钮名称，键盘 Tab 可聚焦交互元素。

人工查看截图只用于本地验收，未作为源码资产提交：

- `output/playwright/m1-t02-production-login-390.png`
- `output/playwright/m1-t02-world-1440.png`

## GitHub Actions

- 首次 run `34174320461`：FAIL。公开 run 页面确认 `foundation` Job 在 `Lint and format` 步骤失败；本地重新执行 `pnpm lint` 复现为本报告未经过 Prettier 的格式错误，已在本次修复中格式化报告。
- 当前状态：已修复，待 push 本次文档修复提交后重新执行。
- workflow：沿用 `foundation-ci`，应真实执行 install、lint、typecheck、unit tests、build。
- 首次失败 run URL：<https://github.com/zl2796195822/mirror-world/actions/runs/34174320461>
- 最终 PASS run URL：待 push 后记录。
- commit SHA：实现提交为 `c6f8d63ec0445c8dc83c32869830cf5f07742af0`；最终验证提交待记录。
- Job 状态：待真实 run 后记录。

## 未完成项

- 远程 GitHub Actions 尚未对本任务提交执行；因此当前结论不能升级为 PASS。
- 真实身份认证仍未接入，属于后续任务能力，不是本任务遗漏。

## 已知问题

- 开发会话 cookie 不是生产认证方案；接入真实认证时必须替换适配器和会话机制并重新进行安全审查。
- 生产环境当前没有真实认证能力，因此只能诚实显示 unavailable。

## DoD checklist

- [x] M1-T02 原始目标已按文档执行：开发身份。
- [x] 开发环境 seed 用户可用且明确标注为开发身份。
- [x] Auth Adapter 已预留。
- [x] 环境变量可切换开发身份。
- [x] 生产运行默认关闭开发免登录。
- [x] `MIRROR_DEV_AUTH=true` 的 production build fail-closed。
- [x] 有效开发会话可登录、刷新保持并退出。
- [x] 无效会话不会被接受。
- [x] 未认证时受保护路由重定向，世界导航隐藏。
- [x] 后端未提供能力以真实 unavailable/empty 状态呈现。
- [x] 未新增数据库 schema、migration、API、world event 或事实写入通道。
- [x] 未实现 M1-T03、M1-T04、M2 或任何禁止范围。
- [x] lint、typecheck、test、build 本地真实通过。
- [x] 浏览器桌面/移动端与 production fail-closed 验收通过。
- [ ] GitHub Actions 对最终提交真实执行并 PASS。
- [ ] 最终 commit SHA、run URL 与各 Job 状态已写入本报告。

## Commit

- M1-T02 实现 commit SHA：待提交。
- GitHub Actions 最终验证提交 SHA：待远程 run 后记录。
