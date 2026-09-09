# 13 · Realtime / Catch-up Equivalence

## 问题

世界 A 实时跑 7 World Days。  
世界 B 离线对应时长后 catch-up。  
相同 genesis/policy/deterministic inputs，最终 canonical state 是否必须一致？

继承 RES-M8：

- 产品目标是 **相等**
- S0 exact deterministic only（v1）
- 不授权 S1/S2 粗粒度假历史

M10 追问：**Intelligence LOD 如何进入该等价？**

## 规则矩阵

| 情况 | 实时行为 | Catch-up 行为 | 是否允许分叉 |
| ---- | -------- | ------------- | ------------ |
| 已发生 I0/I1 规则决策 | 重算确定性 | 同规则重算 | 否 |
| 已发生 I2/I3 且有 envelope | 使用 Intent 提交过 | 重放 envelope Intent | 否 |
| Catch-up 遇到新 cognition boundary，Provider 可用 | — | 默认 **不得** 为补齐历史而新调 LLM 产生「新故事」 | 否（除非未来 fidelity contract 明确） |
| Catch-up 遇到新 boundary，Provider 不可用 | — | 按 policy **降级 I0/I1 完成 due**，或 DEFER（若规则允许） | 否分叉：必须用与「无 LLM 实时」相同的规则路径 |
| 实时曾 I3，envelope 丢失 | 有事实事件 | 事实仍可重放；decision digest 标 unavailable | 事实不分叉；决策可观测性降级 |

## 核心裁决

> **Catch-up 不是「离线重新创作人生」。**  
> Catch-up 是「用同一套确定性世界语义推进到目标时间」。  
> 已固化的 cognition 结果以 envelope 重放；未固化的边界走 I0/I1 规则，而不是临时召唤模型补剧情。

这保证：

- 不会出现实时历史 A / 离线历史 B
- Provider 不是持续性前提
- 人类回来时看到的是唯一历史

## 与 W2 的关系

- W2 默认 no presentation, no new expensive cognition
- Driver event-jump 到 due boundary
- 每个 boundary：有 envelope 则用，否则 I0/I1 policy
- 禁止在 W2 里跑「为了好看的 I3 生成」

## 假设（继承 + 补充）

1. 相同 SimulationManifest
2. 相同外部输入（none 或 recorded envelopes）
3. 相同 World Time Policy
4. S0 exact
5. 相同 deterministic due ordering
6. 事实路径无未记录 LLM 非确定性
7. 相同 Kernel semantics versions
8. 相同 cognition policy version **或** envelope 显式覆盖策略结果

## 测试设计（未来，不在本研究实现）

```text
Run A: realtime, allow I2/I3 with envelopes
Run B: freeze, offline elapsed, catch-up
       (providers blocked after freeze)

Assert:
  event sequence hash equal
  projection hash equal
  outcome stream equal
  if envelopes complete: decision digest equal
  if envelopes missing: decision digest marked unavailable, facts still equal
```

变体：

- 中途 pause
- catch-up 中 crash/resume
- queue loss rebuild
- 强制 I3-only 实时 vs I0-only 对照（预期不等，用于证明 LOD 改变行为但不改规则）

## 风险

| 风险 | 缓解 |
| ---- | ---- |
| 实时 I3 与 catch-up I0 行为不同 | 预期可能不同 **决策**，但 catch-up 必须重放已发生决策；未发生决策用规则 |
| 误把「不同决策」当成 bug | 区分 **已提交历史** vs **未到达的未来** |
| envelope schema 变更 | version + 兼容读取 |
| 把 catch-up 当第二 Life Engine | 禁止；同一 driver 语义 |

## 结论

Realtime 与 Catch-up 在 **事实层必须等价**。  
Intelligence LOD 允许影响「尚未固化的决策策略」，但不允许改写已固化的历史；缺 Provider 时降级而不是分叉。
