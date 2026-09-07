# 镜界项目记忆

## 2026-09-07

- 已阅读 `文档/镜界_完整开发文档库_v1.2` 的 README、v1.2 增量说明、顶层蓝图/母文档/总索引、PRD/UIUX/第一条街 MVP、World Kernel/模拟重放、Life/Memory/AI、Identity/Economy、DB/API/3D、QA/运维/安全、M0-M13 执行与治理/研究/OSS 文档。
- 当前工作区已完成 M0 工程地基：pnpm/Turborepo、Docker 本地依赖、Drizzle migration/seed、AGENTS、PROJECT_STATE、ADR 模板、第三方登记、CI 与 M0 verification report 均已建立；M0 状态为 PASS，尚未实现 M1 及后续业务。
- 核心不可破坏边界：PostgreSQL 是长期事实源；World Kernel 是唯一事实写入口；所有真人/规则/AI/代理都提交 ActionRequest；LLM 只能产生 Intent/Candidate/Summary，不能直接写世界状态；Redis 只做 cache/lease/queue；事实变化必须可由 world_events/ledger 追溯并可重放。
- MVP 是 30 个固定 seed 居民、6 类地点、30 天无 LLM 持续模拟，验证需求/目标/关系/记忆/经济因果是否产生用户愿意回访的非预编排故事；M7 只做 Web 3D，M11/M12 是不阻塞主线的写实实验支线。
- v1.2 新增 OSS-001/002/003：成熟库可 DEPENDENCY，完整模块按 PORT，冲突或仅有思想价值的项目按 REFERENCE；未核验许可证、Proprietary/NC 项目不得复制进入主仓；所有外部代码需固定 commit、审计、登记、测试和退出条件。
- 后续执行必须一次只做一个里程碑，严格按 DoD、真实验证、`docs/PROJECT_STATE.md`、verification report、ADR 与文档同步推进。
- M0 最终验证：lint/typecheck/test/build、Docker Compose 健康检查、`db:setup` 连续两次和最终 users/worlds 查询均 PASS；`pnpm audit --prod` 因 npm 镜像缺少 audit endpoint 为 UNVERIFIED，不代表无漏洞；远程 CI 尚无执行记录。
- 当前仅允许的下一任务为 M1-T01。
- 文档完整性备注：`manifest_v1.2.json` 声明/列出 32 个文件，但实际目录有 33 个文件；它列出 `manifest.json`，实际存在的是 `manifest_v1.2.json`，另有 `manifest_v1.0_legacy.json`。

## 2026-09-08

- M0 收尾复核：干净 Docker 卷重建、`pnpm install --frozen-lockfile`、lint、typecheck、test、build、migration/seed 两次和最终数据库计数均 PASS。
- CI workflow YAML 解析通过且包含 install、lint、typecheck、unit test、build；已配置 GitHub remote，但尚未提交或 push，CI 状态为 `CI_REMOTE_UNVERIFIED`，本机未安装 `gh` CLI。
- `drizzle-orm@0.44.5` 的 HIGH advisory 已最小升级至 `0.45.2`；官方 npm registry production audit 复核 PASS，HIGH=0、CRITICAL=0。M0 当前状态为 `IMPLEMENTED_UNVERIFIED`，禁止进入 M1，等待远程 Actions 真实 PASS。
