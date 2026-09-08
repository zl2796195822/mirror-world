# 镜界项目记忆

## 2026-09-07

- 已阅读 `文档/镜界_完整开发文档库_v1.2` 的 README、v1.2 增量说明、顶层蓝图/母文档/总索引、PRD/UIUX/第一条街 MVP、World Kernel/模拟重放、Life/Memory/AI、Identity/Economy、DB/API/3D、QA/运维/安全、M0-M13 执行与治理/研究/OSS 文档。
- 当前工作区已完成 M0 工程地基：pnpm/Turborepo、Docker 本地依赖、Drizzle migration/seed、AGENTS、PROJECT_STATE、ADR 模板、第三方登记、CI 与 M0 verification report 均已建立；M0 状态为 PASS，尚未实现 M1 及后续业务。
- 核心不可破坏边界：PostgreSQL 是长期事实源；World Kernel 是唯一事实写入口；所有真人/规则/AI/代理都提交 ActionRequest；LLM 只能产生 Intent/Candidate/Summary，不能直接写世界状态；Redis 只做 cache/lease/queue；事实变化必须可由 world_events/ledger 追溯并可重放。
- MVP 是 30 个固定 seed 居民、6 类地点、30 天无 LLM 持续模拟，验证需求/目标/关系/记忆/经济因果是否产生用户愿意回访的非预编排故事；M7 只做 Web 3D，M11/M12 是不阻塞主线的写实实验支线。
- v1.2 新增 OSS-001/002/003：成熟库可 DEPENDENCY，完整模块按 PORT，冲突或仅有思想价值的项目按 REFERENCE；未核验许可证、Proprietary/NC 项目不得复制进入主仓；所有外部代码需固定 commit、审计、登记、测试和退出条件。
- 后续执行必须一次只做一个里程碑，严格按 DoD、真实验证、`docs/PROJECT_STATE.md`、verification report、ADR 与文档同步推进。
- M0 最终验证：lint/typecheck/test/build、Docker Compose 健康检查、`db:setup` 连续两次和最终 users/worlds 查询均 PASS；`pnpm audit --prod` 因 npm 镜像缺少 audit endpoint 为 UNVERIFIED，不代表无漏洞；远程 CI 尚无执行记录。
- 2026-09-07 当时基线记录的下一任务为 M1-T01；后续 2026-09-08 M0 收尾已完成，但本次会话不进入 M1。
- 文档完整性备注：`manifest_v1.2.json` 声明/列出 32 个文件，但实际目录有 33 个文件；它列出 `manifest.json`，实际存在的是 `manifest_v1.2.json`，另有 `manifest_v1.0_legacy.json`。

## 2026-09-08

- M0 收尾复核：干净 Docker 卷重建、`pnpm install --frozen-lockfile`、lint、typecheck、test、build、migration/seed 两次和最终数据库计数均 PASS。
- CI workflow YAML 解析通过且包含 install、lint、typecheck、unit test、build；已提交并 push 到 `main`，remote 为 `git@github.com:zl2796195822/mirror-world.git`。`gh auth status` 因本机未安装 `gh` CLI 返回 `command not found`，但 SSH push 成功。
- `drizzle-orm@0.44.5` 的 HIGH advisory 已最小升级至 `0.45.2`；官方 npm registry production audit 复核 PASS，HIGH=0、CRITICAL=0。
- `foundation-ci #1`（run `34144242021`，commit `faa2270…`）真实执行但失败：`setup-node@v4` 的 `cache: pnpm` 在 pnpm setup 前找不到 pnpm；已将 pnpm setup 移到 Node cache 前。
- `foundation-ci #2`（run `34144849331`，commit `761090de…`）真实 PASS；`foundation` Job 的 install、lint、typecheck、unit tests、build 全部成功，仅有 Node.js 20 action runtime warning。M0 收尾条件已满足，状态为 `PASS`；M1-T01 尚未开始。

## 2026-09-08 M1-T01

- 按项目文档原始定义完成 M1-T01 Next.js 产品壳：深色低密度 UI、首页/世界/居民/事件/设置五个导航上下文、非游戏 HUD；没有实现 M1-T02/T03/T04 或任何 M2+ 能力。
- 产品壳保持 WORLD FIRST 与事实边界：未接入的世界、居民、事件、设置能力显示诚实空状态；不连接数据库、Redis、业务 API 或 World Kernel，不写入世界事实。
- 新增 `apps/web` Next.js App Router；新增直接依赖 Next.js 16.3.4、React 19.2.8、React DOM 19.2.8、`@types/react` 19.2.2、`@types/react-dom` 19.2.2，均为 MIT，已登记并完成官方 npm registry production audit。
- M1-T01 实现 commit 为 `8b486e7a3ce8798502fc5907e7babd43b12d20ba`；本地 install/lint/typecheck/test/build、官方 audit（HIGH=0、CRITICAL=0）及生产浏览器验证均 PASS。
- 生产浏览器在 1440×1000 与 390×844 验证五个路由无横向溢出，导航上下文正确，console Errors/Warnings=0；Docker PostgreSQL/Redis/MinIO healthy，数据库基线仍为 `migrations=1`、`users=1`、`worlds=1`。
- 当前状态为 `M1-T01 = PASS`；下一允许任务为 M1-T02，本轮停止于 M1-T01。
- GitHub Actions `foundation-ci` 已对最终文档同步提交 `e6a6af00397de633ea9fd20cc4426583ec0f5ffe` 真实执行并 PASS：run `34152941758`，install/lint/typecheck/unit tests/build 全部成功。

## 2026-09-08 M1-T02

- 按 M1-T02 原始定义实现开发身份：`MIRROR_DEV_AUTH=true` 仅在 `NODE_ENV=development` 开启 M0 seed 用户 `dev@mirror.local`；生产构建遇到该配置会 fail-closed。
- 新增可替换 `AuthAdapter`、HttpOnly/SameSite=Strict 开发会话 cookie、受保护路由、开发登录/退出入口；生产无真实认证时显示诚实 unavailable，不伪造身份或世界数据。
- 未新增 production dependency，未修改 `pnpm-lock.yaml`，未修改数据库 schema/migration，PostgreSQL/Redis/MinIO 及 M0 seed 状态保持不变；新增 ADR `docs/adr/ADR-0001-m1-t02-development-auth.md`。
- 本地 `pnpm lint`、`pnpm typecheck`、`pnpm test`、production guard/build 与真实浏览器验证已 PASS；1440×1000、390×844 无横向溢出，console Errors/Warnings=0；production runtime 未显示开发入口。
- 首次 M1-T02 CI run `34174320461` 在 `Lint and format` 失败，已由本地 `pnpm lint` 复现并修复验证报告的 Prettier 格式问题；最终 run `34174530489` 对提交 `08842eb756b1c91521c2447d6745f76adcf4adaa` 真实 PASS，foundation 的 install/lint/typecheck/unit tests/build 全部成功。
- 当前 M1-T02 状态为 `PASS`；实现提交为 `c6f8d63ec0445c8dc83c32869830cf5f07742af0`，最终验证提交为 `08842eb756b1c91521c2447d6745f76adcf4adaa`。下一允许任务为 M1-T03，本轮已停止，不进入 M1-T03。
