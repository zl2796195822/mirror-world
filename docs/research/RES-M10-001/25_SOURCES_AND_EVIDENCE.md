# 25 · Sources and Evidence

## 正式主线（baseline `b3229aef`）

- `docs/PROJECT_STATE.md`
- `MEMORY.md`
- `docs/adr/ADR-0002` … `ADR-0010`（Clock、Action、Idempotency、Ledger、Checkpoint、Needs、Outcome、Semantics、Replan）
- `docs/verification/M2-*`、`M3-*`、`PRE-AL-*`
- `packages/contracts/src/*`（action/outcome/observation/replan/runtime/bridge）
- `packages/life-engine/src/*`（needs/goals/replan/observation）
- `packages/world-kernel/src/*`
- `packages/db/src/*`（resident seed/runtime）

## 已有研究（只读输入，非正式合同）

| 研究 | 路径 | 用于本研究 |
| ---- | ---- | ---------- |
| RES-M3-001 | `/Users/alin/AI项目/mirror-world-life-research/...` | Life 接入顺序 |
| RES-M3-002 | 主仓及 compat worktrees | fixture/observation |
| RES-M3-003 | `/Users/alin/AI项目/mirror-world-m3-full-replay-30x30-gate/...` | scheduler determinism、FOR_PRE_AL_07 |
| RES-M4-001 | `/Users/alin/AI项目/mirror-world-m4-research/...` | salience 概念 |
| RES-M5-001 | `/Users/alin/AI项目/mirror-world-m5-agent-research/...` | Agent 边界、I-LOD 草案、Provider、成本直觉 |
| RES-M6-001/002 | economy research/compat | 经济边界 |
| RES-M8-001 | `/Users/alin/AI项目/mirror-world-m8-persistent-world-research/...` | W LOD、event-jump、fairness、S0、D(t)×C |
| RES-M9-001 | `/Users/alin/AI项目/mirror-world-m9-digital-identity-proxy-v1/...` | Cognition Authority、Proxy |

## 关键引用（摘要）

### RES-M8

- “World Execution LOD is not Visual LOD and not Intelligence LOD.”
- “Persistent ≠ Always Computing”
- `cost ≈ D(t) × C + index_maintenance`
- S0 exact only
- FREEZE = ON

### RES-M5

- Resident ≠ Agent Runtime ≠ LLM Session
- Zero Fact Authority
- I-LOD 草案（编号与 M10 冲突，已登记）
- Provider 抽象与 No-LLM degradation

### RES-M9

- CognitionSource 枚举
- 无 cognition 时 Resident 仍存在

## 证据等级

| 类型 | 本研究使用方式 |
| ---- | -------------- |
| main 代码/ADR | CURRENT FACTS |
| 已完成 verification | CURRENT FACTS |
| 兄弟 research package | RESEARCH INPUTS |
| 数学推演/设计密度 | UNVERIFIED MODEL |
| 未来 Gate | PROPOSAL |

## 未使用

- 未读取未合并的 main 未提交改动作为事实
- 未把任何 sibling research 的 FREEZE 文档静默修改
