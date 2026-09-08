# M2-T03 Kernel Validator 验证报告

## 结论

本地实现与真实 PostgreSQL 验证已通过；远程 GitHub Actions 尚未执行，因此当前 Gate 状态为 `M2-T03 = IMPLEMENTED_UNVERIFIED`，等待远程 CI 对本次提交复核。

本报告只覆盖 M2-T03，不代表 M2-T04、M2 里程碑或任何后续能力完成。

## 原始目标

按《镜界 Codex 里程碑任务书》与《镜界 M0-M13 实施规格与依赖矩阵》，M2-T03 要求：

- Kernel 校验 actor、位置、时间、资源、权限与 idempotency；
- 重复请求不重复生效。

ActionRequest 仍然不是 World Fact。M2-T02 schema 只证明请求形状合法；本任务由 World Kernel validator 判断领域前置条件，但不提交世界事实。

## 实际实现

- 新增 `packages/world-kernel/src/action-validator.ts`：
  - 复用 `@mirror/contracts` 的六类 ActionRequest schema；
  - 校验 actor 存在、归属 world、状态有效；
  - 校验 `requestedBy` 是否被 actor 允许；
  - 校验 World Clock 显式时间、`RUNNING` 状态与 `expectedActorVersion`；
  - 校验 MOVE 可达位置；EAT 食物、地点与库存；SLEEP 地点；WORK 工作地点与就业；TALK 对象、world 与同地点；BUY 商店、库存、价格与余额；
  - 返回稳定 Kernel reason code，不访问 wall clock、不改变输入 snapshot。
- 新增 `packages/world-kernel/src/action-request-store.ts`：
  - 以 PostgreSQL transaction 持久化已通过校验的请求元数据；
  - 用 canonical payload SHA-256 fingerprint 区分相同请求重试与同键不同 payload；
  - 相同 `(world_id, idempotency_key)` 同 payload 返回 `KERNEL_DUPLICATE_REQUEST`，不同 payload 返回 `KERNEL_CONFLICT`。
- 新增 `packages/db/src/schema.ts` 中的最小 `action_requests` 表及 migration `0002_wandering_moonstone.sql`。
- 没有新增 Action API、ActionResult、Event Ledger、event seq、事实 mutation、Replay、Checkpoint 或后续领域模块。

## World Kernel 与 durable truth 边界

- `World Clock` 是 validator 唯一允许使用的世界时间输入；没有 `Date.now()` 或 `new Date()` 作为世界当前时间来源。
- `action_requests` 是请求审计/幂等元数据，不是 position、balance、inventory、ownership 或其他世界事实。
- `worlds`、任何业务事实和未来 event ledger 均未被 action persistence 改写；真实 integration 结束后数据库恢复为 M0 seed 基线。
- Fastify、Web、Simulator、agent 和 LLM 没有新增事实写入口。

## 测试与验证

### 自动化测试

- `packages/world-kernel/src/action-validator.test.ts`：9 项，覆盖六类合法动作、schema fail-closed、actor、权限、暂停、未来世界时间、版本冲突、位置、资源、余额与纯函数不变性。
- 全仓 unit tests：contracts 15、world-kernel 15（World Clock 6 + validator 9）、db 1、web 3、api 6，全部通过。
- `apps/api/scripts/action-request.integration.test.mjs`：真实 PostgreSQL 验证：
  - 同一请求并发提交结果为一条 `accepted` 与一条 `duplicate`；
  - 同一 idempotency key 的不同 payload 返回 `KERNEL_CONFLICT`；
  - 数据库只保留一条 request row；
  - `worlds` row 在验证与持久化前后完全一致。

### 本地真实验证结果

| 验证                                                                                                              | 结果                                                                        |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                  | PASS                                                                        |
| `pnpm db:setup` 第 1 次                                                                                           | PASS                                                                        |
| `pnpm db:setup` 第 2 次                                                                                           | PASS                                                                        |
| `pnpm lint`                                                                                                       | PASS                                                                        |
| `pnpm typecheck`                                                                                                  | PASS                                                                        |
| `pnpm test`                                                                                                       | PASS                                                                        |
| `pnpm build`                                                                                                      | PASS                                                                        |
| `DATABASE_URL=postgres://mirror:mirror_dev_only@localhost:5432/mirror pnpm --filter @mirror/api test:integration` | PASS，2/2（World Clock + action request）                                   |
| `pnpm audit --prod --registry=https://registry.npmjs.org`                                                         | PASS，No known vulnerabilities found                                        |
| Docker PostgreSQL / Redis / MinIO                                                                                 | PASS，healthy                                                               |
| 最终数据库恢复                                                                                                    | PASS，migrations=3、users=1、worlds=1、action_requests=0，world=`PAUSED/1x` |
| GitHub Actions                                                                                                    | PENDING                                                                     |

## Definition of Done

| DoD                                | 证据                                                                   | 状态    |
| ---------------------------------- | ---------------------------------------------------------------------- | ------- |
| 校验 actor、位置、时间、资源、权限 | validator snapshot 规则与 9 项单测                                     | PASS    |
| 幂等请求不重复生效                 | PostgreSQL 唯一约束、并发 integration、duplicate/conflict 断言         | PASS    |
| 不绕过 World Kernel 写事实         | 仅 Kernel 导出 validator/store；无 API action route；world row 未变化  | PASS    |
| 不提前实现 M2-T04+                 | 无 Event Ledger、ActionResult、event seq、Replay、Simulator 或后续模块 | PASS    |
| 全仓质量与真实依赖验证             | lint/typecheck/test/build/db integration/audit                         | PASS    |
| 远程 CI Gate                       | GitHub Actions                                                         | PENDING |

## 未验证与后续边界

- 本地真实 provider、生产部署、真实居民领域表、事件账本、ActionResult、Replay、Simulator 仍未验证/未实现；这些不属于 M2-T03。
- GitHub Actions 必须对提交后的完整仓库重新执行；在其 PASS 前不得将本任务标记为正式 Gate PASS。
- 下一允许任务只记录为 `M2-T04`，本轮不执行。
