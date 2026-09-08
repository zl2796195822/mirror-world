## 明确结论

| 问题             | 当前结论                                                                               |
| ---------------- | -------------------------------------------------------------------------------------- |
| ACCEPTED         | 只能知道 request row 已持久化，不能知道 action accepted/executed                       |
| REJECTED         | validator 纯函数返回稳定 reason code，但无统一执行结果或 durable rejection             |
| CONFLICT         | idempotency key/fingerprint conflict 可识别；不是完整 actor-version execution conflict |
| DUPLICATE        | 可返回 duplicate 和原 requestId；无原 action outcome                                   |
| resulting events | 无法关联；没有 status、event id、seq、result payload 或 request FK                     |
| reason           | KernelReasonCode 稳定且机器可判；未持久化、无 retryable 分类                           |
| retry            | 只能知道 duplicate，不能得到原结果                                                     |

代码证据：`action-request-store.ts:9-18,48-110` 的 union/insert/query；`packages/db/src/schema.ts:56-99` 的表字段；`world-events-store.ts:91-147` 的独立 event transaction；`action-request.integration.test.mjs:74-137` 只验证 row、duplicate/conflict 和 world 不变。正式 World Kernel §6 虽定义 ActionResult，代码和 M2-T05 ADR 明确尚未实现。

## 状态不能混用

```text
request persisted   = action_requests row 已落库
validation rejected = 纯 validator 拒绝，未落库事实
execution conflict  = 执行时 actor/world 版本冲突
event committed     = state + event 在 Kernel transaction 中提交
```

HTTP 200、persistence accepted、队列入队或 correlation id 都不能证明 event committed。

## Blocker 判断

### `BLOCKS_M3_T01 = NO`

正式 T01 只生成固定 seed 的 30 个居民、住处、工作/失业、性格、财富 fixture 并做 snapshot/distribution test，不提交 ActionRequest。它可以在纯函数/fixture adapter 边界内完成，不能把 fixture 当生产事实。

### `BLOCKS_M3_ACTION_LOOP = YES`

真实 loop 必须是：`read observation → create request → submit → outcome → committed event/new observation 或 bounded replan`。没有 outcome，Life 无法知道 MOVE 是否到达、BUY 是否扣款、SLEEP 是否完成，亦无法处理 timeout 的 uncertain state。`MIRROR-FIND-001` 是 Action Loop 的 P1 blocker，不是 T01 blocker。

## 最小未来语义（本任务不实现）

`PENDING`、`COMMITTED`（worldSeq/eventIds）、`REJECTED`（reason/retryability）、`CONFLICT`、`DUPLICATE`（完整原 outcome）、`UNKNOWN`（只能 query 原 request）。`PERSISTED` 可以是内部状态，但不能向 Life Engine 暴露为动作成功。
