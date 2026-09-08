# ADR-0005 M2-T04 Event Ledger

- 状态：Accepted
- 日期：2026-09-08
- 范围：M2-T04

## 背景

M2-T04 要求建立可追溯的 World Event Ledger：事件必须按 world 内单调序号追加，世界状态与事件必须在同一个 PostgreSQL transaction 中提交，且数据库必须阻止修改、删除与跳序。M2-T03 已经提供请求校验与幂等 metadata，但没有提交世界事实或事件。

## 决策

1. 在 PostgreSQL 中新增 `world_events` 与 `worlds.world_seq`。`(world_id, seq)` 唯一约束保证同一世界内序号唯一，`world_seq` 使用 bigint。
2. 由 `@mirror/world-kernel` 的 `commitWorldStateWithEventInTransaction` 取得 world row lock，计算下一个 seq，先追加事件，再更新 world state；调用方通过外层 transaction 获得状态与事件的原子性。
3. World Clock 的 world time 实际推进改由同一个 Kernel transaction 追加 `WORLD_TIME_ADVANCED`，事件 `occurred_at` 使用推进后的 world time，不使用 wall clock 代替世界时间。
4. PostgreSQL trigger 拒绝 `world_events` 的 UPDATE/DELETE，要求 event insert 使用当前 `world_seq + 1`，要求 `world_seq` 每次只能递增 1 且必须存在对应 event，并用 deferred constraint trigger 在 transaction 结束时校验 `world_seq = max(event.seq)`。
5. 事件 payload 要求包含正整数 `schemaVersion`；事件类型由 Kernel 的 `WORLD_EVENT_TYPES` registry 约束在源码入口内。M2-T04 不实现 ActionResult、Projection、Checkpoint、Replay 或领域事实模块。

## 不在本 ADR 范围内

Action API、ActionResult、Projection、Checkpoint、Replay、Simulator、居民/地点/库存/经济事实、Life、Memory、Relationship、AI、3D、Digital Identity、Offline Simulation 及 M2-T05/M3+ 任务均不属于本决策。

## 后果

所有已实现的世界时间事实变化现在都有可追溯的 event row 与 world-local seq，并且状态与事件不能被应用层拆成两个提交。数据库层的 append-only 与 sequence consistency 约束可防止绕过 Kernel 的直接写入破坏账本。未来领域 mutation 仍必须复用同一 transaction helper；本任务不把缺失领域事实伪装成已完成。

## 验证计划

- 真实 PostgreSQL 并发追加验证连续 seq。
- 验证 `WORLD_TIME_ADVANCED`、UPDATE/DELETE 拒绝、跳 seq 拒绝与 world_seq 直接跳增拒绝。
- 在同一 transaction 内故意制造第二次提交失败，确认新 world、state 与 event 全部回滚。
- 运行全仓 lint、typecheck、unit test、build、数据库 setup、API integration 与 production dependency audit。
