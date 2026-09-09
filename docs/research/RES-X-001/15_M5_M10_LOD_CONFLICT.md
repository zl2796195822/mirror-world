# 15 M5 × M10 Intelligence LOD Conflict

## Result

`CONFLICT / C3`（`X-C004`）。冲突不是单纯编号不同：M5 把 dormant/确定性生命基线放进 Intelligence LOD，M10 把执行、认知和视觉明确拆成三轴。

## Level-by-level comparison

| Level | RES-M5-001 semantic                                                      | RES-M10-001 semantic                     | Conflict type                                                   | Migration implication                                             |
| ----- | ------------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| I0    | `DORMANT / DETERMINISTIC ONLY`；睡眠、离线静止、视口外；Life Engine 基线 | `RULE_ONLY`；不调用 LLM 的确定性规则路径 | M5 混入 `World Execution/Dormancy`；M10 是 cognition capability | 旧 I0 数据不能直接成为 M10 I0，必须补充 execution/dormancy 维度。 |
| I1    | `RULE-HEURISTIC & CACHED`；行为树、效用矩阵、缓存计划                    | `LIGHT_COGNITION`；轻量认知层            | 语义实质冲突，非名称差异                                        | 旧 I1 可能应映射为 M10 I0 或规则层，不得自动保留为 I1。           |
| I2    | `LIGHT MODEL / OCCASIONAL`；SLM/轻量模型                                 | `STRUCTURED_COGNITION`                   | 大体相近但触发、预算和 envelope 仍不同                          | 需要 provider、预算和 envelope 迁移说明。                         |
| I3    | `FULL MODEL COGNITIVE DEPTH`                                             | `HIGH_VALUE_REASONING`                   | 方向相近；M10 增加 quota/fairness/degradation 约束              | 需要保留历史 envelope，而不是重新调用 Provider。                  |

## Required separation

`W0/W1/W2` 说明世界如何执行，`I0/I1/I2/I3` 说明是否及如何产生 cognition，`V0…Vn` 说明如何呈现。`dormant`、`invisible`、`rule-only` 不能再共用一个字段。

## Recommendation

登记 `ADR_CANDIDATE_LOD_NAMESPACE_SEPARATION`（`ADR-X-001`）。未来正式合同应定义 namespace、旧值兼容期、W/I/V 合法组合、W2 的 I1 解释及历史决策的 envelope 版本；本研究不修改 M5 或 M10。
