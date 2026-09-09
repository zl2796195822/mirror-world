# 01 · Current Baseline

## Formal System Snapshot (baseline `b3229aef`)

| 项 | 状态 |
| -- | ---- |
| M0 Foundation | PASS |
| M1 Product Shell + Auth + API | PASS |
| M2 World Kernel | PASS |
| M3 Life Engine | IN_PROGRESS |
| M3-T04 Rule Decision Runtime | BLOCKED_BY_PRE_ACTION_LOOP_GATE |
| PRE-AL-00 … PRE-AL-06 | PASS |
| PRE-AL-07 Scheduler / Driver | PENDING（主线正在执行，本研究不抢） |
| M4 Memory / Relationship | research only |
| M5 Agent Runtime | research only（RES-M5-001） |
| M6 Economy | research / compatibility only |
| M7 Realtime / Visual | not formal |
| M8 Persistent World | RES-M8-001 = READY_WITH_PENDING_CONTRACTS，FREEZE=ON |
| M9 Human / Proxy Identity | RES-M9-001 进行中（另一会话） |
| M10 Intelligence LOD | **本研究 RES-M10-001** |

`docs/PROJECT_STATE.md` 与 `MEMORY.md` 为准；研究文档与之冲突时，**main + 正式 ADR + verification report 优先**。

## CURRENT FACTS（可在代码/ADR/报告中直接验证）

### World Kernel / Truth

- World Kernel 是世界事实唯一写入口。
- PostgreSQL 是 durable truth；Redis 只能 cache / lease / queue（当前主线甚至尚未用 Redis 承载业务 truth）。
- Event Ledger：`world_events` append-only、world-local `world_seq`、state+event 同事务提交。
- Checkpoint：`simulation_checkpoints` 可删除重建；Replay 权威是 Event Ledger。
- World Clock：显式 wall-clock 输入推进 world time；`PAUSED/MAINTENANCE` 不推进；生产 1x 守门。

### Action / Outcome / Observation

- Action Contract：MOVE / EAT / SLEEP / WORK / TALK / BUY（`@mirror/contracts`）。
- Kernel durable outcome：`COMMITTED` / `REJECTED` / `CONFLICT`；`DUPLICATE` / `IDEMPOTENCY_CONFLICT` 是调用处置；`TIMED_OUT` 不落 Kernel outcome。
- Observation：`m3-observation-v1`，world-scoped / resident-scoped / read-only，携带 `sourceWorldSeq`。
- Life Engine 只依赖 Observation contract/port，不直接依赖 DB / SQL / Event Ledger。

### Life Engine

- CORE Needs：`HungerPressure` / `RestPressure` / `SocialPressure`；`0=satisfied`，`100=critical`。
- NeedPolicy：`m3-needs-v1`；World-Time lazy evaluation；无 timer / 高频 tick。
- Goals：`m3-goals-v1`；Needs / routine / work obligation / context → Goal candidates；Goal ≠ Action。
- Resident Seed：固定 worldId+seed 生成 30 个 NATIVE 居民（`packages/db` fixture）。
- Runtime Authority：`resident_runtime_states`；MOVE/SLEEP `STARTED → COMPLETED`（`m3-action-semantics-v1`）。
- Bounded Replan：`m3-replan-v1`；submission / conflict recovery / replan 预算分离；STOP fail-closed。

### 尚未存在（正式代码）

- PRE-AL-07 scheduler / simulation driver
- 完整 Action Loop / 30×30 autonomous simulation
- LLM / Agent Runtime 正式包
- Memory / Relationship 正式包
- Economy 正式包
- Persistent World / Offline catch-up 正式实现
- Intelligence LOD 正式实现
- Visual LOD 正式实现
- Human / Proxy 正式身份运行时

## RESEARCH INPUTS（已有研究，非正式合同）

| 来源 | 对 M10 的贡献 | 约束 |
| ---- | ------------- | ---- |
| RES-M3-001 / 002 / 003 | Action loop 顺序、canonical state、scheduler determinism | 不改 main |
| RES-M4-001 | Memory importance / salience 概念 | 不把 salience 当 World Fact |
| RES-M5-001 | Agent 边界、I-LOD 草案、Provider 抽象、成本直觉 | I0–I3 **编号冲突**需 M10 重述；成本数字为 UNVERIFIED |
| RES-M6-001 / 002 | 经济 due / resource bridge | M10 不拥有经济事实 |
| RES-M8-001 | W0/W1/W2、event-jump、S0 exact、D(t)×C、fairness、poison isolation | FREEZE=ON；与 Intelligence LOD **正交** |
| RES-M9-001 | Cognition Authority、Proxy Charter 方向 | 身份规则 **PENDING_RES_M9_001** |

## UNVERIFIED ASSUMPTIONS

以下为研究假设，**未在本基线验证**：

1. 未来存在足够低延迟的本地小模型可支撑 I1/I2 离线路径。
2. 1,000 居民 due 密度不会在「高峰时刻」把 Kernel 提交打成串行瓶颈（需 PRE-AL-07 + 实测）。
3. Structured cognition envelope 的存储成本在 10k+ 人口可接受（需分区/归档研究）。
4. 人类注意力 bonus 不会在产品层被滥用成「点谁谁变聪明」（需产品约束 + 配额）。
5. RES-M5 成本表数量级可参考，但**不得**作为真实预算承诺。
6. `meaningful activity density` 在 100k 仍主要由生活节奏而非用户互动驱动。

## PENDING CONTRACTS（登记，不在本研究关闭）

| ID | 合同 | 阻塞关系 |
| -- | ---- | -------- |
| P-M10-001 | PRE-AL-07 due ordering / driver freeze | M10 公平与调度必须对齐 |
| P-M10-002 | 完整 resident/domain replay | Replay + LOD 等价 |
| P-M10-003 | 正式 M5 Agent Runtime package | M10 不实现 provider 调用 |
| P-M10-004 | RES-M8 defer wake durability | catch-up 遇 cognition boundary |
| P-M10-005 | RES-M9 Identity / Proxy Charter | HUMAN/PROXY 预算边界 |
| P-M10-006 | M4 relationship salience ranking | promotion 信号之一 |
| P-M10-007 | M6 economic event density | promotion / due 密度 |
| P-M10-008 | Typed event payload registry | structured cognition evidence 入 ledger 或旁路 |
| P-M10-009 | Intelligence LOD 编号与 RES-M5 I-LOD 的正式统一 ADR | 避免双编号 |
| P-M10-010 | Visual LOD owner contract (M7) | 三维正交的操作化 |

## 边界纪律

- 本文件只陈述基线与输入边界。
- 任何与正式实现冲突的旧研究描述，以 main 为准。
- 不根据旧蓝图猜当前实现。
