# 00 Executive Summary

## Status

`READY_WITH_PENDING_CONTRACTS` · `RECONCILIATION_COMPLETE_WITH_PENDING_FORMAL_DEPENDENCIES` · `FREEZE = ON`

四份冻结研究的共同骨架是对齐的：PostgreSQL/Event Ledger/Kernel 是事实边界；Projection、Realtime、Queue、Digest、Avatar、Memory 与 Cognition 不能成为第二真相；LLM 只产生受限意图或叙述；Replay 不重新联网调用 LLM；身份、执行、认知、视觉是不同维度。

未能直接合并的重点有五类：

1. M5 的 `I0=dormant`、`I1=rule` 与 M10 的 `I0=rule-only`、`I1=light` 不只是编号差异，而是把 Execution/Dormancy 混入 Intelligence 的架构冲突。
2. M8/M10 的冻结文本把 wake ordering、defer durability 与 driver 标为 `PENDING_PRE_AL_07`；当前 `origin/main@2e526d3`（含 `a3581a5` 的正式实现及后续 docs-only 同步）已通过 PRE-AL-07 正式 ADR/verification 关闭 M3 v1 的 deterministic driver、due completion、deferred wake projection 与稳定排序，但 lease/fence、完整 replay 与 full 30×30 仍未关闭。
3. M9 的正交身份模型与旧蓝图/M10 的 `HUMAN/PROXY/NATIVE` 类型叙述不能同时作为 authority；Proxy 不是 Resident Origin，但 M10 仍保留旧词汇。
4. M7 的 snapshot/afterSeq 解决网络投影连续性，M8 的 freshness/target/catch-up 解决世界连续性；两者的 seq 语义相关但未形成正式跨层合同。
5. M8 的“无 LLM 连续性”与 M10 的“catch-up 可遇到 cognition boundary”可以兼容，前提是已发生高级 cognition 只重放 frozen envelope，未发生 boundary 不因离线而新调模型；这个前提仍需正式契约。

## Findings count

本包登记 20 项 cross-research findings：C0=2、C1=3、C2=7、C3=4、C4=2、C5=2。它们不是 20 个必须立刻修复的 bug，而是未来 Compatibility Review 需要重新确认的冲突、语义重叠或 ownership 风险。

## Highest-risk result

当前最危险的组合不是单个模块越权，而是三轴、多个 wake consumer 和身份/认知来源在跨模块接入时被压成一个字段或一个 scheduler。当前 main 已给出 `Scheduler = WHEN / Life Engine = WHAT / Kernel = CAN·COMMIT` 的正式 M3 v1 边界；未来仍必须冻结 W/I/V namespace、Proxy control/audit boundary、snapshot/freshness semantics，再进入正式 port。

## 未来评审入口

`32_FUTURE_COMPATIBILITY_REVIEW_INPUT.md` 是最小入口；它要求基于当时最新 main 重跑事实审计，逐项确认本包的 `PENDING_PRE_AL_07`、`PENDING_M3`、`PENDING_FORMAL_CONTRACT` 与 `ADR_CANDIDATE`，而不是直接实现本包的 recommendation。
