# RES M3 002 决策

## 最终决定

`READY_FOR_M3_T01`

## 理由

正式 `M3-T01` 原始名称是 **居民 seed generator**。任务要求固定 seed 生成 30 个居民、住处、工作/失业分布、性格、财富，并通过 fixture snapshot/distribution test 验证稳定性；它不是 Needs、Action Loop 或 Kernel execution。

T01 可以在纯 fixture/纯函数边界开始，前提是：

- 不创建 migration 或正式居民表；
- 不把 fixture snapshot 宣称为 durable resident fact；
- 冻结 `residentId/worldId/identityKind/actorRef` 关系；
- 不提交 ActionRequest，不伪造 ActionResult，不进入 T02+。

## 不能被此决定掩盖的阻塞

- ActionResult/committed event feedback 不阻塞 T01，但阻塞真实 Life Engine Action Loop 和 M3 Gate。
- Observation Snapshot 不阻塞 T01，但 Action Loop 前必须存在。
- MOVE/SLEEP semantics、bounded replan、scheduler/heartbeat、event payload schema 不阻塞 T01，但须在 Action Loop/Gate 前按矩阵关闭。
- Needs 4/6/7 不阻塞 T01；T02 开始前必须通过 ADR。

## 正式下一任务

`M3-T01 居民 seed generator`。本审查不执行该任务。需要修复 M2 的 ActionResult、Observation、scheduler 或 schema 时，应另开明确主线任务；本研究分支不实施。

## 保持原则

PostgreSQL 是 durable truth；World Kernel 是唯一事实写入口；`ActionRequest != Event`；LLM 不能直接改事实；Replay 不重新执行 ActionRequest；Auth Identity、Digital Identity、Resident Identity、Actor Capability 不合并。
