# M2-T01 世界时钟验证报告

## 结论

当前本地实现与验证结果为 PASS；GitHub Actions 需要在本报告提交后完成最终确认。报告最终状态只在对应 main HEAD 的 CI 真实通过后更新为 `M2-T01 = PASS`。

## Task ID

`M2-T01`

## 文档原始目标

按《镜界*Codex里程碑任务书》《镜界\_M0-M13实施规格与依赖矩阵》及《镜界*全量开发母文档》：

- 实现 real time / world time / `time_scale`；
- 开发环境支持 `pause/10x/100x`；
- 生产默认 `1x`；
- DoD：重启后时间不倒退，暂停不产生 tick。

本轮没有执行 M2-T02 及后续任务。

## World Kernel 边界影响

- 新增 `packages/world-kernel`，World Clock 是当前唯一允许更新世界时钟事实的入口。
- API handler 不直接更新 `worlds`；单世界读取同步和开发控制都调用 Kernel store，并在 PostgreSQL 事务内锁定目标世界行。
- `worlds.world_time` 是 durable world fact；`clock_anchor_at` 是对应的 wall-clock 锚点。
- 没有实现 ActionRequest、Kernel validator、Event Ledger、Checkpoint、Replay、Simulator lease 或其他领域写入。
- Redis 没有参与事实存储。

## 事实模型影响

新增：

- `worlds.clock_anchor_at timestamptz not null`；
- `worlds.status` 约束为 `RUNNING/PAUSED/MAINTENANCE`；
- `worlds.time_scale` 约束为 `1/10/100`。

暂停或维护状态只推进 wall-clock 锚点，不推进 `world_time`。生产读取会将有效倍率收敛为 `1x`。

## Event 模型影响

本任务没有创建 `world_events`，没有落 `WORLD_TIME_ADVANCED`，没有 seq 或 Event Registry 写入。事件账本及事件事务属于 M2-T04，保留后续接入边界。

## 数据库变化与 Migration

- 新增 `packages/db/drizzle/0001_late_karma.sql`。
- clean PostgreSQL 上 migration 成功，`drizzle` migration 数量为 2。
- `pnpm db:setup` 连续两次成功，seed 保持固定 world ID、seed、时间和暂停状态。
- 数据库恢复验证：`clock_anchor_at` 与 `world_time` 均可从 PostgreSQL 读取；Redis 不参与恢复。

## API / Contract 影响

- `GET /api/v1/worlds/:worldId`：通过 Kernel 同步并返回单世界时钟。
- `POST /api/v1/worlds/:worldId/admin/time`：仅 development 环境允许设置 `RUNNING/PAUSED/MAINTENANCE` 与 `1/10/100`；production 返回结构化 `WORLD_TIME_CONTROL_DISABLED`。
- OpenAPI 已重新生成；M1 的 `/health`、`/ready`、`/worlds` 保持兼容。
- 不新增 WebSocket、Action、Snapshot 或 Event API。

## Determinism / Replay 影响

- 核心函数接收显式 `now`，不调用 `Date.now()` 或 `Math.random()`。
- 相同 world state、wall-clock 输入、environment 和 scale 得到相同结果。
- wall clock 回拨时使用不小于既有锚点的有效时间，world time 不倒退。
- 完整 seed + event replay 仍属于 M2-T05，本任务只保证时钟计算不阻塞未来 replay。

## Transaction / Idempotency

- 时钟同步和控制在同一个 PostgreSQL transaction 中读取 `FOR UPDATE` 行锁并更新同一 `worlds` 行，避免半更新的时钟状态。
- M2-T01 不涉及 ActionRequest，因此没有新增 idempotency contract；重复控制请求不会引入事件或其他事实。
- 多实例 lease、Simulator fencing 和事件 seq 尚未实现，属于后续边界，不能被本任务的单实例测试替代。

## Tests

自动化测试：

- `packages/world-kernel/src/world-clock.test.ts`：6 tests PASS，覆盖 scale、暂停、wall-clock 回拨、生产 1x、开发控制、生产控制拒绝。
- `packages/db/src/seed.test.ts`：1 test PASS，覆盖固定时钟 fixture。
- `apps/api/scripts/api-contract.test.mjs`：6 tests PASS，覆盖 envelope、OpenAPI、M1 只读 API 和无数据库 fail-closed。
- `apps/api/scripts/world-clock.integration.test.mjs`：1 test PASS，使用真实 PostgreSQL 覆盖 migration 后的 10x、暂停不 tick、100x、production 1x、控制关闭与重启回拨。

真实命令结果：

```text
pnpm install --frozen-lockfile       PASS
pnpm db:setup                        PASS
pnpm db:setup                        PASS
pnpm --filter @mirror/api test:integration PASS
pnpm lint                            PASS
pnpm typecheck                       PASS
pnpm test                            PASS
pnpm build                           PASS
```

## M1 回归

- API contract tests 保持 PASS：`/health`、`/ready`、`/worlds`、统一 requestId/error envelope、OpenAPI。
- Web package 的 M1 tests 3/3 PASS，production build PASS。
- 没有修改 M1 Web/Auth 业务代码。

## Audit / Dependencies

- 没有新增外部依赖；复用已登记的 Drizzle ORM、PostgreSQL、Fastify 和现有工具。
- `pnpm audit --prod --registry=https://registry.npmjs.org`：`No known vulnerabilities found`。
- Git diff review 与 `git diff --check`：PASS。

## GitHub Actions

本地已更新 CI：启动 PostgreSQL、运行 migration/seed，并执行 world clock integration test。最终 run、URL 和状态在推送后补录。

## P0 / P1 / P2

- P0：0。
- P1：0。
- 既有 P2 保留：文档库 manifest 文件数量/文件名不一致；外部 GitHub Actions Node.js 20 runtime deprecation warning。
- 本任务新增未决边界：多实例 lease、Event Ledger、checkpoint/replay 未实现，均不属于 M2-T01 DoD。

## Definition of Done

| DoD                        | 证据                                                   | 状态    |
| -------------------------- | ------------------------------------------------------ | ------- |
| real/world time 与 scale   | pure clock tests + real DB integration                 | PASS    |
| development pause/10x/100x | development API integration                            | PASS    |
| production default 1x      | production integration                                 | PASS    |
| restart/world time 不倒退  | production wall-clock rollback integration             | PASS    |
| paused 不 tick             | paused integration assertion                           | PASS    |
| PostgreSQL durable truth   | migration/schema/DB query                              | PASS    |
| Kernel 唯一时钟写边界      | API 无直接 world update，写入集中在 world-kernel store | PASS    |
| CI 真实通过                | push 后等待 GitHub Actions                             | PENDING |

## Commit / State

- 实现 commit SHA：待代码提交后补录。
- 最终 main HEAD：待最终文档同步提交后补录。
- Verification report：`docs/verification/M2-T01-report.md`。
- PROJECT_STATE：已切换到 M2-T01，待 CI 通过后最终标记 PASS。
- 下一允许任务：`M2-T02`，仅记录，不执行。
