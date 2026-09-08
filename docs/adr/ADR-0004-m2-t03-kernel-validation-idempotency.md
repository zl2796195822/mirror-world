# ADR-0004 M2-T03 Kernel Validation and Idempotency

- 状态：Accepted
- 日期：2026-09-08
- 范围：M2-T03

## 背景

M2-T03 要求 Kernel 校验 actor、位置、时间、资源、权限与幂等，并保证重复请求不重复生效。当前仓库还没有居民、地点、库存、工作或经济事实表，因此本任务不能把缺失的领域模型伪装成已完成的持久化事实层。

## 决策

1. 在 `@mirror/world-kernel` 中新增纯 `validateActionRequest`。它复用 M2-T02 Action Contract，然后使用调用方显式提供的只读 World、actor、location 与 item snapshot，按固定顺序执行身份、权限、World Clock、版本、位置、资源和动作前置条件校验。
2. World Clock 时间由 context 显式注入；validator 不调用 `Date.now()`、`new Date()` 获取世界当前时间，也不推进 `worlds.world_time`。
3. 新增最小 `action_requests` 表，只保存通过校验的请求元数据、完整 payload 与 SHA-256 fingerprint。`(world_id, idempotency_key)` 由 PostgreSQL 唯一约束保护。
4. 相同 world 与 idempotency key 且 fingerprint 相同的重试返回 `KERNEL_DUPLICATE_REQUEST`；fingerprint 不同返回 `KERNEL_CONFLICT`。插入与冲突读取在同一个 PostgreSQL transaction 内完成，并发只保留一行。
5. M2-T03 不提交世界事实、不创建 ActionResult、Event Ledger、event seq、ledger、Checkpoint、Replay 或 Action API。

## 不在本 ADR 范围内

居民/地点/库存/经济 schema、事实 mutation、事件发布、API route、Simulator、AI、Life、Memory、Relationship、Economy、3D、Digital Identity、Offline Simulation 及 M2-T04 以后任务均不属于本决策。

## 后果

本任务建立了可测试的 Kernel domain validation 与持久幂等边界，同时保留了未来事实提交所需的唯一入口。由于领域事实表尚未建立，validator 的 snapshot 输入是显式依赖，不被误认为 durable truth，也不能单独证明真实动作已发生。

## 验证计划

- 六类 ActionRequest 的合法与非法领域条件均有纯单测。
- 真实 PostgreSQL 验证唯一约束、同请求并发、同键不同 payload 冲突，以及 world row 不被改变。
- 运行全仓 lint、typecheck、unit test、build、数据库 setup、API integration 与 production dependency audit。
