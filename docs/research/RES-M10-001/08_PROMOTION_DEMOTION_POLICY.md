# 08 · Promotion / Demotion Policy

## 硬规则

1. **禁止** LLM 自己声明「这很重要，我应该升级」。
2. 升级/降级必须是 **纯函数 policy** 的结果，输入可审计。
3. policy 版本必须记录（类似 `m10-cognition-policy-v1`）。
4. LOD 决策不是 World Fact；默认写 audit metadata，不进 `world_events`（除非未来正式事件类型）。

## 状态机（研究）

```text
        promote
   I0 ────────► I1 ────────► I2 ────────► I3
    ▲            │            │            │
    │            │ demote     │ demote     │ demote
    └────────────┴────────────┴────────────┘
```

- 允许跳跃 promote（I0→I2）当 trigger 明确
- 允许强制 demote（provider/budget）
- I3 必须显式高门槛

## Promotion Signals

| Signal | 说明 | 可来自 | 可否单独冲 I3 |
| ------ | ---- | ------ | ------------- |
| S-NEED | need threshold / critical band | Life Engine | 否 |
| S-FAIL | failure class 非 SUCCESS | replan contract | 否（可升 I1/I2） |
| S-REPLAN | REPLAN_NOW / 多次冲突 | replan | 否 |
| S-UNEXPECTED | unexpected observation | future local context | 否 |
| S-REL | relationship event / high salience partner | future M4 | 可组合到 I2+ |
| S-ECON | 资源不足、重大买卖、失业等 | future M6 | 可组合 |
| S-MSG | 对话消息 / TALK | future M5 | I1–I2 |
| S-HUMAN | 人类互动在场 | product | I2–I3 有界 |
| S-PROXY | proxy 会话 | M9 charter | 按 charter |
| S-GOAL | goal terminal / long-horizon switch | goals | I1–I2 |
| S-COMMIT | commitment due | future | I1–I2 |
| S-RARE | rarity class world event | policy class | I2–I3 配额 |
| S-ATTENTION | 人类注意力 bonus | product | 仅叠加，有界 |

**Not a signal**：模型 confidence 自吹、自由文本情绪、未定义的「重要」。

## 决策函数（研究）

```text
promoteLevel =
  max(
    triggerDefault(reason),
    scoreToLod(
      w_need * needBand +
      w_fail * failureSeverity +
      w_rel  * relationshipClass +
      w_econ * economicImpact +
      w_goal * goalHorizon +
      w_human * humanPresence +
      w_rare * rarityClass +
      w_attn * attentionBonus
      - w_budget * budgetPressure
      - w_lag * worldLag
    )
  )
then clamp by fairness.quota and world.cap
```

注意：权重与阈值是 **policy config**，不是居民属性真理。

## Demotion Triggers

| Trigger | 行为 |
| ------- | ---- |
| budget exhausted | 降一层或多层至可负担 |
| provider timeout / unavailable | 降级或 defer |
| malformed output（修复次数尽） | 降级 |
| max duration elapsed | 强制结束该层 |
| fairness quota | 降级 |
| successful terminal | 回到基线 |
| world overloaded / W2 catch-up | 默认 I0 |
| operator cost cap | I2+ 停新 |

## 最大持续时间

| 层 | 研究建议 |
| -- | -------- |
| I2 | 单 wake 内有限 steps；超时降级 |
| I3 | 极少数 steps；禁止无界多轮谈判默认开启 |

## 与 Goal Stability 的关系

M3-T03 已有 active Goal switch-margin stability。  
M10 不得用 LOD 升级绕过 Goal stability；升级只是让「同一 Goal 下的候选」更丰富，不是随意改 Goal。

若未来 Goal 改变需要 I3，应通过正式 Goal 事件路径，而不是模型直接改 Goal 真值。

## 可审计记录（研究字段）

```text
CognitionDecisionAudit {
  worldId, residentId, wakeReason, decisionEpoch,
  baseLod, finalLod,
  signals: {S-*: value},
  budgetBefore, budgetAfter,
  fairnessQuotaState,
  attentionBonusApplied: boolean,
  policyVersion,
  sourceWorldSeq,
  outcomeDisposition?
}
```

此审计属于 ops/telemetry，不是 Event Ledger。

## 测试主张（未来 Gate）

- 相同输入 → 相同 finalLod（确定性）
- 无 S-HUMAN 时 attention 不生效
- 配额耗尽必降级
- provider fail 必降级/defer
- 任何 finalLod 下 Kernel 拒绝条件一致
