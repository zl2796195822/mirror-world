# RES M3 002 研究结果

## 状态

`COMPLETED / RESEARCH_ONLY`

以 `origin/main@6d123bc9eb797a15a6d382d0f1e91c5c747a70aa` 为基线完成最终 M2 与 RES-M3-001 兼容性审查。没有修改正式 runtime、schema、migration、PROJECT_STATE、MEMORY；没有执行 Pre-M3 fix 或 M3-T01。

## 核心结果

1. M2 World Clock、Action Contract、validator、request persistence/idempotency/conflict、Event Ledger、world_seq、checkpoint/full+suffix replay、stable hash 和 world isolation 有实现/历史验证证据。
2. M2 没有 ActionResult。`accepted` 只是 request metadata persisted；没有 committed/rejected outcome、resulting event ids、world seq range 或 duplicate 原结果回读。
3. M2 没有 durable Observation Snapshot/query port，也没有 resident/location/resource/actor 表；validator snapshot 是调用方提供的内存输入。
4. `Resident` 不等于 `Actor`；推荐 Resident Entity → ActorRef/Capability，并分离 Auth/Digital/Resident Identity。
5. Needs 存在 4→6→7 漂移：T01 不受阻塞，T02 前必须 ADR。
6. MOVE reachable 已有，travel duration/busy/in-flight/arrival event 未定义；推荐离散 Kernel completion + 客户端表现插值。
7. Hybrid scheduler 应按 due wake/event/lazy need 驱动，不做 all residents × every second；M3 Gate 前需真实 scheduler 或等价 deterministic driver。

## Gate 决定

`READY_FOR_M3_T01`

这里只授权下一正式任务可开始，不授权本任务内执行 T01，也不表示 Action Loop ready。ActionResult、Observation、MOVE 等按 `15-pre-m3-blocking-matrix.md` 在相应边界关闭。

## 风险

- P0：0。
- P1：ActionResult/committed event feedback、Observation/query boundary、ActorRef/Action Loop 接入、MOVE/SLEEP/outcome/replan 边界。
- P2：Needs 4/6/7、Event payload schema、scheduler/heartbeat、causation_id（单步 M3 可等待，多步 cascade/M6 前必须处理）。
- P3：文档 manifest 数量/文件名差异，不影响兼容性。

## 验证边界

本任务完成只读代码/文档审查。历史 M2 报告中的 install、lint、typecheck、test、build、真实 PostgreSQL integration、CI 和 M2 replay evidence 保持原报告口径；本任务未重新安装依赖或重新运行生产验证，未把历史 evidence 升级为本轮 live rerun。
