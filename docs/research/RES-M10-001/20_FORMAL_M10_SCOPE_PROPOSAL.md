# 20 · Formal M10 Minimum Scope Proposal

> Proposal only，不是正式任务。  
> 目标优先：**30 → 300 → 1000**。不做「大规模文明」。

## 原则

1. 先正确后规模
2. I0 先于 I3
3. Policy 与 mechanism 分离（M10 vs M5）
4. 可测试 Gate 先于功能堆叠
5. 不预支 10k/100k

## 建议能力域（12）

| ID | 能力域 | v1 范围 |
| -- | ------ | ------- |
| C1 | Cognition Policy Contract | `m10-cognition-policy-v1` 纯函数：signals→I0–I3 |
| C2 | Wake Trigger Registry | T01–T03/T11 最小集；扩展点 |
| C3 | Cognition Budget Model | resident/world/window 配额数据模型（研究→实现前 ADR） |
| C4 | Fairness Quota | aging、burst、starvation 指标 |
| C5 | Promotion/Demotion Engine | 可审计、确定性 |
| C6 | Attention Bonus Boundary | 有界、可关、记账 |
| C7 | Cognition Envelope Contract | I2/I3 evidence schema |
| C8 | Replay Degradation Rules | 缺 envelope / Provider down |
| C9 | Zero-LLM Survival Harness | I0-only 世界推进测试 |
| C10 | Population Harness P30/P300/P1000 | synthetic density，非假 benchmark 当实测 |
| C11 | Observability Spec | 指标契约，可先 mock |
| C12 | Gate Test Suite | G-01… 见 `21` |

## 明确不进 M10 v1

- 10k/100k 生产分片
- 复杂多模型路由商业策略
- Visual LOD 实现
- Memory embedding
- 经济完整闭环
- Proxy 产品化
- 神经科学级人格

## 依赖前置（建议）

1. PRE-AL-07 完成
2. M3 action-loop 可驱动（至少规则闭环）
3. M5 最小 ProviderPort + IntentParser（即便先只用 mock provider）
4. M8 合同 review（至少 due/catch-up 语义）
5. M10 Compatibility ADR

## 交付物形态（未来正式）

- contracts 包（policy/envelope）
- life-engine 或独立 `cognition-policy` 纯包
- 测试：确定性、公平、零 LLM、replay
- docs/adr
- verification report

## 成功画像

- 30 居民可 I0 长跑
- 人为触发可升 I2，超配额必降
- 断 Provider 世界不灭
- Replay 不调模型
- 300/1000 synthetic 下无饥饿、预算有界
