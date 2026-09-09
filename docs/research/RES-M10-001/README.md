# RES-M10-001 · Intelligence LOD & Population Scaling v1

- 研究编号：RES-M10-001
- 研究名称：智能等级与人口规模化研究
- 研究类型：RESEARCH ONLY
- 状态：见 `00_EXECUTIVE_SUMMARY.md` 与 `RESULT.md`
- FREEZE：ON（研究提交完成后）

## 范围声明

本研究**不是**正式 M10 实现，**不是** PRE-AL-07 的一部分，**不得**修改 main、正式 schema、正式 migration、正式 ADR、PROJECT_STATE、MEMORY 或任何 M2–M9 正式代码。

本研究回答的核心问题是：

> 当镜界从 30 个居民扩展到 300 / 1,000 / 10,000 / 100,000 居民时，怎样改变「智能计算方式」，同时不改变居民身份、世界事实和历史因果？

## 基线

| 项 | 值 |
| -- | -- |
| Baseline | `b3229aef5b820fc261443c7f6d8a50f9c3b473c6` (`origin/main`) |
| Branch | `research/m10-intelligence-lod-population-scaling-v1` |
| Worktree | `/Users/alin/AI项目/mirror-world-m10-intelligence-lod-research` |

## 文档索引

| 文件 | 主题 |
| ---- | ---- |
| `00_EXECUTIVE_SUMMARY.md` | 执行摘要与推荐 |
| `01_CURRENT_BASELINE.md` | 当前 main 事实与研究输入边界 |
| `02_PROBLEM_DEFINITION.md` | 问题定义 |
| `03_INTELLIGENCE_LOD_MODEL.md` | Intelligence LOD v1 模型 |
| `04_EXECUTION_INTELLIGENCE_VISUAL_LOD_BOUNDARY.md` | 三维正交 LOD 边界 |
| `05_COGNITION_WAKE_MODEL.md` | Cognition Wake / Trigger |
| `06_COGNITION_BUDGET.md` | Cognition Budget Authority |
| `07_FAIRNESS.md` | Deterministic Fairness |
| `08_PROMOTION_DEMOTION_POLICY.md` | 升级 / 降级策略 |
| `09_POPULATION_COST_MODEL.md` | 人口成本模型（UNVERIFIED MODEL） |
| `10_SCALING_30_300_1000_10000_100000.md` | 分阶段规模演进 |
| `11_PROVIDER_DEGRADATION.md` | Provider 独立与降级 |
| `12_REPLAY_STRATEGY.md` | Replay 策略 |
| `13_REALTIME_CATCHUP_EQUIVALENCE.md` | 实时 / 追赶一致性 |
| `14_HUMAN_ATTENTION_BIAS.md` | 人类注意力偏差 |
| `15_IDENTITY_PROXY_BOUNDARY.md` | NATIVE / HUMAN / PROXY 交叉边界 |
| `16_FAILURE_MATRIX.md` | 失败与降级矩阵 |
| `17_OBSERVABILITY.md` | 可观测性指标设计 |
| `18_SECURITY.md` | 安全与滥用 |
| `19_MILESTONE_CONTRACT_MATRIX.md` | M2–M9 合同矩阵 |
| `20_FORMAL_M10_SCOPE_PROPOSAL.md` | 正式 M10 最小范围提案 |
| `21_GATE_PROPOSAL.md` | M10 Gate 提案 |
| `22_RISK_REGISTER.md` | 风险登记 |
| `23_PENDING_CONTRACTS.md` | 待定合同 |
| `24_PORT_PLAN.md` | 移植到正式主线的计划 |
| `25_SOURCES_AND_EVIDENCE.md` | 来源与证据 |
| `RESULT.md` | 研究结果与 FREEZE |

## 阅读顺序建议

1. `00` → `01` → `02`（问题与基线）
2. `03` → `04` → `05` → `06`（核心模型）
3. `07` → `08` → `09` → `10`（公平与规模）
4. `11`–`18`（失败、重放、安全）
5. `19`–`25`（合同、范围、门禁、风险）
