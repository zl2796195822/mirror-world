# PREREQUISITES

## 1. P0（正式 M4 开工前应满足）

- M3 Milestone Gate = PASS（含 bounded replan / scheduler-driver / 30×30 readiness 链路关闭）
- 30 NATIVE resident IDs / homes / profiles 稳定
- Resident runtime location/activity authority 稳定（已具备，需随 M3 保持）
- World Time + Event Ledger invariants 稳定
- ActionRequest/Outcome 0/1/N 不变量稳定
- Decision Observation boundary 保持不被破坏

## 2. P1 architecture risks（开工前应裁决，不必等 M5/M6/M7）

- 事件 perception envelope：location/participants 如何稳定获取
  - 当前 `world_events.location_id` 缺失
  - 至少要有 typed payload contract 或未来列
- Memory/Relationship 不得依赖 3D
- LLM zero-fact boundary 书面确认

## 3. 非前置

- M5 Agent Runtime
- M6 Economy 完整实现
- M7 3D

M4 应能相对独立开始（在 M3 PASS 与事件可解析前提下）。

## 4. PRE-AL 状态

- PRE-AL-06 = PENDING_PRE_AL_06（本研究时点）
- 本研究不膨胀 PRE-AL-06 范围
