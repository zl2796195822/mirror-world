# M0 验证报告

## 结论

状态：IMPLEMENTED_UNVERIFIED

项目目录：`/Users/alin/AI项目/镜界`

M0「工程地基」已实现，全部本地门禁、干净数据库重建验证和官方 production dependency audit 均通过；远程 GitHub Actions 已实际执行，但第 1 次运行因 workflow 步骤顺序失败，已完成最小修复，等待下一次运行。当前未实现 M1 及后续业务功能。

## 修改范围

- pnpm + Turborepo 单仓库与 Node.js 24 / TypeScript / ESLint / Prettier 基线。
- `packages/db`：Drizzle schema、migration、M0 fixture、seed 与确定性单元测试。
- `docker-compose.yml`：PostgreSQL 18.6、Redis 8.2.1、MinIO 固定版本及健康检查。
- `AGENTS.md`、`docs/PROJECT_STATE.md`、ADR 模板、第三方登记、CI 与 README。
- 直接依赖的许可证已从安装后包元数据核验并登记。
- `drizzle-orm` 从 `0.44.5` 最小升级到 `0.45.2`，同步更新 `pnpm-lock.yaml`。

## 数据库与种子

- migration：`packages/db/drizzle/0000_parallel_morlocks.sql`
- 表：`users`、`worlds`
- 固定 user：`00000000-0000-4000-8000-000000000001`
- 固定 world：`00000000-0000-4000-8000-000000000002`
- 固定 seed：`mirror-m0-foundation-v1`
- 初始世界时间：`2026-09-07 06:00 +08:00`
- `pnpm db:setup` 连续执行两次：PASS；migration 幂等，seed 使用 upsert。
- `docker compose down -v` 后重新 `up -d`：PASS；两个项目卷成功销毁并重建，三项服务恢复为 `healthy`。
- 最终数据库查询：`users=1`、`worlds=1`、公共表数量为 `2`。
- 空库 setup 后 migration 记录数为 `1`，seed 记录保持单例。

## 验证结果

| 检查                                                      | 结果       | 真实证据                                             |
| --------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| `pnpm install`                                            | PASS       | 依赖安装完成，lockfile 可用                          |
| `pnpm lint`                                               | PASS       | ESLint 与 Prettier 检查通过                          |
| `pnpm typecheck`                                          | PASS       | TypeScript 检查通过                                  |
| `pnpm test`                                               | PASS       | 1 个测试文件、1 个测试通过                           |
| `pnpm build`                                              | PASS       | `@mirror/db` 构建通过                                |
| `docker compose ps`                                       | PASS       | PostgreSQL、Redis、MinIO 均 `healthy`                |
| `pnpm db:setup` × 2                                       | PASS       | migration 与 seed 均成功                             |
| `pnpm audit --prod`                                       | UNVERIFIED | 默认 npm 镜像未提供 audit endpoint                   |
| `pnpm audit --prod --registry=https://registry.npmjs.org` | PASS       | `No known vulnerabilities found`；HIGH=0、CRITICAL=0 |

## API 与事件

M0 不实现业务 API、World Kernel 或世界事件；本轮 API/Event 变更为无。

## Git 与提交审计

- remote：`git@github.com:zl2796195822/mirror-world.git`
- branch：`main`
- 已 push 的提交：`faa2270421122d08537239027b0f62a765c16198`
- `git status`：工作区仅有待提交的 CI 顺序修复；此前提交未包含文档库 ZIP、大型二进制资产、DOCX、图片或真实隐私数据。
- `gh auth status`：未执行成功，原因是本机未安装 `gh` CLI；SSH remote 已实际 push 成功。

## CI

已创建并解析 `.github/workflows/ci.yml`，覆盖安装、lint、typecheck、unit test、build。Ruby YAML parser 与 workflow 必需步骤检查 PASS；`pnpm exec prettier --check .github/workflows/ci.yml` 待本次文档格式化后复核。

CI 状态：`CI_REMOTE_UNVERIFIED`。第 1 次真实运行：

- run URL：`https://github.com/zl2796195822/mirror-world/actions/runs/34144242021`
- commit：`faa2270421122d08537239027b0f62a765c16198`
- Job `foundation`：FAIL
- 失败步骤：`Install dependencies` 尚未开始；`setup-node@v4` 的 `cache: pnpm` 先于 pnpm setup 执行，真实日志为 `Unable to locate executable file: pnpm`。
- 另有 Node.js 20 action runtime deprecation warning，不是失败原因。

已将 `Enable pnpm` 移到 `Use Node.js 24`（含 `cache: pnpm`）之前，待 push 后重新执行并记录全部步骤状态。本轮不伪造远程 PASS。

## 已知问题

- 文档库 `manifest_v1.2.json` 的文件数量/文件名与实际目录仍有差异，记录为文档基线问题，不阻塞 M0 工程地基。
- 默认 npm 镜像 audit 接口不可用；官方 registry 审计已在升级后 PASS，HIGH=0、CRITICAL=0。
- GitHub Actions 第 1 次运行已记录为失败；修复提交及下一次运行结果待补充。

## M0 DoD

| Task ID | 结果                   | 证据                                                                                           |
| ------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| M0-T01  | PASS                   | `pnpm install --frozen-lockfile`、lint、typecheck、test、build 全部通过                        |
| M0-T02  | PASS                   | `docker compose down -v` 后 `up -d`，PostgreSQL、Redis、MinIO 均 healthy                       |
| M0-T03  | PASS                   | 空数据库 migration + seed，第二次 migration + seed，最终 `migrations=1`、`users=1`、`worlds=1` |
| M0-T04  | PASS                   | `AGENTS.md`、`docs/PROJECT_STATE.md`、ADR 模板和项目记忆已建立/更新                            |
| M0-T05  | IMPLEMENTED_UNVERIFIED | workflow YAML 解析通过；GitHub Actions #1 真实失败，已修复步骤顺序，待重跑                     |

## DoD 与下一任务

M0-T01 至 M0-T04 的本地 Definition of Done 满足；production dependency audit 已修复并 PASS，M0-T05 的远程执行尚未 PASS。最终结论为 `M0 = IMPLEMENTED_UNVERIFIED`。禁止进入 `M1-T01`。
