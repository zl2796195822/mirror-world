# 02 · Problem Definition

## 核心问题

> 当镜界从 30 个居民扩展到 300 / 1,000 / 10,000 / 100,000 居民时，怎样改变「智能计算方式」，同时不改变居民身份、世界事实和历史因果？

## 问题不是什么

| 不是 | 原因 |
| ---- | ---- |
| 「怎么省 Token」 | Token 只是成本表现；根因是认知触发与权威边界 |
| 「把模拟频率调低」 | 会改变生活密度与历史因果 |
| 「让模型自己决定多聪明」 | 不可审计、可被操纵 |
| 「用户看谁谁就更强」 | 破坏世界公平与可重放性 |
| 「为 100k 预先重写 30 人架构」 | 违反「不得为未来规模破坏当前 30 人正确性」 |

## 必须建立的完整理论

1. **Intelligence LOD**：认知深度分层（不是渲染、不是世界切片推进）
2. **Cognition Budget**：谁有权决定「这次值不值得想、想多深」
3. **Wake-driven Cognition**：有意义边界唤醒，而不是 heartbeat 轮询
4. **Population Scaling**：30 → 300 → 1000 → 10k → 100k 的模式切换
5. **Fairness**：确定性、无饥饿、resident-scoped
6. **Determinism**：相同输入可重放相同事实历史
7. **Degradation**：Provider / 预算 / 过载下的可预测降级
8. **Replay Compatibility**：历史不因 LOD 变化而改写

## 成功判据（研究层）

本研究在以下条件满足时视为「研究完成」：

- [x] 给出 I0–I3 能力与权威边界
- [x] 证明 LOD 只改计算深度，不改事实合法性
- [x] 与 W0–W2、Visual LOD 正交
- [x] 定义 wake trigger 与禁止 heartbeat 默认
- [x] 定义 budget authority 的 M5/M10 分工
- [x] 给出 fairness 与 deterministic ordering 兼容方案
- [x] 给出 promotion/demotion 可审计信号
- [x] 给出五级人口成本模型（明确 UNVERIFIED）
- [x] 给出 30→1000 路径与 10k/100k 边界
- [x] 给出 Provider outage / Zero-LLM / Replay / Catch-up 方案
- [x] 给出 Human Attention Bias 边界
- [x] 给出 Contract Matrix、Formal Scope、Gate、Risk、Pending、Port Plan

## 非目标

- 不实现 scheduler / provider / LOD runtime
- 不写 migration / schema
- 不改 PRE-AL-07
- 不关闭 M9 身份合同
- 不声称性能实测

## 关键张力（必须显式裁决）

### 张力 A：产品戏剧性 vs 世界公平

产品希望焦点角色更「聪明」；世界要求李四不因张三被点击而变笨或永久低智。

**裁决方向**：允许有界 attention bonus，不允许无限插队或永久智能；世界规则对所有 I 层相同。

### 张力 B：实时体验 vs 历史唯一

用户在线时用 I3 产生了精彩决策；离线追赶时 Provider 不可用。

**裁决方向**：已发生决策必须有 structured evidence 可重放；新边界在无 evidence 时降级 I0/I1，不得编造 I3 历史。

### 张力 C：M5 执行 vs M10 决策

M5 研究已描述 LOD 与调用；若不切开，会出现「执行层顺手决定预算」。

**裁决方向**：M10 = policy（值不值得、哪一层、多少预算）；M5 = mechanism（给定层与预算如何调用）。

## 与最高愿景的对齐

```text
Persistent Parallel Human Civilization
  ≠ always-on LLM swarm
  = durable identities + deterministic world continuity
    + optional deep cognition at meaningful boundaries
```

`Persistent ≠ Always Computing`  
`Persistent ≠ Always LLM`  
`Intelligent ≠ Every Tick`
