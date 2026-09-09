# 05 · Cognition Wake Model

## 原则

> **wake-driven · event-driven · meaningful-boundary-driven**

而不是：

> 每居民每分钟调用一次模型。

周期 heartbeat cognition **默认禁止**。若未来出现「反思 heartbeat」，必须：

1. 频率极低且显式配置
2. 进入 budget + fairness
3. 可在 Zero-LLM 下关闭
4. 不得成为世界推进前提

## 与 World Wake / Decision Cycle 的关系

```text
World due / boundary
        │
        ▼
Driver wakes resident (PRE-AL-07 / M8)
        │
        ▼
Observation (M3/PRE-AL-02)
        │
        ▼
Cognition Policy → I0..I3          ← M10
        │
        ▼
Rule path or M5 bounded cognition
        │
        ▼
ActionRequest → Kernel → Outcome
        │
        ▼
replan/defer/stop (m3-replan-v1)
```

一次 **Cognition Wake** = 一次「进入认知策略评估并可能选择 I1+」的机会。  
它**不等于**一次 LLM 调用；I0 wake 成本可接近 0。

## Trigger 候选集（研究）

| ID | Trigger | 默认 LOD 倾向 | 现状 |
| -- | ------- | ------------- | ---- |
| T01 | scheduled activity boundary / due completion edge | I0–I1 | PRE-AL-07 pending |
| T02 | need threshold / conditionBand change | I0–I1 | needs 已有 evaluator |
| T03 | action failure class（replan signal） | I0–I2 | `m3-replan-v1` 已有分类 |
| T04 | unexpected observation | I1–I2 | localContext 仍 unavailable |
| T05 | relationship event | I2 可能 | M4 future |
| T06 | economic event（price/funds/job） | I1–I2 | M6 future |
| T07 | message / dialogue turn | I1–I2 | M5/TALK future |
| T08 | human interaction present | I2–I3（有界） | 产品未来 |
| T09 | proxy interaction | 按 Charter | M9 pending |
| T10 | commitment due | I1–I2 | 需 commitment 模型 |
| T11 | goal completion / failure | I0–I1 | goals 已有 |
| T12 | rare world event | I2–I3（严格配额） | 需 rarity class |
| T13 | manual/operator inject | 受审计 | 运维 |

## 默认策略（研究推荐）

### 基线

- 主路径：T01 + T02 + T03 + T11
- 其余 trigger 随模块落地启用
- 无 trigger 时 **不** 产生 cognition wake

### 反 heartbeat

| 允许 | 不允许 |
| ---- | ------ |
| due-driven wake | `setInterval(60s, think)` |
| threshold event | 全员每分钟 Need 扫描（Need 已 lazy） |
| dialogue turn | 空转「保持人格在线」 |
| 可关闭的低频反思（未来、有界） | 默认开启的常驻 CoT |

## Wake Key 与公平

与 RES-M8 / RES-M3-003 对齐（最终 freeze `PENDING_PRE_AL_07`）：

```text
wakeKey = (nextWakeWorldTime, residentId, wakeReason, decisionEpoch)
```

M10 不发明第二套排序。Cognition 配额在 **已被 driver 选中之后** 评估 LOD，而不是重新定义 due 队列。

## Event-Jump 兼容

- 需求阈值应尽量解析求解（何时跨阈值），而不是逐分钟 tick（RES-M8 EVENT-JUMP）
- Catch-up 与 realtime 使用同一 wake 候选语义
- W2 下默认只做 I0 级完成；若遇到「本应 I2/I3 的 boundary」见 `13`

## 状态归属

| 状态 | 是 Truth？ |
| ---- | ---------- |
| `world_events` / runtime / outcome | 是 |
| wake index | 否（可重建 projection） |
| LOD 选择记录 | 否（policy/audit metadata） |
| cognition envelope | replay evidence（旁路存储，非 Kernel fact） |

## 伪代码（研究）

```text
onDriverWake(residentId, reason, worldTime):
  obs = observationPort.read(residentId)
  if not cognitionTriggers(reason, obs):
    return ruleOnlyAdvance(I0)
  lod = cognitionPolicy.evaluate({
    reason, obsSignals, budget, fairness, attention, policyVersion
  })
  if lod == I0:
    return ruleCandidates → ActionRequest
  return m5.executeBoundedCognition(lod, obs, budget)
         → Intent → ActionRequest
```
