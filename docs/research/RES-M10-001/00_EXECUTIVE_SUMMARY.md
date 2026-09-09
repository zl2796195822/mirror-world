# 00 · Executive Summary

## Status

```text
RES-M10-001 = READY_WITH_PENDING_CONTRACTS
FREEZE = ON
```

本状态表示：Intelligence LOD v1 理论模型、预算权威、公平性、人口分层、Provider 降级、Replay 与 Gate 提案已形成完整研究结论；但若干与 PRE-AL-07 / 正式 M5 / M9 的合同仍处 PENDING，不得将本研究直接 cherry-pick 进 main 或提前实现 M10。

## 一句话结论

镜界人口规模化的核心不是「怎么省 Token」，而是：

> 用 **Intelligence LOD** 控制「何时值得思考、思考多深」，用 **World Execution LOD** 控制「世界切片如何推进」，用 **Visual LOD** 控制「怎么画」；三者正交。  
> 居民身份、World Kernel authority、资源守恒、Event Ledger 与历史因果**永不随 LOD 改变**。  
> 成本应逼近 `meaningful_wake_density × cognition_cost_by_layer`，而不是 `residents × every-minute × model_call`。

## 推荐 Intelligence LOD（M10 v1 命名）

与 RES-M5-001 的 I-LOD 编号**有意不同**：M5 曾把「休眠」放进 I0，混淆了 Execution LOD。M10 v1 将 Intelligence 从「规则基线」开始编号：

| Level | Name | 模型 | Zero-LLM | 说明 |
| ----- | ---- | ---- | -------- | ---- |
| **I0** | `RULE_ONLY` | 无 LLM | 必须成立 | Needs / Goals / Routine / Work / Replan 规则推进 |
| **I1** | `LIGHT_COGNITION` | 无 LLM 或本地小模型 | 可成立 | 有限结构化决策 / bounded planner / heuristic |
| **I2** | `STRUCTURED_COGNITION` | 受限 Provider/本地模型 | 可降级 | 复杂 Intent / 社交 / 计划，严格 schema 输出 |
| **I3** | `HIGH_VALUE_REASONING` | 昂贵模型（稀有） | 可降级 | 重大关系转折、长期目标改变、关键人类互动等 |

**关键不变量**：任意 I 层最终只能形成  
`Observation → Candidate/Intent → ActionRequest → Kernel → Outcome`。  
I3 可以做的事，必须在 Kernel 规则下合法；I0 违反世界规则的路径，I3 同样不可用。

## 三维正交（禁止全局 LOD）

| 维度 | 值 | 谁决定 | 关心什么 |
| ---- | -- | ------ | -------- |
| World Execution LOD | W0 / W1 / W2 | M8 / Driver | 该切片如何模拟 |
| Intelligence LOD | I0–I3 | M10 Cognition Policy | 该居民此次 wake 的认知深度 |
| Visual LOD | V? | M7 | 如何渲染 / 呈现 |

合法组合示例：

- `W1 + I0 + V0`：后台居民规则推进，无渲染
- `W0 + I3 + V2`：用户视野内关键互动，高保真
- `W2 + dormant cognition + no renderer`：追赶期无认知、无表现

## Cognition Wake

原则：**wake-driven / event-driven / meaningful-boundary-driven**。

禁止默认的「每居民每分钟 heartbeat 调模型」。

Trigger 候选（详见 `05`）：

- scheduled activity boundary（由 due queue 唤醒）
- need threshold / conditionBand 变化
- action failure（对齐 `m3-replan-v1`）
- unexpected observation（未来）
- relationship / economic event（未来 M4/M6）
- message / dialogue / human interaction
- commitment due / goal terminal
- rare world event

## Budget Authority

| 模块 | 拥有 |
| ---- | ---- |
| **M10** | 是否值得执行 cognition、使用哪一层、分配多少预算、公平配额、升级/降级 |
| **M5** | 在给定层与预算内，**执行一次** bounded cognition（context 组装、provider 调用、结构化解析） |
| **M2 Kernel** | 世界事实合法性；无视预算与 LOD |

预算维度：resident / world / time-window / provider / interaction / priority-class / emergency reserve。  
一个居民不可因「事件多」或「离用户近」无限占用 I3。

## Fairness

与 RES-M8 / PRE-AL-07 deterministic ordering 兼容：

- due 排序仍是 `(nextWakeWorldTime, residentId, wakeReason, decisionEpoch)`
- cognition 配额是 **resident-scoped**，预算耗尽降低 LOD，**不冻结存在**
- aging + bounded burst + starvation prevention + poison isolation
- 人类观察可带来 **有界 attention bonus**，必须计入该居民配额，且不改变世界规则

详见 `07` 与 `14`。

## 人口成本模型（UNVERIFIED MODEL）

未运行真实 benchmark。设计目标：

```text
naive:   cost ≈ residents × minutes × tick_cost          # 禁止
target:  cost ≈ D(t) × C_kernel + W(t) × C_cognition(layer)
```

其中 `D(t)` 是 due/meaningful boundary 密度，`W(t)` 是经 Trigger + Budget + Fairness 过滤后的 cognition wake 密度。

数量级设计目标（非测量）：

| 人口 | durable events/day 量级 | cognition wakes/day 设计目标 | 主导模式 |
| ---- | ----------------------- | ---------------------------- | -------- |
| 30 | 10²–10³ | 全民可 I1–I2，少量 I3 | 精细互动 |
| 300 | 10³–10⁴ | 背景 I0 为主，焦点 I2/I3 | 街区 |
| 1,000 | ~10⁴ | 绝大多数 I0，事件驱动升级 | 城镇 |
| 10,000 | ~10⁵ | I0 基线，严格配额 | 城市切片 |
| 100,000 | ~10⁶ | 仅 meaningful subset 有 I1+ | 都市研究地平线 |

**10k/100k 是边界研究，不是 M10 v1 实现目标。**

## 30 → 1000 方案（摘要）

| 阶段 | 主导 | 瓶颈 | Gate |
| ---- | ---- | ---- | ---- |
| P30 | I0–I2 全开，可少量 I3 | 产品正确性 | Zero-LLM + Kernel 正确 |
| P300 | I0 基线 + 事件升级 | due 密度、公平 | no starvation + budget |
| P1000 | wake index + 严格配额 | Wake index / 分区前兆 | 300→1000 Gate |

完整定义见 `10_SCALING_30_300_1000_10000_100000.md`。

## Provider / Zero-LLM / Replay

- Provider 全挂：世界仍推进；I0 必须成立；I1+ 可 defer / degrade / bounded queue
- **禁止** LLM 编造缺失历史
- Replay：**保存 structured cognition result / frozen output envelope**，禁止 replay 时重新联网调用模型
- 实时 vs 追赶：S0 exact 下，已发生的 I3 必须重放其已有结果；新 boundary 若无 evidence → 按 policy 降级为 I0/I1，不得分叉历史（除非未来 fidelity contract）

## Human Attention Bias

| 层 | 可否因「用户在看」提高 |
| -- | ---------------------- |
| Visual LOD / presentation fidelity | 可以 |
| Cognition LOD（世界后果） | 仅在 **有界 attention bonus + 公平配额** 内，且不得改变事实合法性 |
| World Kernel authority | **不可以** |
| 永久智能 | **不可以** |

## 正式 M10 最小范围（提案，非任务）

见 `20`。建议 12 个能力域，目标优先 **30 → 300 → 1000**，不做「大规模文明」。

## Gate 提案

见 `21`。硬门禁 G-01…G-12，每条可自动测试或可提供明确证据。

## 与主线关系

- 本研究**不**替 PRE-AL-07 做决策
- 本研究**不**修改 RES-M8 FREEZE 内容，只登记依赖
- 本研究**不**抢 RES-M9-001 身份合同
- M5 的 I-LOD 编号冲突在 `03` 与 `19` 显式登记，待正式 ADR 裁决

## 下一步（非实现）

1. 主线继续 PRE-AL-07
2. 关闭 M3 action-loop blockers
3. 正式 M5 / M8 / M10 Compatibility Review + ADR
4. 仅在 Gate 通过后编写正式 M10 任务

## FREEZE

研究提交后：**FREEZE = ON**。
