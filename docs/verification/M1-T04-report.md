# M1-T04 验证报告

## 结论

`M1-T04 = PASS`

本报告只覆盖 M1-T04「API skeleton」。M2、World Kernel、Event Ledger、ActionRequest 世界事实提交、Life、Memory、Relationship、Economy、AI、离线模拟、3D、数字人及其他后续能力均未实现。

## Task ID

`M1-T04`

## 文档中的原始目标

《镜界 Codex 里程碑任务书》与《M0-M13 实施规格与依赖矩阵》中的原始任务正文为：

> M1-T04 | API skeleton | Fastify /health /ready /worlds；统一 error envelope/requestId | OpenAPI 生成成功；错误格式一致

相关接口专项规范同时要求：

- 正式 API 固定使用 `/api/v1` 版本前缀。
- OpenAPI 从已注册契约生成/同步。
- 所有请求带 `requestId`；写操作不能绕过 World Kernel。
- `/api/v1/health` 只做存活检测；`/api/v1/ready` 做依赖就绪检测。

## M1 中的作用

M1 的阶段目标是让用户进入镜界壳、看到空世界、开发状态和时间。M1-T04 在此基础上提供最小、可验证的服务端入口与接口契约：暴露进程存活、数据库就绪和世界元信息只读能力，为后续接入查询层保留正式版本化边界；不提供任何世界事实写入能力。

## 允许范围与明确禁止项

本轮只实现：

- `apps/api` Fastify 服务。
- `GET /api/v1/health`、`GET /api/v1/ready`、`GET /api/v1/worlds`。
- 隐藏的短路径兼容入口 `/health`、`/ready`、`/worlds`；正式契约仍以 `/api/v1` 为准。
- `GET /openapi.json` 及构建时 OpenAPI 生成。
- 统一成功 `{ data, requestId }` 和错误 `{ error: { code, message, requestId, details? } }` envelope。
- `x-request-id` 请求头回显/自动生成。
- 数据库不可用时 `/ready` 与 `/worlds` fail-closed 返回 503。

明确未实现：

- World Kernel、Event Ledger、ActionRequest、世界时间推进、居民行为、Memory、Relationship、Economy、AI、Offline Simulation。
- UI 写世界事实、API 直接更新领域表、Redis durable truth、任何页面到数据库世界状态更新路径。
- 真实用户体系、Digital Identity、Resident Identity、代理、3D、第一条街、数字人及 M2+ 能力。

## 涉及模块与路由

- 模块：`apps/api`、现有 `packages/db` 的只读查询入口、Turbo workspace 验证编排。
- 正式路由：`/api/v1/health`、`/api/v1/ready`、`/api/v1/worlds`。
- 运维文档路由：`/openapi.json`。
- 兼容路由：`/health`、`/ready`、`/worlds`，均不进入 OpenAPI 文档。

## 产品与 UI 设计映射

M1-T04 不新增可见 UI，不把 API 设计成传统 Dashboard 页面，也不改变 M1-T03 的 Ambient Spatial Interface。既有 Web 产品壳与 `/world` 做了真实浏览器回归，截图仅记录实现回归结果，不以设计稿替代实现：

- [Desktop 1440×1000](screenshots/M1-T04/world-overview-1440.png)
- [Mobile 390×844](screenshots/M1-T04/world-overview-390.png)

对应产品/UIUX/设计稿仅作为既有交互状态、信息层级与 WORLD FIRST 边界的回归依据；本任务没有将设计稿复制成固定 API 页面。

## 认证影响

无认证架构变化。M1-T02 的开发身份、Auth Adapter、HttpOnly session、刷新保持、logout、invalid cookie 拒绝、受保护 `/world` 和 production fail-closed 均保留。M1-T04 不解释 cookie 为世界身份，不新增 Digital Identity 或 Resident Identity；这些只读骨架接口也不建立真实身份体系。

## 架构影响

- `/health` 只返回进程状态，不访问数据库。
- `/ready` 仅执行 `select 1` 验证依赖可用性。
- `/worlds` 只读 PostgreSQL `worlds` 表，并序列化真实数据库元信息；不写入任何事实。
- API 错误不泄露 stack 或内部异常细节。
- 没有创建新的架构决策，因此不新增 ADR；`ADR-0001-m1-t02-development-auth.md` 继续适用。
- Turbo `typecheck` 先构建上游 workspace 依赖，API test 自行构建 API 产物，确保 clean runner 与本地一致。

## 数据库影响

`NO DATABASE CHANGE`

未修改 schema、migration、seed 或数据库结构；未新增写路径。真实本地依赖核对保持：

`migrations=1 | users=1 | worlds=1`

## 新增依赖与审计

新增 production dependencies：

- `fastify@5.12.3`，MIT：API HTTP server。
- `@fastify/swagger@9.8.1`，MIT：OpenAPI 生成。

版本已固定并登记在 `docs/third-party/THIRD_PARTY_REGISTER.md`。官方 npm registry 审计命令：

`pnpm audit --prod --registry=https://registry.npmjs.org`

结果：PASS，`No known vulnerabilities found`；HIGH `0`、CRITICAL `0`。

## 自动化验证

| 检查                                                      | 结果               | 证据                                                                   |
| --------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                          | PASS               | 4 个 workspace 依赖安装完成，lockfile 一致                             |
| `pnpm lint`                                               | PASS               | API ESLint、既有 DB/Web ESLint 与 Prettier 全部通过                    |
| `pnpm typecheck`                                          | PASS               | API、DB、Web 类型检查通过；clean workspace dependency build 顺序已覆盖 |
| `pnpm test`                                               | PASS               | API contract 5 passed；Web 3 passed；DB 1 passed                       |
| `pnpm build`                                              | PASS               | DB、API/OpenAPI、Next.js production build 全部成功                     |
| API contract                                              | PASS               | success/error envelope、requestId、404、503、OpenAPI 路径均验证        |
| 真实 API runtime                                          | PASS               | `/health`、`/ready`、`/worlds`、`/openapi.json` 与 404 实测            |
| `pnpm audit --prod --registry=https://registry.npmjs.org` | PASS               | HIGH=0、CRITICAL=0                                                     |
| 数据库 migration                                          | NO DATABASE CHANGE | schema/migration 未修改                                                |

## 产品验收方案与结果

M1-T04 无新增可见 UI；API 采用真实进程与真实本地 PostgreSQL 验收：

- `/api/v1/health` 返回 200，`data.status=ok`，不依赖数据库。
- `/api/v1/ready` 返回 200，`data.status=ready`、`dependencies.database=ready`。
- `/api/v1/worlds` 返回数据库中的唯一世界元信息，不生成静态假世界。
- `/openapi.json` 返回 OpenAPI `3.0.3`，只登记正式 `/api/v1` 三路由。
- 未知路由返回 404 统一 error envelope。
- 无数据库配置时，自动化契约验证确认 `/ready` 与 `/worlds` 返回 503，不 fail-open。

## 浏览器验收

由于本任务不新增 Web UI，浏览器验收用于确认 M1-T01/T02/T03 没有回归。真实浏览器在既有 Web runtime 上完成：

### Desktop

- 视口：1440×1000。
- `/`、`/world`、`/residents`、`/events`、`/settings` 无横向溢出。
- 开发登录、进入 `/world`、刷新保持、logout、invalid cookie 拒绝与 direct URL 均通过。
- production fail-closed 路径保持；未出现未经实现的世界数据。
- 截图：[world-overview-1440.png](screenshots/M1-T04/world-overview-1440.png)。

### Mobile

- 视口：390×844。
- 五路由无横向溢出，`scrollWidth=clientWidth=390`。
- direct URL、刷新、认证回归、空状态与生产 unavailable 行为保持。
- 截图：[world-overview-390.png](screenshots/M1-T04/world-overview-390.png)。

### Console 与 Accessibility

- 浏览器项目自身 Console errors `0`、warnings `0`。
- 既有语义化 `nav/main/footer`、可访问名称、键盘 Tab 基础导航回归通过。
- M1-T04 没有异步 UI，因此新增 loading/error UI 状态为 N/A；既有 `/world` 继续显示诚实 empty/unavailable 状态。

## GitHub Actions

- Workflow：`foundation-ci`。
- 最终代码验证 run：[#18](https://github.com/zl2796195822/mirror-world/actions/runs/34183633011)。
- 验证提交：`5f9f948f9a327f2fd3fc5fb4495f098a91a18c9f`。
- `foundation` Job：PASS。
- Install、Lint and format、Typecheck、Unit tests、Build：PASS。
- 首次实现 run #16 因 API workspace 依赖产物未在 clean runner 的 typecheck 前生成而失败；run #17 进一步暴露 API test 未构建自身产物；已通过 Turbo 依赖顺序和 API test 自构建修复。没有删除测试或绕过门禁。
- CI 页面保留一个 GitHub Actions Node.js 20 runtime deprecation warning；不是项目代码 warning，不影响 Job 成功。

## 已知问题

- 真实用户认证仍未接入；当前 API skeleton 不等于 Digital Identity 或 Resident Identity。
- `/worlds` 目前只提供 M1 既有世界元信息读模型，不提供 World Kernel、snapshot、events 或 actions；后续能力必须另行授权并经过 M2 gate。
- GitHub Actions 的 action Node.js 20 runtime deprecation warning 仍待基础设施升级，当前不影响 PASS。
- 文档库 `manifest_v1.2.json` 与实际文件数量/文件名不一致问题沿用历史记录，不影响 M1-T04。

## DoD checklist

- [x] 文档中的 M1-T04 原始目标已重新读取并作为唯一任务事实源。
- [x] Fastify `/health`、`/ready`、`/worlds` 已实现；正式版本前缀为 `/api/v1`。
- [x] `/health` 只检查进程存活；`/ready` 检查数据库依赖。
- [x] 统一 success/error envelope 与 `requestId` 已实现。
- [x] OpenAPI 已生成并只登记正式版本化路由。
- [x] 数据库不可用时 readiness/world read fail-closed。
- [x] `/worlds` 只读 PostgreSQL，不写世界事实，不绕过 World Kernel。
- [x] M1-T01/T02/T03 产品壳、认证、五路由、`/world` 空状态均保持回归通过。
- [x] 真实浏览器已覆盖 1440×1000、390×844，无横向溢出。
- [x] Console 项目 errors/warnings 均为 0；基础键盘/可访问名称回归通过。
- [x] `pnpm install --frozen-lockfile`、lint、typecheck、test、build 全部通过。
- [x] 新增依赖已登记并完成官方 npm registry audit；HIGH=0、CRITICAL=0。
- [x] `NO DATABASE CHANGE`；没有新增 migration。
- [x] git diff 与秘密文件检查完成；没有秘密文件进入提交。
- [x] GitHub Actions 最终代码验证 PASS。
- [x] 未实现 M2 或任何后续里程碑能力。

## Commits

- M1-T04 implementation commit：`536cbb176e5fbce2e6ef5bdf6adcdfd26f9adb7d`
- CI typecheck fix：`f68f091873a4e89b8ffd1ebd9b97335671678d94`
- CI API test build fix / final code verification commit：`5f9f948f9a327f2fd3fc5fb4495f098a91a18c9f`
- Final code verification run：<https://github.com/zl2796195822/mirror-world/actions/runs/34183633011>
- 报告同步后的最终 `main` HEAD 以同步提交为准；代码验证 HEAD 为 `5f9f948f9a327f2fd3fc5fb4495f098a91a18c9f`。
