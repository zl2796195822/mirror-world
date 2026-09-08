# M2-T02 Action Contract 验证报告

## 结论

当前本地验证结果为 `M2-T02 = IMPLEMENTED_UNVERIFIED`；实现与本地门禁均通过，GitHub Actions 真实验证待独立提交 push 后确认。本报告只覆盖 M2-T02，不代表 M2-T03 或 M2 里程碑完成。

## Task ID

`M2-T02`

## 文档原始目标

按《镜界 Codex 里程碑任务书》与《镜界 M0-M13 实施规格与依赖矩阵》：

- 定义 `MOVE`、`EAT`、`SLEEP`、`WORK`、`TALK`、`BUY` 等基础意图 schema；
- DoD：非法参数被 schema 拒绝。

World Kernel 规格同时规定了 ActionRequest 的请求元数据字段。本轮将其落为可复用的结构化 contract，但不执行动作。

## 实际实现

- 新增 `packages/contracts`，包名为 `@mirror/contracts`。
- 使用固定版本 `zod@4.5.4` 提供运行时 schema 与 TypeScript 推导类型。
- ActionRequest 包含 `id`、`worldId`、`actorId`、`actionType`、可选 `targetId`、`parameters`、`requestedBy`、`idempotencyKey`、可选 `expectedActorVersion`、`requestedAtWorldTime`、`traceId`。
- 六类动作参数采用最小结构约束：
  - `MOVE`: `destinationId`；
  - `EAT` / `BUY`: `itemId` 与正整数 `quantity`；
  - `SLEEP`: 空对象；
  - `WORK`: `workplaceId`；
  - `TALK`: `participantId` 与可选非空 `message`。
- 顶层字段和动作参数均拒绝未知字段；导出 `parseActionRequest` 与 `safeParseActionRequest`。
- 新增 ADR-0003，记录字段选择、结构边界和后续兼容策略。

## World Kernel authority impact

contract 只负责结构、类型、格式和基本数值边界检查。它不判断 actor、目标、地点、资源、权限、世界状态或动作是否可执行；这些仍属于后续 Kernel 校验与提交边界。没有新增绕过 Kernel 的事实写入口。

## World Clock integration

无 World Clock 写入。`requestedAtWorldTime` 是调用方提供的可序列化请求字段；本轮不生成当前时间、不调用 `Date.now()` 或 `new Date()` 作为世界事实时间，也不推进 `world_time`。

## Durable fact / Event / Transaction

- 数据库：无 schema 变化、无 migration、无 seed 变化；现有 PostgreSQL migration 数量仍为 2。
- Durable fact：无写入。
- Event：不创建、不写入、不注册事件；ActionRequest 不等于 Event。
- Transaction：无事实提交，因此没有新增 transaction 边界。
- Idempotency：仅保留并校验 `idempotencyKey`；重复请求的去重与执行语义标记为 `NOT IMPLEMENTED IN THIS TASK`，留给后续 Kernel 任务。

## API / Contract 变化

- 新增内部 `@mirror/contracts` Action Contract 包。
- 未新增 `POST /api/v1/worlds/:worldId/actions`，未修改 OpenAPI，未增加 API 副作用。
- 既有 M1 API 与 M2-T01 API 保持不变。

## 明确未实现

本轮没有实现 M2-T03 Kernel validator、ActionResult、actor/位置/资源/权限校验、幂等执行、ActionRequest 数据库表、Event Ledger、event seq、Checkpoint、Replay、Simulator、AI、Life、Memory、Relationship、Economy、3D、Digital Identity、Offline Simulation 或任何 M3+ 能力。

## 自动化测试

`packages/contracts/src/action-contract.test.ts` 共 15 项：

- 六类合法请求各 1 项；
- 未知 action type 1 项；
- 六类非法参数各 1 项；
- 非法 envelope 与未知字段 1 项；
- 纯解析且不修改输入 1 项。

## 真实验证结果

| 验证                                                          | 结果                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------ |
| `pnpm install --frozen-lockfile`                              | PASS                                                   |
| `pnpm db:setup` 第 1 次                                       | PASS                                                   |
| `pnpm db:setup` 第 2 次                                       | PASS                                                   |
| `pnpm lint`                                                   | PASS                                                   |
| `pnpm typecheck`                                              | PASS                                                   |
| `pnpm test`                                                   | PASS，contracts 15、world-kernel 6、db 1、web 3、api 6 |
| `pnpm build`                                                  | PASS                                                   |
| `DATABASE_URL=... pnpm --filter @mirror/api test:integration` | PASS，M2-T01 World Clock 真实 PostgreSQL 回归          |
| `pnpm audit --prod --registry=https://registry.npmjs.org`     | PASS，HIGH=0、CRITICAL=0                               |
| Docker PostgreSQL / Redis / MinIO                             | PASS，healthy                                          |
| 数据库恢复检查                                                | PASS，M0 world 为 `PAUSED / 1x`，seed 基线时间恢复     |
| GitHub Actions                                                | PENDING                                                |

## 依赖与许可证

新增直接 production dependency 只有 `zod@4.5.4`，许可证 MIT，已登记在 `docs/third-party/THIRD_PARTY_REGISTER.md` 并添加官方 npm source link；没有复制外部源码或资产。

## Definition of Done

| DoD                                      | 证据                                           | 状态    |
| ---------------------------------------- | ---------------------------------------------- | ------- |
| 六类基础 Action Contract 已定义          | `@mirror/contracts` discriminated union schema | PASS    |
| 非法参数被 schema 拒绝                   | 15 项契约单测                                  | PASS    |
| ActionRequest 与 Event/Fact 保持语义分离 | 无 API、DB、事件或 Kernel 提交实现             | PASS    |
| 不破坏 M1 与 M2-T01                      | 全量测试、build、World Clock integration       | PASS    |
| CI 真实执行新增测试                      | push 后等待 GitHub Actions                     | PENDING |

## 当前状态

- P0：0。
- P1：0。
- 既有 P2：文档库 manifest 文件数量/文件名不一致；GitHub Actions 外部 action Node.js 20 runtime deprecation warning。
- 下一允许任务：只记录 `M2-T03`，本轮不执行。
