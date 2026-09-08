# ADR-0008 PRE-AL-01 Kernel Action Outcome

- 状态：Accepted
- 日期：2026-09-08
- 范围：PRE-AL-01

## 背景

M2 已能持久化 `ActionRequest`，也能在 World Kernel transaction 中追加
append-only `WorldEvent`，但两者之间没有正式执行反馈。Life Engine 无法区分
拒绝、版本冲突、成功提交或调用方 transport 超时，也无法查询一次请求产生的
全部权威事件。

## 决策

1. `KernelActionOutcome` 的 durable execution status 只有 `COMMITTED`、
   `REJECTED`、`CONFLICT`。`DUPLICATE`、`IDEMPOTENCY_CONFLICT` 是调用处置，
   不是执行状态；`TIMED_OUT` 不写入 Kernel outcome。
2. 每个已登记的 `ActionRequest` 最多有一个 `kernel_action_outcomes` 行。
   `(world_id, idempotency_key)` 仍由 PostgreSQL 保证幂等；相同 fingerprint
   且已有 outcome 的重试返回 `REUSED`，不同 fingerprint 返回
   `IDEMPOTENCY_CONFLICT`，不创建第二个 request 或 outcome。
3. `COMMITTED` 必须在同一个 PostgreSQL transaction 内先按 world row lock
   顺序提交一个或多个 World Events，再写 outcome 与
   `kernel_action_outcome_events` 关联；world-local sequence 连续，outcome
   保存 `eventCount` 与起止 seq。`REJECTED`/`CONFLICT` 必须为零事件且不改变
   `world_seq`。
4. 事件关联使用有序关系表而非单一 `committed_event_id`。关联表保存
   `eventIndex`、`eventId`、`eventSeq`，并由复合外键保证 request outcome、event
   与 world 相互一致，从而支持 `0 / 1 / N`。
5. 执行器异常使整个 transaction rollback；这不是 `REJECTED`、`CONFLICT` 或
   `TIMED_OUT`。调用方可在 transport/agent 层决定如何重试，Kernel 不伪造
   失败事实。

## 契约边界

`ActionRequest → Kernel Execution Outcome` 到此结束。本任务不实现
Observation/query boundary、Resident↔ActorRef、Resource Bridge、MOVE/SLEEP
duration、bounded replan、scheduler、M3-T04 或任何 M4/M5/M6 runtime。

Kernel outcome、transport outcome、agent operation outcome 保持不同类型和
责任边界；后续 bounded replan 只能消费已持久化的 Kernel outcome。

## 后果

Action outcome、world event、event links 与 world sequence 具备同事务原子性，
可按 request/world 查询并稳定回放事件引用。执行器仍通过显式 transaction
callback 提供未来领域 mutation；本任务没有伪造居民、经济或 MOVE/SLEEP 事实。

## 验证

- 契约单测覆盖 `COMMITTED` 的多事件、`REJECTED`/`CONFLICT` 的零事件和
  `TIMED_OUT` 禁止。
- PostgreSQL integration 覆盖持久化、并发重复提交只执行一次、同 world 幂等、
  跨 world 隔离、0/1/N events、版本冲突、拒绝不推进 seq，以及执行器异常回滚。
- 通过全仓 lint、typecheck、unit test、build、clean PostgreSQL integration、
  M3-T01/T02/T03 回归和官方 npm production audit 后，才可进入下一正式任务。
