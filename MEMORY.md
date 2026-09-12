# 镜界项目记忆

## 2026-09-09 M3 FINAL STATUS REVIEW

- 已完成正式只读 `M3 Final Status Review`，基线为 latest `origin/main = 669e14f558ad62a6fbc4a746186cd697e355436d`；没有修改生产代码、schema、migration、ADR 或 research。
- `PRE-AL-GATE = PASS` 仅证明声明的 fixture-only `MOVE/SLEEP` profile；`M3 = IN_PROGRESS` 不变。审查矩阵为 10 项：6 PASS、2 PARTIAL、2 FAIL。
- 两个 P1 仍阻塞 M3 close：正式 M3 行为域尚未覆盖 EAT/WORK/TALK/BUY lifecycle；正式任务书中的 `M3-T05 Story sanity report` 未完成，且当前 `PROJECT_STATE` 的“无 M3-T05”与任务书冲突。
- 正式审查报告：`docs/verification/M3-FINAL-STATUS-REVIEW.md`。下一允许工作是 M3-T05/正式任务定义 reconciliation；不进入 M4，不开始新的 PRE-AL 实现。

## 2026-09-09 PRE-AL-GATE

- 正式完成 `PRE-AL-GATE`，状态为 `PASS`；实现提交 `15d2b25733ba44c7dcd43dbc3e4fe60babc1b651`，GitHub Actions `foundation-ci` run `34363874063` 对该提交为 `Success`。
- 新增 world-scoped `simulation_driver_leases` migration `0010` 与 transaction-level fencing；stale driver 无法继续推进 World Time 或提交 due completion。新增 M3 typed event registry/reducer、resident projection replay、checkpoint suffix replay 与机器证据 harness。
- clean disposable PostgreSQL 真实运行固定 30 residents × 30 World Days = 43,200 World Minutes；最终 World Time `2026-10-07T00:00:00.000Z`、153 attempts、127 committed、26 rejected、0 conflicts、final `worldSeq=1617`。live projection == full replay == suffix replay；checkpoint 删除后 genesis rebuild 一致；A/B deterministic digest 为 `4d2b570830545df66e7314a9d1f8094646ef2b96a6f3d109bd40c2a53baa87ec`。
- fault/recovery 证据通过 pause/resume、lease takeover/fence、wake restart/requery/ack、ActionRequest/completion idempotency、poison resident STOP=3 且其余 29 人继续；zero-LLM、world/resident isolation、exact endpoint 与 no due work 通过。报告为 `docs/verification/PRE-AL-GATE-report.md`，机器证据为 `docs/verification/artifacts/PRE-AL-GATE/`。
- `M3` 仍保持 `IN_PROGRESS`；当前权威资料没有命名新的 M3-T05，不能把 Gate PASS 自动升级成 M3 PASS，也不能进入 M4+。EAT/BUY mutation、Economy、Memory、Relationship、AI、3D、Realtime 与规模扩展均未执行。

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
- 首次 M1-T02 CI run `34174320461` 在 `Lint and format` 失败，已由本地 `pnpm lint` 复现并修复验证报告的 Prettier 格式问题；最终 run `34176497873` 对提交 `465d7b7e5f5e8027c40e57f037295625e06f3344` 真实 PASS，foundation 的 install/lint/typecheck/unit tests/build 全部成功。
- 官方 npm registry production audit 复核返回 `No known vulnerabilities found`，HIGH=0、CRITICAL=0；本任务没有新增依赖。
- 当前 M1-T02 状态为 `PASS`；实现提交为 `c6f8d63ec0445c8dc83c32869830cf5f07742af0`，最终验证提交为 `465d7b7e5f5e8027c40e57f037295625e06f3344`，最终 run 为 `34176497873`。下一允许任务为 M1-T03，本轮已停止，不进入 M1-T03。

## 2026-09-08 M1-T03

- 按项目文档原始定义实现 World Overview：世界时间、运行状态、30 居民占位、最近事件占位；所有未接入能力以 unavailable/empty 呈现，不伪造世界正在运行。
- 只修改 `apps/web` World Overview 页面与共享观察样式，保留 M1-T02 `requireUser()`、开发身份、刷新/退出/生产 fail-closed 边界；无 API、World Kernel、数据库、Redis、world event 或后续能力。
- 新增最小 Web 页面契约测试；未新增 production dependency；截图保存在 `docs/verification/screenshots/M1-T03/`。
- 本地 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、官方 audit（HIGH=0、CRITICAL=0）与 1440/390 浏览器验证已通过；GitHub Actions run `34181243953` PASS。
- 当前状态为 `M1-T03 = PASS`；实现提交为 `01dc550ae5b64e5ee513d606f14859ca32c85c05`，最终文档验证提交为 `eb9d474cde555a3f7c5ef94c3da75bdda27b2c55`。下一允许任务为 M1-T04，本轮已停止，不进入 M1-T04。

## 2026-09-08 M1-T04

- 按文档原始定义完成 API skeleton：Fastify `/api/v1/health`、`/api/v1/ready`、`/api/v1/worlds`，统一 error envelope/requestId 与 OpenAPI 生成；短路径只作隐藏兼容入口。
- `/health` 只检查进程；`/ready` 执行数据库 readiness；`/worlds` 只读 PostgreSQL `worlds` 元信息。没有 World Kernel、Event Ledger、ActionRequest、业务写入、事件、居民、AI、3D 或其他后续能力。
- 新增 `fastify@5.12.3` 与 `@fastify/swagger@9.8.1`，均 MIT，已登记；官方 npm registry production audit PASS，HIGH=0、CRITICAL=0。
- `NO DATABASE CHANGE`；数据库基线保持 `migrations=1`、`users=1`、`worlds=1`。新增 `HOST=127.0.0.1`、`PORT=3001` 示例，安全默认仍绑定 loopback。
- 本地 `pnpm install --frozen-lockfile`、lint、typecheck、test、build、真实 API runtime 与 M1 Web 浏览器回归 PASS；截图在 `docs/verification/screenshots/M1-T04/`。
- GitHub Actions 首次 run #16 因 clean runner 缺少上游 DB build 失败，run #17 因 API test 缺少自身 build 失败；通过 Turbo typecheck 依赖和 API test 自构建修复，最终 run #18 `34183633011` 对 `5f9f948f9a327f2fd3fc5fb4495f098a91a18c9f` PASS。
- M1-T04 实现 commit 为 `536cbb176e5fbce2e6ef5bdf6adcdfd26f9adb7d`，CI 修复 commits 为 `f68f091873a4e89b8ffd1ebd9b97335671678d94` 与 `5f9f948f9a327f2fd3fc5fb4495f098a91a18c9f`。
- 当前状态为 `M1-T04 = PASS`；下一阶段只记录为 `M1 Milestone Gate`，不执行 M2。

## 2026-09-08 M1 Milestone Gate

- 基于 main HEAD `15c02dfd43067bdfadb242e27ba777c4a78c7a19` 重新完成 M1-T01～T04 的架构、产品、认证、API、OpenAPI、安全、依赖、基础设施与 CI Gate，最终 `M1 = PASS`。
- 真实浏览器复核了开发登录、刷新保持、logout、invalid cookie、五路由 direct URL、`/world` 诚实空状态、1440×1000 与 390×844 无横向溢出、键盘导航、生产 fail-closed；Console errors/warnings 均为 0。截图保存在 `docs/verification/screenshots/M1-milestone/`。
- 真实 API 复核了 `/health`、`/ready`、`/worlds` 与隐藏短路径；停止 PostgreSQL 时 health=200、ready/worlds=503，统一 envelope/requestId 且无 stack；OpenAPI live response 逐字段校验通过。
- `pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 和官方 npm registry audit 均 PASS；HIGH=0、CRITICAL=0。基础设施 healthy，数据库仍为 `migrations=1`、`users=1`、`worlds=1`，`NO DATABASE CHANGE`。
- Gate 发现并修正两处文档一致性问题：ADR-0001 的 SameSite 文案改为实际 `Strict`；第三方登记补充直接 production 依赖的官方 npm source links。没有修改 M1 业务代码、schema 或 migration。
- 新增总体验收报告 `docs/verification/M1-milestone-report.md`；GitHub Actions 当前 HEAD run `34184147783` PASS。M2、World Kernel、Event Ledger、ActionRequest 与所有后续能力均未执行。
- 未决 P2：文档库 manifest 文件数量/文件名不一致；GitHub Actions 外部 action 的 Node.js 20 runtime deprecation warning。下一允许任务只记录为 `M2-T01`，不得自动执行。

## 2026-09-08 M2-T01

- 按文档原始定义仅实现世界时钟：real time/world time/time_scale；development 支持 pause/1x/10x/100x；production 强制有效倍率 1x；未实现 M2-T02 及后续任务。
- 新增 `packages/world-kernel`，显式注入 wall clock；`PAUSED/MAINTENANCE` 不推进 world time；wall clock 回拨不让 world time 倒退；API 不直接更新 worlds，时钟写入集中在 Kernel store 的 PostgreSQL transaction/row lock。
- 新增 `worlds.clock_anchor_at` 与 status/time_scale check constraints migration；重复 db:setup、真实 PostgreSQL integration、M1 API/Web 回归、lint/typecheck/test/build 和官方 npm audit 均通过。
- 新增 ADR-0002、`docs/verification/M2-T01-report.md`；实现 commit `ed65036966d4349f4a4b9f4970cc4e54727c36de`，GitHub Actions run `34187838878` 真实 PASS。既有 P2 继续保留：manifest 不一致、外部 action Node.js 20 deprecation warning。
- 下一允许任务为 `M2-T02`，只记录，不执行。

## 2026-09-08 M2-T02

- 按 M2-T02 原始定义新增 `@mirror/contracts`，用固定 `zod@4.5.4` 定义 MOVE/EAT/SLEEP/WORK/TALK/BUY 六类结构化 ActionRequest schema 与 TypeScript 类型；顶层字段和 action parameters 均拒绝未知字段与非法格式。
- Action Contract 只做结构、类型、格式与基本数值边界检查；不实现 Kernel validator、actor/位置/资源/权限/幂等执行、ActionResult、数据库 action_requests、事件账本、API、Replay 或 M2-T03+ 能力。
- 新增 ADR-0003、契约单测 15 项，`pnpm install --frozen-lockfile`、双次 `db:setup`、lint、typecheck、test、build、World Clock 真实 PostgreSQL 回归和官方 npm audit 均 PASS；Docker 依赖 healthy，数据库已恢复 M0 paused 基线。
- 当前状态为 `M2-T02 = PASS`；实现与本地验证提交为 `8b9c2eee82109c9a4b1e3e87315edcf2d0411912`，GitHub Actions run `34196620662` 真实 PASS。下一任务只记录 `M2-T03`，不自动执行。

## 2026-09-08 M2-T03

- 按原始任务只实现 Kernel validator 与请求幂等：新增 `packages/world-kernel/src/action-validator.ts`，复用 `@mirror/contracts`，使用显式 World Clock 和只读领域 snapshot 校验 actor、requestedBy 权限、RUNNING、请求世界时间、expectedActorVersion、MOVE/EAT/SLEEP/WORK/TALK/BUY 的位置与资源前置条件。
- 当前仓库尚无居民、地点、库存、工作或经济事实表，因此 validator 不伪造持久化领域事实；新增 `packages/db/src/schema.ts` 的最小 `action_requests` 表和 `0002_wandering_moonstone.sql` 只保存通过校验的请求 metadata、payload 与 fingerprint。
- `persistValidatedActionRequest` 在 PostgreSQL transaction 中依赖 `(world_id,idempotency_key)` 唯一约束；同 payload 重试返回 `KERNEL_DUPLICATE_REQUEST`，同 key 不同 payload 返回 `KERNEL_CONFLICT`，并发只保留一条 request row；没有改变 `worlds`、没有 Event Ledger、ActionResult、event seq、Replay、Checkpoint、Action API 或 M2-T04+ 能力。
- 本地 install、双次 db:setup、lint、typecheck、unit test、build、真实 PostgreSQL integration 和官方 npm audit 均 PASS；最终数据库恢复为 migrations=3、users=1、worlds=1、action_requests=0、world=`PAUSED/1x`。实现 commit `cb6205b21613f684944d1daaf94141fb442f56dd` 的 GitHub Actions run `34199405422` 真实 PASS，当前 `M2-T03 = PASS`，下一任务只记录 `M2-T04`。

## 2026-09-08 M2-T05

- 按原始任务只实现 Checkpoint/Replay：新增 `simulation_checkpoints` migration `0004_old_ares.sql`、固定 seed + ordered Event Ledger replay、checkpoint suffix replay、canonical SHA-256 summary hash 与 world/seq/schema/checksum 校验；PostgreSQL Event Ledger 仍是 durable truth，checkpoint 可删除重建。
- 新增 `packages/world-kernel/src/world-replay.ts`、`world-checkpoint-store.ts` 及单测；非时间事件在当前无领域事实前提下只做 schema-validated no-op，但进入 history digest；Replay 不重新执行 ActionRequest，没有新增 API、ActionResult、Projection、Simulator、Life 或 M3+。
- 临时 clean PostgreSQL 上完整 M2 integration（World Clock、Event Ledger、Replay/Checkpoint、Action Request）4/4 PASS；frozen install、双次 clean `db:setup`、lint、typecheck、unit tests、build、官方 npm production audit 均 PASS。
- M2-T05 实现 commit `838c6e5eede3aaf413c5a9966893444ae7cb92ad`；GitHub Actions `foundation-ci` run `34204276572` 真实 PASS。主库最终恢复 `PAUSED/1x`，保留既有 20 条 append-only events、`world_seq=20`、无 checkpoint。当前状态 `M2-T05 = PASS`，下一允许步骤仅为 `M2 Milestone Gate`，不执行任何后续任务。

## 2026-09-08 M2 Milestone Gate

- 完成 M2 Milestone Gate，M2-T01～T05 全部 PASS；本轮只做审计、真实验证与 Gate 阻塞修复，没有执行 M3、Life、Memory、Relationship、Economy、AI、3D、Digital Identity 或 Offline Simulation。
- 发现并修复 World Clock control 在 wall-clock rollback 时回写较早 `clockAnchorAt` 的缺陷；修复提交为 `7f5377f37d441c9989dd94ce2f6d97f30980603d`，并补齐 checkpoint wrong-world/schema/corruption、重复 suffix replay 与 A/B world isolation 测试。
- Gate 真实证据：frozen install、双次 clean `db:setup`、lint、typecheck、test、build、M2 PostgreSQL integration 4/4、API live regression、Web 五路由回归、Docker healthy 与官方 npm production audit 均 PASS；world-kernel 25、contracts 15、db 1、web 3、API contract 6。
- 最终主库保持 5 migrations、1 user、1 world、0 action request、20 条 append-only events、`world_seq=20`、0 checkpoint，world=`PAUSED/1x`；没有删除历史 events。
- Gate 报告为 `docs/verification/M2-milestone-report.md`；P0=0。`MIRROR-FIND-001` 为 P1 的 `PRE-M3 REQUIRED FOLLOW-UP`，`MIRROR-FIND-002`～`004` 为后续 P2；manifest 不一致列 P3，Node.js 20 action warning 继续记录。
- 当前状态为 `M2 = PASS`；下一允许步骤仅记录 `RES-M3-002`，不执行 M3。

## 2026-09-08 M3-T01

- 按正式 M3-T01 与 RES-M3-002 实现纯 deterministic Resident Seed Generator；实现提交 `9077be3b660f2e7ea41a5729e07d001bb68e6f07`。
- 固定 `worldId + seed` 生成恰好 30 个 `NATIVE` 居民，stable SHA-256-derived UUID、lexicographic ordering、5 个 profile 各 6 人、26 employed/4 unemployed、第一条街 fixture-only home/work 引用，以及 `cashCents/foodUnits/version=0` 只读资源 fixture。
- Resident Identity、Digital/Auth Identity、fixture-only ActorRef 分离；没有创建 residents/actors/needs/accounts/inventory/migration，没有 Kernel integration、ActionResult、runtime、scheduler、30×30、M3-T02+ 能力。
- `packages/db` T01 tests 6 项通过；frozen install、双次 db setup、lint、typecheck、全仓 tests、build、官方 npm audit 和 disposable clean DB 上 M2 PostgreSQL integration 4/4 均通过。首次复用已有 append-only 主库的 integration 因重复验证事件链失败，未归因于 T01，随后以临时 clean DB 重跑通过。
- GitHub Actions `foundation-ci` run `34215453306` 对 main commit `84a64d6` 真实 PASS；最终实现 commit 为 `9077be3b660f2e7ea41a5729e07d001bb68e6f07`。
- 当前正式状态：`M3-T01 = PASS`，`M3 = IN_PROGRESS`。下一步仅记录并解决 M3-T02 前的 Needs 4/6/7 ADR/Pre-T02 Decision；本轮停止。

## 2026-09-08 ADR-M3-001

- `ADR-M3-001 = PASS / ACCEPTED`，正式裁决 M3 v1 不机械选择 4/6/7，而按职责收敛：独立 CORE 为 `HungerPressure`、`RestPressure`、`SocialPressure`；`EnergyLevel`、`conditionBand`、工作义务和资源快照为 derived/input boundary；`stress`、`safety`、`money_pressure`、`purpose` 为 DEFER。
- Need authority 为 `World Facts + World Time + Resident Seed/Profile + NeedPolicyVersion → Current Need State`；统一 Core pressure 语义为 `0=satisfied, 100=critical`；采用 world-time lazy evaluation 与 scheduled wake 方向，`PAUSED/MAINTENANCE` 不推进 Needs。
- Needs source audit 为 `docs/architecture/m3-needs-source-audit.md`，ADR 为 `docs/adr/ADR-0007-m3-life-engine-needs-model-v1.md`。本任务没有代码、schema、migration、seed、API、Event Registry 或 runtime 变更；下一允许步骤仅为 `M3-T02`，不自动执行。

## 2026-09-08 M3-T02

- 按 `ADR-M3-001` 完成纯 `@mirror/life-engine` Needs evaluator；实现 commit `b4518859482301a95732734f599441d8bc9d74a3`。
- CORE 仅为 `HungerPressure`、`RestPressure`、`SocialPressure`，统一 `0=satisfied`、`100=critical`；`EnergyLevel` 和 `conditionBand` 为 derived，`stress/safety/money_pressure/purpose` 未实现。
- NeedPolicy 为 `m3-needs-v1`；calibration baseline 集中定义，resident variation 使用 SHA-256 stable derivation 与 T01 profile；无 `Math.random()`、wall clock、timer 或高频 tick。
- 采用 anchor + World-Time lazy evaluation；`PAUSED/MAINTENANCE` 不推进；不新增 migration、表、API、Event Registry、Action Loop 或资源写入；anchor reset 由未来 accepted-result 输入边界负责。
- M3-T02 tests 10/10；全仓 lint/typecheck/test/build、clean PostgreSQL M2 integration 4/4、官方 npm audit、30/1000 resident evaluator benchmark 均通过。
- GitHub Actions `foundation-ci` run `34220974174` 对实现 commit 真实 PASS；验证报告为 `docs/verification/M3-T02-report.md`。
- 当前状态 `M3-T02 = PASS`、`M3 = IN_PROGRESS`；ActionResult/Observation/ActorRef、MOVE/SLEEP、bounded replan、scheduler/driver 和完整 domain replay 等既有 blocker 继续保留；下一允许任务仅为 `M3-T03`，不自动执行。

## 2026-09-08 M3-T03

- 按正式 M3-T03 `Routine/Goal` 完成纯 deterministic Goal evaluator；实现提交 `ee0617dfd24e617979680184a7fb88c67d64af66`。
- `packages/life-engine/src/goals.ts` 使用集中式 `m3-goals-v1` policy，从 Needs、routine、只读 work obligation、context event 生成有限 Goal candidates，并按 score、priority、stable key 选择 selected Goal。
- Goal types 为 `SATISFY_HUNGER`、`REST`、`FULFILL_WORK_OBLIGATION`、`MAKE_SOCIAL_CONTACT`、`RETURN_HOME`；Goal 不等于 Action，没有 Candidate Action、ActionRequest、ActionResult 或 Kernel execution。
- 复用 M3-T01 30 resident fixture 与 M3-T02 `m3-needs-v1` NeedState；未新增 Need、stress/safety/money_pressure/purpose、资源写入、关系/记忆/经济/AI 能力。
- `PAUSED/MAINTENANCE` 返回空 Goal，输入使用显式 world time；无 Math.random、wall clock、timer、LLM 或不稳定遍历顺序；active Goal 只提供最小 switch-margin stability。
- 没有新增 production dependency、schema、migration、API、Event Ledger 或事实写入口；Goal 可从输入重算，完整 Action Loop 仍未开始。
- M3-T03 tests 9 项，Life Engine 合计 19 项；全仓 lint/typecheck/test/build、clean PostgreSQL M2 integration 4/4、官方 npm audit、30/1000 benchmark 均通过。
- 主库通过 db:setup 恢复 `PAUSED/1x`，保留 append-only 历史；当前 M3 正式状态为 `M3-T03 = PASS`、`M3 = IN_PROGRESS`。ActionResult、Observation、ActorRef、MOVE/SLEEP、bounded replan、scheduler/driver 与 full domain replay blocker 继续保留；下一允许任务仅为 `M3-T04`，不自动执行。

## 2026-09-08 M3-T04 Gate

- 重新读取 M3 milestone roadmap、M3-T04 原始任务/DoD、Life Engine、Resident/Kernel/Action Contract/Event Ledger/Replay 文档、ADR-0007、M3-T01～T03 reports、RES-M3-001、RES-M3-002 与 RES-M5-001 research-only 边界。
- 官方任务名称为 `M3-T04 规则决策器`，表面要求是候选行为→硬约束→评分→动作、不调用 LLM，DoD 为 30 人 30 天模拟可完成。
- Gate 结论为 `M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE`：RES-M3-001 正式接入顺序和 30×30 矩阵要求 ActionRequest、现有 Action Contract、真实 Kernel ActionResult、结果驱动 bounded replan/runtime 与 deterministic driver；不能把它降级成纯候选评分器。
- 本轮没有修改 runtime、schema、migration、Action Contract、Kernel、Event Ledger、Replay 或数据库；仅新增 `docs/verification/M3-T04-blocked-report.md` 并同步 `PROJECT_STATE.md`/`MEMORY.md`。
- Pre-Action-Loop blockers：ActionOutcome/ActionResult feedback、Observation/query boundary、Resident→ActorRef mapping、readonly resource boundary、MOVE/SLEEP semantics、bounded replan/backoff、scheduler/driver 与 full resident/domain replay。RES-M5-001 不作为正式数据库实现依据，不采用单一 `committed_event_id` 设计。
- 下一步只记录 blocker；不得执行 M3-T05 或任何后续任务。

## 2026-09-08 PRE-AL-00

- `PRE-AL-00 = PASS`；main CI baseline 已恢复 GREEN。
- 根因是已提交的 `docs/verification/M3-T04-blocked-report.md` 未通过仓库 Prettier 检查；GitHub 失败 Run `34225477788`、`34225711930` 实际停在 `Lint and format`，Typecheck 被跳过。
- 最小修复为格式化该报告并新增正式证据/验证报告；没有修改 workflow、runtime、业务代码、依赖、lockfile、schema 或 migration。
- 本地完整验证与 clean PostgreSQL M2 integration 4/4 通过；GitHub Actions `foundation-ci` 根因修复 run `34227318851`、最终状态同步 run `34227826950` 均完整 PASS。M3-T04 仍 `BLOCKED_BY_PRE_ACTION_LOOP_GATE`，M3 仍 `IN_PROGRESS`。
- 下一允许任务：`PRE-AL-01`；本轮不执行。

## 2026-09-08 PRE-AL-01

- `PRE-AL-01 = PASS`；实现正式 `ActionRequest → World Kernel → KernelActionOutcome` 反馈闭环，`M3 = IN_PROGRESS`，`M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE` 仍保持不变。
- durable Kernel execution status 仅为 `COMMITTED`、`REJECTED`、`CONFLICT`；`DUPLICATE`/`IDEMPOTENCY_CONFLICT` 是调用处置，`TIMED_OUT` 不写入 Kernel outcome；一个 request 支持关联 `0 / 1 / N` 个权威 World Events。
- 新增 outcome contract/store、同事务多事件提交、事件关联、幂等结果复用、拒绝/版本冲突 reason code、executor rollback、world isolation 复合约束及 migrations `0005`/`0006`；未实现 Observation、ActorRef、Resource Bridge、MOVE/SLEEP、bounded replan、scheduler 或 Action Loop。
- 本地 frozen install、lint、typecheck、test、build、clean PostgreSQL 双次 setup、M2 integration 4/4、ActionOutcome integration 1/1、M3-T01/T02/T03 regression 与官方 audit 均通过；实现 commit `58b81b30b9f05404084421708381c1ff1409e747` 的 GitHub Actions run `34232707578` 完整 PASS。
- 下一允许任务：`PRE-AL-02 · Observation / Query Boundary`；本轮不执行。

## 2026-09-08 PRE-AL-02

- `PRE-AL-02 = PASS`；建立确定性、bounded、world-scoped、resident-scoped、read-only 的 Decision Observation / Query Boundary，`M3 = IN_PROGRESS`，`M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE` 保持不变。
- Life Engine 只依赖 Observation contract/port，不直接依赖 DB、SQL、Drizzle 或 Event Ledger；snapshot 使用 `m3-observation-v1`、正式 `worlds` authority、`sourceWorldSeq` 与 T01 30-resident fixture。
- ActorRef、Resource Bridge、location/activity runtime、formal obligation source、MOVE/SLEEP、bounded replan、scheduler/driver 与 full replay 仍未实现；未伪造对应 truth。
- 本地完整回归、clean PostgreSQL M2 integration 4/4、PRE-AL-01、M3-T01/T02/T03、官方 audit 与 GitHub Actions run `34237453432` 均 PASS；实现提交 `3907e56414957f4fbc377868b18bf6b84fd5fbc9`。
- 下一允许任务：`PRE-AL-03 · ActorRef + Resource Bridge`；本轮不执行。

## 2026-09-08 PRE-AL-03

- 按用户正式授权完成 `Resident ActorRef + Resource Read Bridge`，报告为 `docs/verification/PRE-AL-03-report.md`；M3-T04 仍 `BLOCKED_BY_PRE_ACTION_LOOP_GATE`。
- 新增 `@mirror/contracts` 的 deep-immutable `ActorRef` 与 `ResidentResourceSnapshot`、`ResidentActorResolver`、只读 `ResourceReadPort`；复用 T01 deterministic fixture，Resident/Auth/Digital/Actor 概念保持分离。
- 新增 `@mirror/world-kernel` 的 M3 seed resolver/resource provider 与 batch bridge；30 residents 稳定 lexicographic ordering、world isolation、unknown resident errors、无随机/墙钟/LLM、无 permission 自动授权、无 persistence/migration。
- `m3-observation-v1` 兼容扩展：actorRef/resources 变为 available；location/activity/workObligation/localContext 继续真实 unavailable；没有 ActionRequest、KernelActionOutcome、World Event、world_seq 或资源写入。
- 本地 `pnpm install --frozen-lockfile`、lint、typecheck、test、build、双次 `db:setup`、官方 audit 均通过；clean disposable PostgreSQL 上 M2 integration 4/4、PRE-AL-01、PRE-AL-02 Observation 与 PRE-AL-03 30-resident read-only integration 均通过。
- 实现提交 `071862681346cf75d1a8e1715842f468cd04c7ea` 的 GitHub Actions `foundation-ci` run `34241852554` 真实 PASS；docs-only sync 不改变 runtime。
- 下一允许工作不能直接进入 M3-T04；必须先处理 authoritative location/activity/obligation source、MOVE/SLEEP semantics、bounded replan、scheduler/driver 与 full resident/domain replay，并重新做 30×30 Gate 审查。

## 2026-09-09 PRE-AL-04

- `PRE-AL-04 = PASS`；实现 Resident Runtime State Authority，`M3 = IN_PROGRESS`，`M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE` 保持不变。
- 新增 world-scoped/resident-scoped `resident_runtime_states` durable authority 与 migration `0007_flawless_mach_iv.sql`；current location 只来自 runtime authority，bootstrap policy `m3-runtime-state-v1` 显式以 home fixture 初始化 location、以 `IDLE` 初始化 activity，幂等且不覆盖已有 state。
- Work obligation 是 employment + 固定 UTC 周一至周五 09:00–17:00 + World Time 的 deterministic read model；26 employed/4 unemployed 正确区分 `NOT_DUE` 与 `NO_CURRENT_OBLIGATION`。Observation `m3-observation-v1` 的 location/activity/workObligation 已为合法 `AVAILABLE`，Life Engine 仍只读 Observation。
- 没有实现 MOVE/SLEEP、Action executor、ActionRequest submission、World Event、replan、scheduler、driver 或 30×30；剩余 blocker 为 action semantics、bounded replan、scheduler/driver 与 full resident/domain replay。
- Local full regression、clean PostgreSQL 7/7 integration、official audit 与 GitHub Actions run `34250817438` 均通过。Clean runner 暴露的 contracts 未构建 seed 边界已通过 `@mirror/db db:seed` 显式构建 contracts 修复。
- 下一允许任务仅记录 `PRE-AL-05 · MOVE / SLEEP Action Semantics`，完成 PRE-AL-04 后立即停止。

## 2026-09-09 PRE-AL-05

- PRE-AL-05 = PASS；实现提交为 `ae2fbc3fe5eab944e636cbdb6bc3d886ffc497ad`，main baseline 为 `93a817cf26812a6f0e48b0cb08401a632ad3fef8`，GitHub Actions `foundation-ci` run `34325594982` 对实现提交完整通过。
- MOVE keeps `{ destinationId }`; SLEEP keeps `{}`. `m3-action-semantics-v1` establishes deterministic travel durations and fixed 480 World Minutes sleep; SLEEP is HOME-only.
- MOVE/SLEEP use Kernel-controlled `STARTED → COMPLETED` lifecycle with `TRAVELING`/`SLEEPING`; MOVE keeps source location until completion, then commits destination and `IDLE`. `state_version`, request identity, busy rejection, idempotency, conflict, pause/maintenance and rollback are covered.
- Added four transition event types, same `KernelActionOutcome` 0/1/N association, replay-ready lifecycle payload validation, and migration `0008_curvy_tony_stark.sql`. Life Engine only gets a pure accepted SLEEP result → NeedAnchor adapter; no direct Need/resource/runtime write.
- Local frozen install, lint, typecheck, tests, build, official pnpm production audit, double clean db setup, complete disposable PostgreSQL integration, concurrency/rollback, and 30-resident MOVE/SLEEP transition checks passed. No scheduler, replan, automatic Life Engine loop, or 30×30 autonomous simulation was run.
- Remaining formal blockers: PRE-AL-06 bounded replan/failure policy, PRE-AL-07 scheduler/driver, and full resident/domain replay / 30×30 readiness. `M3 = IN_PROGRESS`; `M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE` remains unchanged.

## 2026-09-09 PRE-AL-06

- `PRE-AL-06 = PASS`；实现提交为 `d8160ed78d2371d272bd59e37720a5ab1513dca8`，原始 main baseline 为 `1359cd91317352ac8268cd7220a3abc9aa8e832f`，GitHub Actions `foundation-ci` run `34337678714` 完整通过。
- 已建立正式 `m3-replan-v1` Bounded Replan / Failure Policy：Failure classes、retry/reobserve/replan 分离，所有 recovery 均严格有界；`TIMED_OUT` 只允许先按原 request/idempotency key reconciliation，再进行有限同请求重试。
- 已建立确定性 World-Time defer；成功、停止、重观察、重规划、同请求重试和延后均为 orchestration decision，不写 Life Engine、runtime、World Event、worldSeq 或 authoritative Replay；没有新增 migration、production dependency、scheduler 或自动 resident loop。
- `M3 = IN_PROGRESS`；`M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE`。剩余 blocker 为 `PRE-AL-07` scheduler/driver、full resident/domain replay / 30×30 readiness，以及重新核验完整 action-loop readiness；下一允许任务仅记录 `PRE-AL-07`，不执行。

## 2026-09-09 PRE-AL-07

- `PRE-AL-07 = PASS`：已建立 `m3-scheduler-v1` 的 explicit World-Time deterministic serial driver、bounded due-work processing、stable UUID-byte ordering、completion-before-wake phase 与 machine-readable step result。
- World Time 仍由 `worlds.world_time` / World Clock / Kernel authority；MOVE/SLEEP due completion 只通过 Kernel completion boundary，使用 durable runtime due state、state-version fence、Kernel Outcome 与 Event Ledger，不由 scheduler 直接写 truth。
- Deferred wake 使用最小 `scheduled_wake_registrations` projection 和 world/dedupe unique key；内存 work list 可丢弃并从 PostgreSQL runtime/wake state 重建。没有 generic queue、worker、timer、Redis durable truth 或 production dependency。
- 永久架构边界为 `Scheduler = WHEN`、`Life Engine = WHAT`、`World Kernel = CAN / COMMIT`；decision wake 不包含 selected action，不实现 M3-T04 或完整 Action Loop。PAUSED/MAINTENANCE 不推进或处理 due work；当前 step 上限为 30。
- clean PostgreSQL scheduler integration、全仓 frozen install/lint/typecheck/test/build、official production audit 均通过；实现提交 `a3581a5db6500bb44282b19ccc5ada03d5c4beeb` 的 GitHub Actions `foundation-ci` run `34344722893` 完整 PASS，后续 main/doc 同步为 docs-only。
- `RES-M3-003` 只读 compatibility review 已完成。剩余正式 blockers：driver lease/fence、typed event registry/reducers、resident projection replay、full manifest/canonical semantic hashes、full 30×30 action-loop/replay/resimulation evidence；旧 contiguous event-ref 文案与正式 interleaved seq-gap contract 冲突已记录。
- 当前正式状态：`M3 = IN_PROGRESS`，`M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE`，readiness 为 `READY_TO_RETRY`；PRE-AL-07 完成后停止，不进入 PRE-AL-GATE 或 M3-T04。

## 2026-09-09 M3-T04 RETRY

- Retry Readiness Review：origin/main `2e526d3`；`M3 = IN_PROGRESS`；`M3-T04` 原为 `BLOCKED_BY_PRE_ACTION_LOOP_GATE` 且 readiness=`READY_TO_RETRY`；PRE-AL-01～07 已关闭实现前置 blocker。
- 在独立 worktree `task/m3-t04-rule-decision-maker-retry` 实现正式 Rule Decision Maker 与 Action Loop，没有重写 Kernel/Scheduler/Life authority，没有引入 LLM 或新 production dependency。
- 新增 `m3-rule-decision-v1`：bounded Candidate（仅当前可执行 MOVE/SLEEP）、hard constraints、deterministic score、stable ActionRequest draft。
- 新增 `m3-action-loop-v1`：Observation → Needs → Goals → Decision → ActionRequest → Kernel Outcome → PRE-AL-06 replan；idle/no-feasible 使用 world-time defer。
- unit：life-engine 56/56；clean PostgreSQL integration 3/3（MOVE 闭环、away-from-home REST 映射、world isolation）；全仓 lint/typecheck/test/build 与官方 audit HIGH=0/CRITICAL=0 均 PASS。
- 边界：未宣称 Full Replay PASS、30×30 PASS 或 M3 PASS。Need anchors 为 loop 内存状态，未新增 migration。
- 当前正式状态：`M3-T04 = PASS`，`M3 = IN_PROGRESS`。下一允许工作：`PRE-AL-GATE` 或额外 P1。本轮停止。

## 2026-09-10 M3 Lifecycle & Story Sanity Spec Reconciliation

- 完成正式规格对账并冻结：`SPEC_RECONCILIATION_COMPLETE`、`SPEC_READY_FOR_FORMAL_IMPLEMENTATION`、`SPEC FREEZE = ON`；规格包位于 `docs/verification/M3-LIFECYCLE-STORY-SPEC-RECONCILIATION/`。
- 冻结 EAT/WORK/TALK 的 Kernel-backed `STARTED → COMPLETED` 生命周期、M3-T04 candidate/action-loop 扩展、scheduler/due-wake、typed events、replay/checkpoint 与机器化 Story Sanity gate；未实现生产代码、schema、migration 或 M3-T05。
- BUY 明确保持 M3 declared-but-non-executable，完整 settlement 属于 M6；M3 仍为 `IN_PROGRESS`，剩余 P1 为 lifecycle implementation + extended gate 与 M3-T05 execution。
- 两项实现前 ADR 注册/接受仍是前置门：EAT consumable capability 与 TALK paired runtime lock。下一正式任务为 `M3 Behavioral Lifecycle Extension`（`TASK_ID_PENDING_FORMAL_REGISTRATION`）。

## 2026-09-10 M3 Lifecycle ADR Formalization

- 完成正式治理：冻结 spec 已 promote 至 main 输入；`ADR-M3-EAT-KERNEL-CONSUMABLE-CAPABILITY` 与 `ADR-M3-TALK-PAIRED-RUNTIME-LOCK` Accepted；未实现 lifecycle 或 T05。
- EAT 只使用单一 Kernel/PostgreSQL food resource seam 与 start-time CAS；TALK 保持 single initiator、participant reference、world-first + resident UUID-byte paired lock；WORK 为 attendance-only、`ADR_NOT_REQUIRED`。
- 注册 `M3 Behavioral Lifecycle Extension`，不发明数字 task ID，formal ID 为 `FORMAL_TASK_REGISTERED_WITHOUT_NUMERIC_ID`；注册 `M3-LIFECYCLE-STORY-GATE` 与 `M3-T05 = DEFINED / NOT_STARTED`。
- 治理任务未修改生产代码、schema、migration、依赖或运行时测试；没有执行 EAT/WORK/TALK、30×30、M3-T05 或 M4/M5/M6。`foundation-ci` run `34433236275` 对治理提交 `69fcf40b83fea3b30428ea87997c8458935a0bdc` 为 `Success`。

## 2026-09-10 M3 Behavioral Lifecycle Extension

- 在独立 worktree `mirror-world-m3-behavioral-lifecycle-extension`、分支 `task/m3-behavioral-lifecycle-extension`，基于 `origin/main=cbcd1ae58771c9a261fed9c5f96fcaf4ea08e0ca` 完成正式 EAT/WORK/TALK lifecycle extension，实现提交 `b5cb5a7a29444d2db33704d655d29688287fd23a`。
- 实现包含 Kernel-backed EAT/WORK/TALK、M3-T04 Rule Decision/Action Loop v2、既有 scheduler/due-wake extension、typed events v2、reducers/projection/full-suffix-genesis replay/checkpoint 与 causal/idempotency/restart/race/isolation evidence；BUY 仍 declared-but-non-executable，无 payroll、economy、dialogue、LLM、M4+。
- Node `v24.11.1` 下 frozen install、format/lint/typecheck、uncached unit tests、build、官方 production audit（HIGH=0、CRITICAL=0）通过；一次性 clean PostgreSQL 上 `db:setup` 应用 12 个 journal entries，完整 integration 35/35、M3 lifecycle targeted 15/15、life-engine 72/72 通过。证据报告为 `docs/verification/M3-BEHAVIORAL-LIFECYCLE-EXTENSION-report.md`。
- EAT/TALK completion payloads 通过纯 `m3-need-effects-v1` adapter 进入下一次 Needs evaluation（EAT `55 × quantity` hunger relief，TALK `35` social relief）；不写 durable Need truth。WORK wake 只在成功 WORK start 注册/刷新；没有启用 bootstrap-wide 自动 reconcile，以保持历史 PRE-AL fixture profile 不变。
- 实现提交阶段状态曾为 `LOCAL_VERIFICATION_PASS_CI_PENDING`；随后通过 GitHub Actions 完成正式关闭。尚未执行 `M3-LIFECYCLE-STORY-GATE`、expanded 30×30、M3-T05 或 M4+。

## 2026-09-10 M3 Behavioral Lifecycle Extension CI Closure

- PR #1 已合并到 `main`，合并提交为 `0ddceafc91c4da274f545b98742d4b69c3a9ade1`；feature commit `96a9576b17fe80615c9e664012e2fa0cdcb4f5b0` 的 `foundation-ci` run `34463283837`、merge commit 的 run `34463309484` 与最终 main 文档收口提交 `bf19b9e760124d23ddc10b3a284b89e713c4409b` 的 run `34464013190` 均为 `Success`。
- `M3 Behavioral Lifecycle Extension = PASS`；`M3 = IN_PROGRESS` 不变。没有执行 `M3-LIFECYCLE-STORY-GATE`、expanded 30×30、M3-T05 或 M4+；下一允许任务仅为 `M3-LIFECYCLE-STORY-GATE`。

## 2026-09-10 M3-LIFECYCLE-STORY-GATE

- 正式 Gate 在 `HEAD == origin/main=590d19d000fc04723028556e267cdbed362b4da8`、初始 worktree clean、`foundation-ci` run `34464740586=success` 上执行；三套独立 clean PostgreSQL（18.6、12 migrations、fresh seed）完成 baseline/repeat/different-seed 的 30×30 World-Time run。
- baseline/repeat 精确到 `2026-10-07T00:00:00.000Z`、`worldSeq=10668`；baseline committed starts 为 MOVE 950、SLEEP 702、EAT 60、WORK 4、TALK 203；replay 四 hash 一致，same-seed digest 相同，different-seed/BUY/LLM/isolation 证据通过。
- `M3-LIFECYCLE-STORY-GATE = FAIL`，唯一失败 Hard Gate 为 #3 Accepted action coverage：5 名 fixture resident 初始 food=0，11 名无 TALK completion，23 名 employed resident 无 WORK completion，4 名无 MOVE completion；diagnostics `RESOURCE_DEPLETION=30`、`SOCIAL_STARVATION=11`、`WORK_ABSENCE=23`。
- 失败分类为 `GATE_CONTRACT_FIXTURE_CONFLICT` 与 `POLICY_COVERAGE_MISMATCH`；没有调参、补资源、修改 fixture/时间/规则/Hard Gate，也未执行 M3-T05、Final Status Review #2 或 M4+。报告与 bundle：`docs/verification/M3-LIFECYCLE-STORY-GATE-report.md`、`docs/verification/artifacts/M3-LIFECYCLE-STORY-GATE/20260910-run-08/`。

## 2026-09-11 M3 Story Gate Coverage Contract

- 正式完成 `M3-LIFECYCLE-STORY-GATE-COVERAGE-RECONCILIATION` 并纳入当前主线文档；接受 `M3-LIFECYCLE-STORY-GATE-COVERAGE-CONTRACT-v2` 作为 Hard Gate #3 future-run clarification，仅改变 coverage measurement/predicate，不改其余 14 gates、ADR-0011/0012、Kernel、BUY boundary 或 run-08。
- v2 固定区分 action count、unique initiator/participant/eligible/feasible/opportunity/candidate/selected/requested/committed/completed resident sets；funnel 为 `TOTAL → ELIGIBLE → FEASIBLE → OPPORTUNITY → CANDIDATE_GENERATED → SELECTED → REQUESTED → COMMITTED → COMPLETED`，missing negative evidence = `UNKNOWN`，不能作为 zero 或 denominator shrink。
- 决策：SLEEP 当前固定 manifest 保留 30 denominator；EAT 分离 Need eligibility/resource feasibility，5 zero-food 不补资源；TALK participant 计入 resident contact union 但保留 initiator count；MOVE 按 formal necessity；WORK 注册 pre-shift wake 修复并保持 exact 09:00/LATE rejection。
- 仅注册一个最小后续 `M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX = DEFINED / NOT_STARTED`，内部包含 Work Preparation Wake Fix 与 read-only funnel evidence extension；未注册 TALK policy fix，未执行生产修复、full rerun、M3-T05 或 M4+。
- 审计发现 review commit `ded7c6d…` 的 01_BASELINE run-summary hash 有误且 funnel 漏写 `OPPORTUNITY`；保留工作区正确 hash，补齐 funnel/model 与 accepted contract，并保留 run-08 原始 bundle 不变。
- 治理提交 `0fda99c486694a65c1e05b96ca2aa30a4f827ecc` 已推送到 `gate/m3-lifecycle-story` 并 fast-forward 到 `origin/main`；`foundation-ci` run `34548099657` 为 `success`。

## 2026-09-11 M3 Story Gate Coverage Fix

- 在独立 worktree `/Users/alin/AI项目/mirror-world-m3-story-gate-coverage-fix`、分支 `task/m3-lifecycle-story-gate-coverage-fix` 完成正式 `M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX`，实现提交为 `780e491c6ee2d14bb7d44eaa8114ee2402721de9`；修复为复用 `m3-scheduler-v2` 的 bootstrap-wide World-Time pre-shift preparation wake，并把机会传入既有 Life Engine decision loop，未创建第二 scheduler、未使用 wall clock。
- Clean disposable PostgreSQL `mirror_m3_covfix_20260911` 上 Node 24 targeted integration 7/7；完整 API integration 42/42，包含既有 M3 lifecycle replay 15/15 与 PRE-AL-GATE 既有 30×30 profile 回归。WORK exact 09:00、09:01/LATE rejection、10/15-minute route、restart/requery/dedupe、weekend/unemployed/workplace/busy/pause/maintenance/stale-fence/isolation 均 PASS。
- 新增 `m3-story-gate-coverage-v2` collector/evaluator：完整 funnel、`UNKNOWN` fail、EAT feasibility、MOVE necessity、TALK initiator/participant union 与 bounded negative rows；TALK policy、paired lock/topology、EAT/MOVE production semantics、fixture、BUY、migration/schema、Kernel authority 与 run-08 均未改。
- Targeted artifacts 与正式报告：`docs/verification/artifacts/M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX/`、`docs/verification/M3-LIFECYCLE-STORY-GATE-COVERAGE-FIX-report.md`。Coverage Fix = PASS；PR #2 已合并，feature CI `34568408286` 与 main CI `34568751236` 均为 `Success`，最终 `origin/main=66d1863ca2b77f37d535dcf02929d3db617ef13c`；Story Gate 历史 `FAIL / RERUN_REQUIRED`、M3=`IN_PROGRESS`、M3-T05=`DEFINED / NOT_STARTED`；完整 Story Gate rerun 未执行。

## 2026-09-12 M3 Story Gate Runner Infrastructure Remediation

- 在 `origin/main=71e3f1b9f05c0d0273d4117e83c513ef547f38ab` 基线上完成本地 runner remediation：run-14 OOM 已由 repeat scenario 的 coverage `structuredClone` materialization 栈确认，Node 24 heap 峰值约 8147 MB / limit 8192 MB；run-14 继续保持 `INFRA_FAILURE / ABORTED_BEFORE_GATE_FINALIZE`，不可复用或补写。
- 新 runner 采用 baseline → repeat → different 串行、每 scenario 独立 Node child、atomic per-scenario artifacts、causal/Coverage streaming arrays、bounded incremental hash、独立大 JSON validator 与 summary-only finalizer。默认 heap 为单 child 12288 MB；不是 heap-only fix。Artifact schema、Coverage v2、Hard Gates、fixture、seed、production semantics 未变。
- runner/serializer/finalizer/abort/stress/run-ID tests `25/25`；真实 reduced child 为 30 residents × 1920 World Minutes、1 GB heap、66440 coverage rows、15 artifacts validated；fresh PostgreSQL API integration `42/42`，全仓 install/lint/typecheck/test/build 与 official audit（HIGH/CRITICAL=0）通过。该 reduced run 不是 Story Gate，full rerun 未执行。
- 正式报告：`docs/verification/M3-LIFECYCLE-STORY-GATE-RUNNER-INFRA-REMEDIATION-report.md`。截至本记录 remote CI 尚 pending；M3=`IN_PROGRESS`，Story Gate=`RERUN_REQUIRED`，run-14=`INFRA_FAILURE`，M3-T05=`DEFINED / NOT_STARTED`；下一正式任务是新的 immutable Story Gate run ID。
