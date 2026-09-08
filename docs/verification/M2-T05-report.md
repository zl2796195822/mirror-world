# M2-T05 Checkpoint / Replay 验证报告

## 结论

本地实现、真实 PostgreSQL 验证、全仓质量门禁、依赖审计与远程 GitHub Actions 均已通过，Gate 状态为 `M2-T05 = PASS`。本轮只完成 M2-T05，下一允许步骤仅为 `M2 Milestone Gate`，不执行 M3 或任何后续能力。

## 原始目标

按 M2-T05 原始 Task、Acceptance Criteria 与 Definition of Done：

- 新增按 `world_seq` 定位的 simulation checkpoint；
- 使用固定 seed 与 ordered authoritative events 重建状态；
- 支持 checkpoint + suffix replay；
- 相同 seed 与相同事件流得到稳定、可验证的 summary hash；
- 保持 PostgreSQL durable truth、Event Ledger 顺序与不可变边界。

## 实际实现

- `packages/db/src/schema.ts` 新增 `simulation_checkpoints`，保存 `world_id`、`world_seq`、`schema_version`、`snapshot`、可选 `snapshot_uri`、`checksum` 与 infrastructure `created_at`。
- migration `packages/db/drizzle/0004_old_ares.sql` 增加唯一约束、world 外键、seq/schema check，以及拒绝 future/nonexistent-event checkpoint 的数据库 trigger。
- `packages/world-kernel/src/world-replay.ts` 实现固定 seed + ordered event replay、严格的 `WORLD_TIME_ADVANCED` 时间连接校验、schema v1 snapshot、canonical SHA-256 history/summary hash、checkpoint suffix replay 与损坏输入拒绝。
- `packages/world-kernel/src/world-checkpoint-store.ts` 实现 world row lock 下的 checkpoint persistence、duplicate/conflict 语义与按 world/seq 查询。
- `apps/api/scripts/replay-checkpoint.integration.test.mjs` 接入完整 M2 integration 顺序，覆盖 full replay、checkpoint resume、hash equality、duplicate/conflict 与数据库 future-seq 拒绝。

## Authority 与范围边界

- World Kernel 仍是事实写入口；M2-T05 没有新增绕过 Kernel 的世界事实写入。
- PostgreSQL `worlds`、`world_events` 与 `world_seq` 是 durable truth；checkpoint 只是可删除、可重建的恢复/加速数据。
- Event Ledger schema、append-only 约束、world-local sequence 与历史行均未修改或删除。
- World Clock 的 `world_time` 由已有 `WORLD_TIME_ADVANCED` event replay；`created_at` 只作为基础设施记录时间。
- Action Contract、Kernel Validator、`action_requests` 继续保持原边界；Replay 不重新执行 ActionRequest，也不假设一条 request 对应一条 event。
- ActionResult、Projection、Simulator、Life、Memory、Relationship、Economy、AI、3D、Digital Identity、Offline Simulation 与 API 扩展均未实现。

## Transaction、幂等与 sequence

- Checkpoint persistence 在 PostgreSQL transaction 内锁定目标 world，先验证当前 `world_seq`，再插入 checkpoint。
- `(world_id, world_seq)` 唯一约束保证同一 world/position 只有一个 checkpoint；同 checksum 重试为 `duplicate`，不同 checksum 为 `conflict`。
- 数据库 trigger 拒绝 `world_seq` 超过当前世界序号或指向不存在事件的 checkpoint；历史 `world_events` 未被 UPDATE/DELETE。
- Replay 输入必须从 `appliedSeq + 1` 连续消费，world mismatch、seq gap、schema mismatch、非法时间与 checksum mismatch 均 fail closed。

## Determinism 与 world isolation

- Replay 只使用显式 seed、初始 world time、事件的 `seq`/payload/`occurred_at` 与版本化 canonical representation；不调用 `Math.random()`、LLM、当前时间、UI 状态或 Redis durable data。
- 相同 seed 与等价属性顺序的相同事件流产生相同 summary hash；checkpoint suffix replay 与 full replay hash 相等。
- 所有 checkpoint/replay store 查询均要求 `world_id`；真实 PostgreSQL integration 验证 world-scoped checkpoint，Event Ledger 既有测试继续覆盖 world isolation。
- 当前没有居民、库存等领域事实，因此现有非时间事件只做 schema-validated no-op，但仍进入 history digest；这不是对未来领域 replay 的提前声明。

## 验证结果

| 验证                                                      | 结果                                                                                                                    |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                          | PASS                                                                                                                    |
| clean database `pnpm db:setup` 第 1 次                    | PASS                                                                                                                    |
| 同一 clean database `pnpm db:setup` 第 2 次               | PASS                                                                                                                    |
| `pnpm lint`                                               | PASS                                                                                                                    |
| `pnpm typecheck`                                          | PASS                                                                                                                    |
| `pnpm test`                                               | PASS；world-kernel 25 tests，既有 contracts/db/web/API tests 全部通过                                                   |
| `pnpm build`                                              | PASS                                                                                                                    |
| 临时 clean PostgreSQL 上 M2 全部 integration              | PASS；World Clock、Event Ledger、Replay/Checkpoint、Action Request 4/4                                                  |
| `pnpm audit --prod --registry=https://registry.npmjs.org` | PASS；No known vulnerabilities found                                                                                    |
| Docker PostgreSQL / Redis / MinIO                         | PASS；healthy                                                                                                           |
| 主库最终状态                                              | PASS；migration=5、users=1、worlds=1、action_requests=0、world_events=20、world_seq=20、checkpoint=0、world=`PAUSED/1x` |
| GitHub Actions                                            | PASS；[foundation-ci run 34204276572](https://github.com/zl2796195822/mirror-world/actions/runs/34204276572)            |

## Definition of Done

| DoD                                     | 证据                                                                         | 状态 |
| --------------------------------------- | ---------------------------------------------------------------------------- | ---- |
| 按 world sequence 保存 checkpoint       | `simulation_checkpoints`、唯一约束、world foreign key、seq trigger           | PASS |
| checkpoint 可恢复并继续 replay          | `replayFromCheckpoint` 与真实 suffix integration                             | PASS |
| deterministic replay/hash               | canonical SHA-256 与 unit/integration equality 断言                          | PASS |
| corrupted/future checkpoint fail closed | checksum/schema/seq 校验与 PostgreSQL trigger                                | PASS |
| durable truth 不被 checkpoint 取代      | Event Ledger 未修改；checkpoint 可删除重建                                   | PASS |
| 不提前实现 M2-T05 之外能力              | 无 ActionResult、Projection、Simulator、Life 或 M3+                          | PASS |
| 全仓质量、数据库与审计                  | install、双次 setup、lint、typecheck、test、build、integration、audit        | PASS |
| 远程 CI Gate                            | run `34204276572` 对实现提交 `838c6e5eede3aaf413c5a9966893444ae7cb92ad` 成功 | PASS |

## P0/P1/P2 与未验证边界

- P0：0。
- P1：0。
- 既有 P2：文档库 manifest 文件数量/文件名不一致；GitHub Actions 外部 action 的 Node.js 20 runtime deprecation warning。
- 真实生产部署、真实居民领域事实、Projection、ActionResult、Simulator、Life、Memory、Relationship、Economy、AI、3D、Digital Identity、Offline Simulation 与 M3 仍未实现/未验证，不属于本 Gate 的隐含完成项。

## 提交与下一步

- M2-T05 实现提交：`838c6e5eede3aaf413c5a9966893444ae7cb92ad`。
- ADR：`docs/adr/ADR-0006-m2-t05-checkpoint-replay.md`。
- 下一允许步骤：`M2 Milestone Gate`，仅记录，不执行。
