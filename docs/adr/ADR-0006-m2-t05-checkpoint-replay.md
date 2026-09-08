# ADR-0006 M2-T05 Checkpoint / Replay

- 状态：Accepted
- 日期：2026-09-08
- 范围：M2-T05

## 背景

M2-T04 已建立 PostgreSQL Event Ledger。M2-T05 需要在不改变历史事件、不给世界事实增加第二真相的前提下，按 `world_seq` 保存可重建 checkpoint，并从固定 seed 与有序事件历史得到确定的 replay 结果。

## 决策

1. 新增 `simulation_checkpoints` 作为恢复与加速数据；PostgreSQL `worlds`、`world_events` 与事件序列仍是 authoritative truth。删除 checkpoint 后必须仍可从 seed + event history 重建。
2. Replay schema v1 保存 `worldId`、seed、world time、已应用的 `world_seq` 与 history digest。summary hash 使用稳定 canonical representation 的 SHA-256，不依赖 UUID、`created_at`、当前时间、随机数、LLM、UI 或 Redis。
3. Replay 只按 `seq` 连续应用 world-scoped、schema-versioned events；`WORLD_TIME_ADVANCED` 严格校验时间链路和 `occurred_at`。当前尚无居民等领域事实，因此现有非时间领域事件只做结构化 no-op，同时仍进入 history digest；未来新增领域事件必须先增加兼容的 replay handler。
4. Checkpoint 必须匹配 world、schema、sequence、snapshot 和 checksum。数据库 trigger 拒绝指向未来序号或不存在事件的 checkpoint；Kernel store 在 PostgreSQL transaction 中锁定 world，并将同位置同 checksum 视为 duplicate、不同 checksum 视为 conflict。
5. M2-T05 不新增 API、ActionResult、Projection、Simulator 或重新执行 ActionRequest；Replay 是事实重建，不是实时决策或请求执行。

## 不在本 ADR 范围内

居民、地点、Needs、Goal、Memory、Relationship、Economy、AI、3D、Digital Identity、Offline Simulation、Projection、ActionResult、Simulator、M3 及后续任务均不属于本决策。

## 后果

checkpoint 可以被删除并重新生成，不会成为第二套世界真相。事件不可变、world-local `seq` 和事件 schema version 继续由 M2-T04 约束。当前 replay 结果足以验证时钟与事件历史的确定性，但不宣称未实现领域事实已经可重建。

## 验证计划

- 单测验证稳定 hash、连续序列、world mismatch、checkpoint checksum 与损坏 checkpoint 拒绝。
- 真实 PostgreSQL 验证 full replay、checkpoint suffix replay、duplicate/conflict、未来序号拒绝与 M2 全部 integration 顺序回归。
- clean database 两次 `db:setup`、全仓质量门禁、官方 production audit 与 GitHub Actions 验证。
