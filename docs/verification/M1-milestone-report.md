# M1 Milestone Gate 验证报告

## 结论

`M1 = PASS`

本报告基于当前 `main` 代码验证基线 `15c02dfd43067bdfadb242e27ba777c4a78c7a19`。M1 Gate 只复核和修正 M1 范围，没有实现 M2 或任何后续领域能力。

## M1-T01 ～ M1-T04 状态

| 任务                  | 状态 | 本轮复核                                                      |
| --------------------- | ---- | ------------------------------------------------------------- |
| M1-T01 产品壳         | PASS | 五路由、深色低密度 UI、桌面/移动无横向溢出                    |
| M1-T02 开发身份       | PASS | 开发登录、刷新保持、退出、invalid cookie、生产 fail-closed    |
| M1-T03 World Overview | PASS | 世界时间/状态/居民占位/最近事件均保持诚实空状态               |
| M1-T04 API skeleton   | PASS | Fastify 只读 API、统一 envelope/requestId、OpenAPI、readiness |

## Architecture Gate

- PostgreSQL 仍是 durable truth；`/worlds` 只读 `worlds` 元信息。
- Redis 仅作为本地依赖，Compose 使用 `appendonly=no`；应用源码没有 Redis 长期事实读写路径。
- UI 没有数据库访问或世界事实写入；API 只有只读查询。M0 seed 的幂等写入仅用于基础 fixture 初始化，不是用户/API 世界事实路径。
- Auth Identity 仅是 M1-T02 的开发会话适配器，不等同于 Digital Identity 或 Resident Identity；没有新增身份模型。
- Fastify 仍为 readonly API skeleton。
- 没有 World Kernel、Event Ledger、ActionRequest、Life、Memory、Relationship、Economy、AI、Offline Simulation 或 3D 实现，也没有静态数据伪装世界运行。

## Product Gate

真实 Playwright 浏览器验证结果：

- 1440×1000：`/`、`/world`、`/residents`、`/events`、`/settings` 直达成功，`document.documentElement.scrollWidth > innerWidth` 为 `false`。
- 390×844：上述五路由直达成功，横向溢出为 `false`。
- `/world` 刷新后仍显示 `世界时间=未接入`、`运行状态=未连接`、`居民规模=30 个占位`；没有居民行为、事件或运行中的假数据。
- 已认证开发浏览器完成登录、进入 `/world`、刷新保持、退出；无效 cookie 访问 `/world` 被重定向 `/login`。
- 生产运行时访问受保护路由被重定向 `/login`，页面显示“身份认证不可用”，未出现开发登录入口。
- 直接 URL、语义化导航、`aria-current`、`nav/main/footer` 与键盘 Tab 基线通过；Tab 可到达五个导航链接和“退出”按钮。
- 既有 M1 页面无需要接入数据的异步 loading/error 状态；当前使用明确的 unavailable/empty 状态，不引入假 loading 或假世界运行状态。
- 本轮真实实现截图：
  - [world 1440×1000](screenshots/M1-milestone/world-1440.png)
  - [world 390×844](screenshots/M1-milestone/world-390.png)
  - [production login 1440×1000](screenshots/M1-milestone/production-login-1440.png)
  - [production login 390×844](screenshots/M1-milestone/production-login-390.png)

## Auth Gate

- `NODE_ENV=development` 且 `MIRROR_DEV_AUTH=true` 才允许 M0 seed 用户进入。
- 会话 cookie 实测为 `HttpOnly=true`、`SameSite=Strict`、本地 HTTP 下 `Secure=false`；`document.cookie` 为空。
- 会话刷新保持、logout、invalid cookie 拒绝均通过。
- production build guard 拒绝 `MIRROR_DEV_AUTH=true`；production runtime 不提供免登录入口。
- 本轮修正 ADR-0001 中与实现不一致的 `SameSite=Lax` 文案为 `SameSite=Strict`。

## World Overview Gate

`/world` 仍是 WORLD FIRST 的观察上下文，不是传统 Dashboard。时间、运行状态、居民占位和最近事件都由诚实的 unavailable/empty 文案表达。当前没有 World Kernel、Event Ledger 或世界时间推进，因此没有伪造居民、事件、位置、AI 或模拟事实。

## API Gate

真实 API 进程验证：

| Request       | Healthy DB                               | DB stopped                    |
| ------------- | ---------------------------------------- | ----------------------------- |
| `GET /health` | 200，`data.status=ok`                    | 200，仍只代表 API 进程存活    |
| `GET /ready`  | 200，`data.status=ready`、database=ready | 503，`DEPENDENCY_UNAVAILABLE` |
| `GET /worlds` | 200，返回 PostgreSQL 中的真实世界元信息  | 503，`WORLD_DATA_UNAVAILABLE` |

同时验证了隐藏兼容入口 `/health`、`/ready`、`/worlds`。未知路由返回 404 `NOT_FOUND` error envelope。成功响应包含 `{ data, requestId }`；错误响应包含 `{ error: { code, message, requestId } }`，没有 stack、秘密或内部连接信息。

## OpenAPI Gate

- 已重新生成 `apps/api/openapi.json`。
- 正式文档路径为 `/api/v1/health`、`/api/v1/ready`、`/api/v1/worlds`；兼容短路径不进入 OpenAPI。
- 运行时文档为 OpenAPI `3.0.3`。
- 使用 live API 响应对生成 schema 进行逐字段校验：health、ready、worlds 的 200 响应均 PASS；ready/worlds 的 503 error schema 与失库响应一致。
- OpenAPI 未声明任何写入接口。

## Security Gate

- 没有 tracked secrets、密钥文件、私有原始素材或常见 API key/private-key 模式命中；仅保留 `.env.example` 开发模板。
- 错误响应不包含 stack；生产身份配置 fail-closed。
- API 查询使用 Drizzle 查询构造器，无字符串拼接 SQL。
- 没有新增认证、身份、世界事实写入或敏感数据存储路径。

## Dependency Gate

- 本轮没有新增 production dependency。
- 直接依赖的版本、官方 npm source、许可证和登记已在 `docs/third-party/THIRD_PARTY_REGISTER.md`；本轮补齐了 source links，并以 `pnpm licenses list --json` 核对安装包元数据。
- 官方审计命令：`pnpm audit --prod --registry=https://registry.npmjs.org`
- 结果：PASS，`No known vulnerabilities found`；HIGH=0、CRITICAL=0。

## Infrastructure Gate

- PostgreSQL：healthy。
- Redis：healthy，`redis-cli ping` 返回 `PONG`。
- MinIO：healthy，`/minio/health/live` 返回成功。
- 数据库只读核对：`migrations=1`、`users=1`、`worlds=1`。
- 数据库变化：`NO DATABASE CHANGE`；没有新增或修改 migration。

## CI Gate

- Workflow：`foundation-ci`。
- 当前 main HEAD 对应 run：[#34184147783](https://github.com/zl2796195822/mirror-world/actions/runs/34184147783)。
- GitHub Actions 状态：PASS；install、lint、typecheck、unit tests、build 均成功。
- 本轮本地重新执行 `pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`，全部 PASS。

## 技术债审计

- 搜索 `TODO`、`FIXME`、`HACK`、`TEMP`、`mock`、`fixture`、`placeholder`：命中仅为 M0 seed/测试 fixture、诚实空状态 placeholder 与文档说明；没有发现需要修复的临时实现或假世界数据。
- 文档库 `manifest_v1.2.json` 与实际文件数量/文件名不一致，属于既有文档 P2，不影响 M1 运行。
- GitHub Actions action Node.js 20 runtime deprecation warning 属于外部 action 运行时提示，不是项目代码错误。

## P0 / P1 / P2

- P0：0。
- P1：0。
- P2：2 项既有项：文档 manifest 不一致；GitHub Actions 外部 action runtime warning。

## M1 遗留项

- 真实用户认证、Digital Identity、Resident Identity 未实现，按产品路线属于后续阶段。
- `/world` 仍等待未来真实 World Clock、World Kernel、snapshot 和 event stream；当前空状态是有意的产品行为。
- M1 API `/worlds` 是只读世界元信息骨架，不是世界事实写入或运行时模拟接口。

## M2 前置条件

M2-T01 只能在单独的后续授权下开始，并需要先定义并验证 World Clock、持久化时间边界、重启不倒退、暂停不 tick 以及与 World Kernel/Event Ledger 的一致性。M2-T01 本轮未执行。

## Definition of Done checklist

- [x] M1-T01、M1-T02、M1-T03、M1-T04 均 PASS。
- [x] Architecture Gate 通过，无 World Kernel 绕过路径或假世界能力。
- [x] Product Gate 通过：1440×1000、390×844、五路由、`/world`、认证回归、direct URL、refresh、overflow、accessibility。
- [x] Auth fail-closed 通过；HttpOnly/SameSite/invalid cookie 已实测。
- [x] API health/ready/worlds 与失库 fail-closed 通过。
- [x] OpenAPI 生成成功并与 live response schema 一致。
- [x] `pnpm install --frozen-lockfile`、lint、typecheck、test、build 全部 PASS。
- [x] 官方 npm audit HIGH=0、CRITICAL=0。
- [x] PostgreSQL、Redis、MinIO healthy；数据库基线未变化。
- [x] P0=0、P1=0。
- [x] GitHub Actions PASS。
- [x] `docs/PROJECT_STATE.md` 与 `MEMORY.md` 已更新。
- [x] 未进入 M2，未实现任何后续领域能力。

## Final state

- Gate 验证基线 HEAD：`15c02dfd43067bdfadb242e27ba777c4a78c7a19`。
- 本报告所在的文档同步提交为 docs-only 变更；最终 `main` HEAD 以提交后的 Git 与 GitHub Actions 记录为准。
- 下一允许任务：`M2-T01`，仅记录，不执行。
