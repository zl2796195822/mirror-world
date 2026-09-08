# M2-T04 Event Ledger 验证报告

## 结论

本地实现、真实 PostgreSQL 验证、全仓质量门禁与远程 GitHub Actions 均已通过，Gate 状态为 `M2-T04 = PASS`。M2-T04 的实现范围已完成，未进入 M2-T05 或任何后续任务。

本报告只覆盖 M2-T04，不代表 M2-T05、M3、Life、Memory、Relationship、Economy、AI、3D、Digital Identity 或 Offline Simulation 完成。

## 原始目标

按《镜界 Codex 里程碑任务书》与《镜界 M0-M13 实施规格与依赖矩阵》，M2-T04 要求：

- 建立 Event Ledger 与 `world_events` append-only 表；
- 在单个 world 内分配单调 `seq`；
- world state 与 event 在同一 PostgreSQL transaction 中提交；
- 由数据库约束阻止 UPDATE、DELETE 与跳 seq；
- 用集成测试验证 rollback。

## 实际实现

- `packages/db/src/schema.ts` 新增 `worlds.world_seq` 与 `world_events`：
  - `id`、`world_id`、`seq`、`type`、`actor_id`、`target_id`；
  - `payload`、`occurred_at`、`correlation_id`、`created_at`；
  - `(world_id, seq)` 唯一约束。
- `packages/db/drizzle/0003_cold_viper.sql` 新增数据库一致性保护：
  - event insert 必须是当前 world seq 的下一项；
  - `world_events` 禁止 UPDATE/DELETE；
  - `world_seq` 只能递增 1，且必须有对应 event；
  - deferred consistency trigger 保证 transaction 结束时 `world_seq = max(event.seq)`。
- `packages/world-kernel/src/world-events-store.ts` 新增：
  - `appendWorldEvent`；
  - `commitWorldStateWithEvent`；
  - `commitWorldStateWithEventInTransaction`；
  - payload `schemaVersion` 校验与事件类型 registry。
- `packages/world-kernel/src/world-clock-store.ts` 的 world time 实际推进现在与 `WORLD_TIME_ADVANCED` 在同一 transaction 内提交；事件时间使用 world time。
- `apps/api/scripts/event-ledger.integration.test.mjs` 覆盖并发序号、不可变性、跳序、事务回滚与 world 隔离；API integration script 改为串行，避免 World Clock、Event Ledger、Action Request 共享 fixture 时互相竞态。

## Durable truth 与范围边界

- PostgreSQL 是事件账本与 `world_seq` 的 durable truth；Redis 没有承载事件事实。
- World Kernel 是新增事件与状态组合提交的唯一代码入口；LLM、API 与测试没有新增事实写入口。
- `action_requests` 仍只保存 M2-T03 的请求 metadata，不是世界事实，也没有被本任务升级为 ActionResult。
- 没有实现 Action API、Projection、Checkpoint、Replay、Simulator、居民/地点/库存/经济事实或任何 M2-T05/M3+ 能力。

## 测试与验证

### 自动化测试

- `apps/api/scripts/event-ledger.integration.test.mjs`：真实 PostgreSQL 覆盖：
  - 两个并发 append 产生连续 `seq`；
  - World Clock 产生 `WORLD_TIME_ADVANCED`，payload 含 `schemaVersion`；
  - UPDATE/DELETE event 被拒绝；
  - 跳 seq insert 与直接跳增 `world_seq` 被拒绝；
  - 同一 transaction 中第二次提交失败时，临时 world、state 与 events 全部 rollback；
  - rollback 不污染既有 world。
- 全仓 unit tests：contracts 15、world-kernel 15（World Clock 6 + validator 9）、db 1、web 3，全部通过。
- API integration：World Clock、Event Ledger、Action Request 3/3 通过。

### 本地真实验证结果

| 验证                                                                                                              | 结果                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                  | PASS                                                                                                                |
| `pnpm db:setup` 第 1 次                                                                                           | PASS                                                                                                                |
| `pnpm db:setup` 第 2 次                                                                                           | PASS                                                                                                                |
| `pnpm lint`                                                                                                       | PASS                                                                                                                |
| `pnpm typecheck`                                                                                                  | PASS                                                                                                                |
| `pnpm test`                                                                                                       | PASS                                                                                                                |
| `pnpm build`                                                                                                      | PASS                                                                                                                |
| `DATABASE_URL=postgres://mirror:mirror_dev_only@localhost:5432/mirror pnpm --filter @mirror/api test:integration` | PASS，3/3（World Clock + Event Ledger + Action Request）                                                            |
| `pnpm audit --prod --registry=https://registry.npmjs.org`                                                         | PASS，No known vulnerabilities found                                                                                |
| Docker PostgreSQL / Redis / MinIO                                                                                 | PASS，healthy                                                                                                       |
| 最终数据库状态                                                                                                    | PASS，migrations=4、users=1、worlds=1、action_requests=0、world=`PAUSED/1x`                                         |
| Event Ledger 最终行数                                                                                             | 15 条追加事件；未执行删除，world_seq=15                                                                             |
| GitHub Actions                                                                                                    | PASS，[run 34201564067](https://github.com/zl2796195822/mirror-world/actions/runs/34201564067)，foundation job 成功 |

## Definition of Done

| DoD                      | 证据                                                                      | 状态 |
| ------------------------ | ------------------------------------------------------------------------- | ---- |
| Event Ledger append-only | `world_events` schema、immutable trigger、UPDATE/DELETE integration 断言  | PASS |
| world 内单调 seq         | row lock、`world_seq`、唯一约束、并发 append 与跳序断言                   | PASS |
| state + event 原子提交   | Kernel transaction helper 与临时 world rollback integration               | PASS |
| 数据库阻止绕过写入       | event insert/world_seq trigger 与直接跳增断言                             | PASS |
| World Clock 纳入事件账本 | `WORLD_TIME_ADVANCED` 同 transaction 提交与 payload 断言                  | PASS |
| 不提前实现 M2-T05+       | 无 ActionResult、Projection、Checkpoint、Replay、Simulator 或后续领域模块 | PASS |
| 全仓质量与真实依赖验证   | lint/typecheck/test/build/db integration/audit                            | PASS |
| 远程 CI Gate             | GitHub Actions run 34201564067 对提交 57e53e1 执行并成功                  | PASS |

## 未验证与后续边界

- 真实生产部署、真实 provider、真实居民领域事实、ActionResult、Projection、Checkpoint、Replay、Simulator 与后续产品能力仍未验证/未实现。
- 事件账本 integration 使用 M0 world 追加测试事件；由于 `world_events` 是 append-only，最终本地数据库保留这些验证事件，并已恢复 world 为 `PAUSED/1x`。
- GitHub Actions 仅有既有外部 action 的 Node.js 20 deprecation warning；不影响本次 Gate 结果。
- 下一任务只记录为 M2-T05，本轮不执行 M2-T05 或任何后续任务。
