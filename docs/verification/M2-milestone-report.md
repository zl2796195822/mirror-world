# M2 World Kernel Milestone Gate 验证报告

## 结论

`M2 = PASS`。

M2-T01～M2-T05 已全部通过单任务 Gate。本次 Milestone Gate 只做架构审计、真实验证和 Gate 阻塞缺陷修复，没有执行 M3、Life、Memory、Relationship、Economy、AI、3D、Digital Identity 或 Offline Simulation。

Gate 修复提交：`7f5377f37d441c9989dd94ce2f6d97f30980603d`。

## 验收范围

本 Gate 复核以下连续链路：

`World Clock → Action Contract → Kernel Validator / Idempotency → Event Ledger → Checkpoint / Replay`

验收重点是 PostgreSQL durable truth、World Kernel 唯一事实写入口、world-local sequence、transaction 原子性、幂等边界、world isolation 与 deterministic replay。M2 不要求把居民、需求、关系、经济或 AI 行为提前实现为假事实。

## 单任务状态

| 任务                                  | 结果 | 关键证据                                                                   |
| ------------------------------------- | ---- | -------------------------------------------------------------------------- |
| M2-T01 World Clock                    | PASS | durable `world_time` / `clock_anchor_at`、pause/scale、生产 1x、回拨不倒退 |
| M2-T02 Action Contract                | PASS | 六类 ActionRequest 的 Zod schema、未知字段与非法参数拒绝                   |
| M2-T03 Kernel Validator / Idempotency | PASS | snapshot 前置条件、PostgreSQL 唯一键、duplicate/conflict 与并发验证        |
| M2-T04 Event Ledger                   | PASS | append-only `world_events`、world-local `world_seq`、state+event 同事务    |
| M2-T05 Checkpoint / Replay            | PASS | fixed seed、ordered replay、checkpoint suffix、hash、损坏输入 fail closed  |

对应报告：`docs/verification/M2-T01-report.md` 至 `docs/verification/M2-T05-report.md`。

## Authority 审计

- PostgreSQL 的 `worlds`、`world_events`、`world_seq`、`action_requests` 和 `simulation_checkpoints` 是当前持久化边界；checkpoint 只是可删除、可重建的恢复/加速数据，不是第二真相。
- World Kernel 是世界事实写入口。API 的时钟控制通过 Kernel store；state+event 组合提交通过 Kernel transaction helper；没有发现 API、Redis、LLM 或 Web 绕过 Kernel 写 durable world fact。
- ActionRequest 是受约束的请求 metadata，不等于已执行事实；Replay 只重建 authoritative event history，不重新执行 ActionRequest。
- Redis 只保留基础设施职责，没有承载世界事实、事件账本或 replay truth。
- seed、fixture 和 integration SQL 的写入均属于测试/初始化边界，不构成生产业务写入口。

## Gate 阻塞缺陷及修复

审计发现 World Clock control 在 wall-clock rollback 后会把 `clockAnchorAt` 写回较早时间，可能造成下一次恢复重复计算时间。修复为保留已同步的 durable anchor，并新增回拨控制测试。

同时补齐了 Gate 所需的 fail-closed 证据：

- checkpoint 的错误 world、错误 schema、损坏 snapshot 会被拒绝；
- 同一 checkpoint suffix 的重复 replay 保持相同 summary hash；
- 两个 world 的 checkpoint 查询与 replay 互不串扰；
- 错误 world 的 checkpoint 不能被另一个 world 使用。

修复和新增测试均位于 Gate 修复提交，没有扩大领域实现范围。

## 核心不变量验证

| 不变量                                      | 证据                                                                 | 结果 |
| ------------------------------------------- | -------------------------------------------------------------------- | ---- |
| PostgreSQL 是 durable truth                 | clean DB、schema、migration、最终计数与 Event Ledger 查询            | PASS |
| World Kernel 是唯一事实写入口               | source call-site audit、Kernel transaction store、API 无绕过写入     | PASS |
| world time 不因 wall-clock 回拨倒退         | clock unit/integration 与 Gate rollback test                         | PASS |
| paused/maintenance 不产生 world tick        | World Clock integration                                              | PASS |
| 生产只允许有效 1x                           | production clock guard/integration                                   | PASS |
| Action 结构先于执行                         | Zod contract 与未知字段/非法参数测试                                 | PASS |
| actor/权限/时间/版本/前置条件在 Kernel 校验 | validator snapshot tests 与 integration                              | PASS |
| 幂等键不重复保留请求                        | `(world_id, idempotency_key)` 唯一约束、duplicate/conflict、并发测试 | PASS |
| state 与 event 同事务                       | rollback integration，失败时两者均回滚                               | PASS |
| Event Ledger append-only                    | UPDATE/DELETE trigger 与 integration                                 | PASS |
| world-local seq 单调且无跳号                | row lock、唯一约束、sequence trigger、并发测试                       | PASS |
| checkpoint 不替代事件账本                   | Event Ledger 未被修改，checkpoint 可删除重建                         | PASS |
| replay 不执行 ActionRequest                 | replay source audit 与 integration                                   | PASS |
| 相同输入得到相同 replay hash                | canonical SHA-256、full/suffix hash equality                         | PASS |
| world isolation                             | world-scoped store、错误 world 拒绝、A/B integration                 | PASS |

## 真实验证

| 验证项                             | 结果                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`   | PASS                                                                                                    |
| `pnpm db:setup` 第一次             | PASS                                                                                                    |
| 同一数据库 `pnpm db:setup` 第二次  | PASS                                                                                                    |
| `pnpm lint`                        | PASS                                                                                                    |
| `pnpm typecheck`                   | PASS                                                                                                    |
| `pnpm test`                        | PASS；world-kernel 25、contracts 15、db 1、web 3，API contract tests 6                                  |
| `pnpm build`                       | PASS                                                                                                    |
| clean PostgreSQL 上 M2 integration | PASS；World Clock、Event Ledger、Replay/Checkpoint、Action Request 4/4                                  |
| 官方 npm production audit          | PASS；No known vulnerabilities found                                                                    |
| Docker PostgreSQL / Redis / MinIO  | PASS；healthy                                                                                           |
| API live regression                | PASS；`/api/v1/health`、`/api/v1/ready`、`/api/v1/worlds`、`/openapi.json` 均返回 200                   |
| Web regression                     | PASS；开发登录后 `/`、`/world`、`/residents`、`/events`、`/settings` 均可访问，空状态诚实且无假世界事实 |

最终主库状态保持为：5 个 migration、1 user、1 world、0 action request、20 条既有 append-only events、`world_seq=20`、0 checkpoint，world=`PAUSED/1x`。本 Gate 没有删除历史 events，也没有把临时验证数据升级为产品事实。

## OSS 研究对照

对 `RES-M2-OSS-001` 的研究材料与 `MIRROR-FIND-001`～`004` 进行了对照：

- 事件账本、确定性 replay、checkpoint 可重建的方向与成熟 event-sourced / deterministic simulation 实践一致；本仓只吸收边界与验证原则，没有复制外部实现。
- 异步 agent 与 deterministic world 必须分层：agent/LLM 只能生成 request、intent 或 candidate，World Kernel 才能验证并提交事实；当前 M2 没有引入 LLM 写入路径。
- tick/event 模型要求显式 world time、world-local 顺序和可重放历史；当前 `WORLD_TIME_ADVANCED` 已在 state+event 同一事务中落账。
- 本轮没有新增外部生产依赖，也没有把未核验许可证的项目复制进主仓；第三方登记和官方 audit 保持通过。

研究形成的后续边界：

| 编号              | 分级 | 处理要求                                                                               |
| ----------------- | ---- | -------------------------------------------------------------------------------------- |
| `MIRROR-FIND-001` | P1   | Action execution result / committed event feedback；标记为 `PRE-M3 REQUIRED FOLLOW-UP` |
| `MIRROR-FIND-002` | P2   | `causation_id`；M3/M6 前处理                                                           |
| `MIRROR-FIND-003` | P2   | 细粒度、版本化 Event payload schema；具体领域事件落地前处理                            |
| `MIRROR-FIND-004` | P2   | scheduler / heartbeat 边界；M3 前处理                                                  |

## M3 compatibility preliminary review

这是兼容性预审，不是 M3 实现或 M3 验收。

当前 M2 已为后续实现提供：

- PostgreSQL durable world/event truth；
- Kernel-only state mutation boundary；
- world-local sequence 与 append-only history；
- versioned payload/checkpoint 与 deterministic replay；
- request metadata 与重复请求的 conflict 语义。

进入 M3 前必须先处理 `MIRROR-FIND-001`，使调用方能获得明确的 accepted / rejected / committed event feedback；同时按领域事件落地顺序处理 causation、payload schema 与 scheduler/heartbeat。M2 Gate 不把这些未完成项伪装成已实现能力。

本报告不授权或执行 M3、Life、Memory、Relationship、Economy、AI、3D、Digital Identity、Offline Simulation、Projection、Simulator 或真实生产部署。

## 风险分级

- P0：0。
- P1：1 项预先记录的 M3 必要跟进（`MIRROR-FIND-001`），不阻塞 M2 的 World Kernel 基础 Gate。
- P2：`MIRROR-FIND-002`～`004` 以及 GitHub Actions 外部 action 的 Node.js 20 runtime deprecation warning；均未被误报为当前 M2 失败。
- P3：文档库 `manifest_v1.2.json` 的文件数量/文件名不一致。
- 真实 provider、居民领域事实、生产部署、M3 及后续产品能力：未验证，且不属于本 Gate 的完成声明。

## Definition of Done

| Gate 条件                                                                    | 结果 |
| ---------------------------------------------------------------------------- | ---- |
| M2-T01～T05 全部单任务 PASS                                                  | PASS |
| authority、transaction、idempotency、sequence、isolation、determinism 有证据 | PASS |
| clean DB 与完整 M2 integration 真实通过                                      | PASS |
| API/Web 回归通过且无伪造事实                                                 | PASS |
| dependency/security audit 通过                                               | PASS |
| P0=0，且 P1 已明确列为 M3 前跟进                                             | PASS |
| 研究结论与许可证/复用边界已记录                                              | PASS |
| 不执行 M3 或任何后续领域能力                                                 | PASS |

## 状态与下一步

当前状态：`M2 = PASS`。

下一允许步骤仅记录 `RES-M3-002`；本轮不执行 M3。
