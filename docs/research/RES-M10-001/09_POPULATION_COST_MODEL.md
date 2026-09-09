# 09 · Population Cost Model

> **UNVERIFIED MODEL**  
> 本文件未运行真实 benchmark。所有数量级为设计目标与研究推演，不得写成实测结果或商务承诺。

## 1. 禁止的朴素模型

```text
naive_cost ≈ R × T × tick_cost
```

- `R` = residents
- `T` = wall/world minutes
- `tick_cost` = per-minute simulation+optional LLM

在 10,000 居民与 30 天尺度上不可接受（RES-M8 已用 432M ticks 量级说明）。

## 2. 目标分解模型

```text
total ≈ C_world_advance + C_kernel_commits + C_cognition + C_presentation + C_storage
```

其中：

```text
C_world_advance   ≈ f(D(t))                     # event-jump, not minutes
C_kernel_commits  ≈ D(t) × C_commit
C_cognition       ≈ Σ_layer  W_layer(t) × cost(layer)
C_presentation    ≈ O(visible_subset)           # V LOD, not population
C_storage         ≈ events + optional envelopes
```

`D(t)`：due/meaningful boundaries 密度  
`W_layer(t)`：经 Trigger + Policy + Budget + Fairness 过滤后的 cognition wakes

**关键目标**：

```text
C_cognition ≈ meaningful_activity_density × cognition_cost
```

而不是 `residents × every-minute × model_call`。

## 3. 居民分层（Execution × Cognition）

| Stratum | 描述 | 人口占比（设计） | 主导 I |
| ------- | ---- | ---------------- | ------ |
| Focus | 人类会话/关键剧情 | 极小 | I2–I3 |
| Scheduled | 有近邻 due | 波峰 | I0–I1，偶发 I2 |
| Background | 生活节奏推进 | 多数 | I0 |
| Dormant catch-up | 离线追赶 | 视 lag | I0 only |

## 4. 设计密度（非测量）

对齐 RES-M8：

```text
per resident per world-day durable events: O(10)
```

M3 当前可见动作面较窄（MOVE/SLEEP 等），未来 EAT/WORK/TALK/BUY 会抬高 `D(t)`。

### Cognition wake 目标密度（研究）

| 人口 | 人均 cognition wakes/day 设计 | I2+ 占比设计 |
| ---- | ----------------------------- | ------------ |
| 30 | 5–30（互动多） | 5–20% |
| 300 | 2–10 | 1–8% |
| 1,000 | 0.5–4 | 0.2–3% |
| 10,000 | 0.1–1 | <0.5% |
| 100,000 | ≪1（仅 meaningful subset） | 极低 |

**I0 不计入「模型成本」**，但仍计入 CPU/DB。

## 5. 五级人口成本表（UNVERIFIED MODEL）

假设（研究，可调）：

- 大多数 wake = I0，$0
- I1 本地/规则近似 $0
- I2 与 I3 使用混合费率（参考 RES-M5 的加权直觉，**非报价**）

| 人口 | 事件/day 量级 | 模型调用/day 量级设计 | 成本主导 | 风险主导 |
| ---- | ------------- | --------------------- | -------- | -------- |
| 30 | 10²–10³ | 10²–10³ | 产品正确性 | 过早优化 |
| 300 | 10³–10⁴ | 10²–10³ | due 批次与公平 | 戏剧性居民垄断 |
| 1,000 | ~10⁴ | 10³ | wake index、配额 | 高峰串行 |
| 10,000 | ~10⁵ | 10³–10⁴ | DB/分区、provider cap | 存储 envelope |
| 100,000 | ~10⁶ | 10⁴ 级（若策略不当会爆炸） | 架构分区、多世界 | 误用 per-resident LLM |

### 与 RES-M5 数字的关系

RES-M5 给出「10k 月成本可压到约 $165」的推演。  
本研究态度：

- **方向正确**（Life Engine 兜底 + LOD + wake-driven）
- **数字未验证**，不得进入产品定价或 M10 Gate 的硬成本断言
- M10 Gate 应测「调用次数/层分布/预算有界」，而不是断言美元金额

## 6. 成本应测量什么（未来 benchmark，不在本研究执行）

1. `D(t)` 与 Kernel commits/sec
2. cognition wakes by layer
3. promotion/demotion rate
4. budget utilization 与 starvation
5. catch-up lag
6. envelope storage growth
7. Zero-LLM survival：断 Provider 后世界推进率

## 7. 结论

人口规模化成立的条件不是模型降价，而是：

1. 绝大多数时刻 I0
2. 升级只发生在 meaningful boundaries
3. 预算与公平防止少数居民吸干
4. 成本随 **有意义活动** 近似线性，而不是随人口×时间近似线性
