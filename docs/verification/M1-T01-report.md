# M1-T01 验证报告

## 结论

`M1-T01 = PASS`

本报告只覆盖 M1-T01「Next.js 产品壳」。M1-T02、M1-T03、M1-T04、M2 及其后续任务均未执行。

## Task ID

`M1-T01`

## 实际目标

按项目文档原始定义完成 Next.js 产品壳：

- 深色、简洁、低信息密度的 UI。
- 首页、世界、居民、事件、设置五个导航上下文。
- 非游戏 HUD。
- 在桌面 1440px 与移动宽度下不横向溢出。

## 本轮范围与禁止项

允许修改范围为 `apps/web` 产品壳、必要的 workspace/构建/忽略配置、README、第三方依赖登记及本任务验证文档。禁止实现开发身份/登录、World Overview 数据、业务 API、World Kernel、真实居民/事件、3D、AI、数字人、模拟器、Worker、M1-T02 及任何后续任务。

## 修改文件

- `.gitignore`
- `.prettierignore`
- `AGENTS.md`
- `README.md`
- `eslint.config.mjs`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `turbo.json`
- `docs/third-party/THIRD_PARTY_REGISTER.md`
- `apps/web/AGENTS.md`
- `apps/web/CLAUDE.md`
- `apps/web/package.json`
- `apps/web/next-env.d.ts`
- `apps/web/tsconfig.json`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/icon.svg`
- `apps/web/app/components/nav-link.tsx`
- `apps/web/app/components/shell.tsx`
- `apps/web/app/components/context-empty.tsx`
- `apps/web/app/world/page.tsx`
- `apps/web/app/residents/page.tsx`
- `apps/web/app/events/page.tsx`
- `apps/web/app/settings/page.tsx`
- `docs/PROJECT_STATE.md`
- `docs/verification/M1-T01-report.md`
- `MEMORY.md`

验证产生的 `.playwright-cli/` 文件被 `.gitignore` 排除，没有进入源码仓库。

## 实现说明

- 使用 Next.js App Router 建立 `apps/web`，根布局提供统一产品壳、品牌、导航和页脚。
- 五个导航项分别进入 `/`、`/world`、`/residents`、`/events`、`/settings`，当前上下文通过 `aria-current="page"` 表达。
- 首页表达 WORLD 观察入口；其余路由使用共享的诚实空状态组件表达当前后端能力尚未接入。
- 没有居民、事件、世界运行状态、AI 分析或模拟进行中的伪造数据。
- 没有数据库、Redis、业务 API 或 World Kernel 依赖，也没有任何事实写入。
- 本地 SVG favicon 仅用于消除生产构建浏览器的缺失资源错误，不引入第三方资产。

## 架构决策

- UI 作为世界观察上下文，而不是四个独立传统 Dashboard 页面；WORLD / CONTEXT / TEMPORAL / INTELLIGENCE 只表达信息层级和视觉语言。
- 产品壳是只读呈现层，未来世界事实仍必须由 PostgreSQL durable truth 与 World Kernel 提供；Redis 不参与事实存储。
- 本任务没有数据库 schema、migration、API 或事件架构变更，因此不新增 ADR。

## 验证结果

| 检查                                                      | 结果 | 真实证据                                                         |
| --------------------------------------------------------- | ---- | ---------------------------------------------------------------- |
| `pnpm install`                                            | PASS | workspace 依赖安装完成，lockfile 已是最新                        |
| `pnpm lint`                                               | PASS | 两个 workspace lint 通过，Prettier 检查通过                      |
| `pnpm typecheck`                                          | PASS | `@mirror/db` 与 `@mirror/web` 类型检查通过                       |
| `pnpm test`                                               | PASS | 1 个测试文件、1 个测试通过                                       |
| `pnpm build`                                              | PASS | Next.js 16.3.4 生产构建成功，五个产品路由及 `/icon.svg` 静态生成 |
| `pnpm audit --prod --registry=https://registry.npmjs.org` | PASS | `No known vulnerabilities found`；HIGH=0、CRITICAL=0             |
| Docker service health                                     | PASS | PostgreSQL、Redis、MinIO 均为 `Up ... (healthy)`                 |
| DB baseline read-only check                               | PASS | `migrations=1`、`users=1`、`worlds=1`                            |
| 数据库 migration                                          | N/A  | 本任务未修改 schema 或 migration                                 |
| GitHub Actions `foundation-ci`                            | PASS | run `34152773928`；`foundation` Job success                      |

### 浏览器与人工验证

基于新生成的生产构建，在 `http://localhost:3100` 使用真实 Playwright 浏览器验证：

- 1440×1000：`/`、`/world`、`/residents`、`/events`、`/settings` 均 `scrollWidth = clientWidth = 1440`，无横向溢出。
- 390×844：上述五个路由均 `scrollWidth = clientWidth = 390`，无横向溢出。
- 桌面路由检查确认五项导航存在，当前路由只有对应导航项带 `aria-current="page"`。
- 首页有 5 个导航链接；所有页面保持真实空状态；未出现“居民正在”“事件已经”“正在模拟”“AI 已经分析”或“运行中”等假能力文案。
- 浏览器最终 console：Errors=0，Warnings=0。

### GitHub Actions

- run URL：<https://github.com/zl2796195822/mirror-world/actions/runs/34152941758>
- commit SHA：`e6a6af00397de633ea9fd20cc4426583ec0f5ffe`
- Job `foundation`：PASS（completed / success）。
- `Install dependencies`：PASS。
- `Lint and format`：PASS。
- `Typecheck`：PASS。
- `Unit tests`：PASS。
- `Build`：PASS。

## 未完成项

- M1-T02 开发身份/登录未实现。
- M1-T03 World Overview 数据未实现。
- M1-T04 API skeleton 未实现。
- 居民、事件、世界模拟、AI、3D、数字人及 M2+ 能力均未实现；这些不是 M1-T01 的缺口，而是明确禁止的范围外任务。

## 已知问题

- M0 已知的文档库 `manifest_v1.2.json` 与实际文件数量/文件名不一致问题仍存在，不影响本任务产品壳。
- 本机没有 `gh` CLI；本次 run 使用 GitHub Actions REST API 读取了真实完成状态和步骤结果。

## DoD checklist

- [x] Next.js 产品壳已实现。
- [x] 深色、简洁、低信息密度 UI 已实现。
- [x] 首页、世界、居民、事件、设置导航已实现。
- [x] 非游戏 HUD；没有等级、任务、血条或 KPI 游戏化信息。
- [x] 1440px 桌面宽度无横向溢出。
- [x] 390px 移动宽度无横向溢出。
- [x] 后端尚未提供的数据以诚实空状态呈现。
- [x] lint、typecheck、test、build 全部真实通过。
- [x] 新增依赖已完成官方 npm registry production audit，HIGH=0、CRITICAL=0。
- [x] GitHub Actions 对本次提交真实执行，install、lint、typecheck、test、build 全部 PASS。
- [x] 相关文档与项目记忆已更新。
- [x] 未新增数据库变更，未绕过 World Kernel，未实现 M1-T02 或后续任务。

## Commit

- M1-T01 实现 commit SHA：`8b486e7a3ce8798502fc5907e7babd43b12d20ba`
- 文档首次同步 commit SHA：`5d2b6481c906846e35372755c747a09c70b10fac`
- GitHub Actions 最终已验证提交 SHA：`e6a6af00397de633ea9fd20cc4426583ec0f5ffe`
