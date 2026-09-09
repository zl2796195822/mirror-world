# 11 · Provider Independence & Degradation

## 原则

> OpenAI / Anthropic / Google / DeepSeek / Local Model / **No Provider**  
> 都不可成为居民存在性前提。

## 硬约束

1. Provider 全挂时，世界仍推进。
2. I0 必须成立。
3. 可以：defer cognition、fallback、degrade、bounded queue。
4. **禁止** LLM 编造缺失历史。
5. Kernel / Life Engine / Replay 不得依赖特定厂商 SDK。

## Degradation Ladder

```text
I3 expensive provider
  → I2 alternate provider / local
    → I1 heuristic / small local
      → I0 rules
        → DEFER_UNTIL_WORLD_TIME (bounded)
          → STOP (fail-closed) 仅当规则路径也不可行
```

## Provider 故障类

| 故障 | 检测 | 行为 |
| ---- | ---- | ---- |
| timeout | wall-time abort | 有界重试 → 降级 |
| 5xx / network | error category | 同 timeout |
| schema malformed | parse fail | 有界修复 → 降级 |
| auth / quota | provider error | 切换/降级，不重试打爆 |
| slow (p95 高) | latency pressure | 全局提高升级门槛 |
| complete outage | health | I0 only |

## Provider Switch 行为漂移

| 风险 | 缓解 |
| ---- | ---- |
| 行为风格变化 | 记录 provider/model/policy 版本到 audit |
| 历史不可重放 | 重放只读 envelope，不重调 |
| policy version 漂移 | cognition policyVersion 入 audit |
| 非确定性采样 | 不依赖其确定性；事实路径只用已提交结果 |

## 应保存的结构化 Evidence

```text
CognitionEnvelope {
  envelopeVersion,
  worldId, residentId, wakeReason, decisionEpoch,
  sourceWorldSeq, actorVersion,
  lod, policyVersion,
  provider: { kind, model, requestId? },  # 可审计，不是 truth
  inputDigest, outputDigest,
  intent: structured ActionIntent,
  parseStatus, latencyMs, tokenUsage?,
  expiresAtWorldTime?
}
```

- Envelope 是 **replay evidence**，不是 World Fact
- 存储见 `12`
- privacy：可含摘要/脱敏策略（未来）

## No Provider 路径

| 能力 | No Provider |
| ---- | ----------- |
| Needs/Goals/Routine | 完整 |
| MOVE/SLEEP/WORK 规则 | 完整 |
| 简单 TALK 模板 | 可有 |
| 复杂社交/谈判 | 降级或 defer |
| 世界时间推进 | 完整 |
| Replay | 完整（读已有 evidence） |

## 与 M5 的边界

- M5 拥有 `ProviderPort` 机制
- M10 决定何时允许进入需要 Provider 的层
- 二者都不拥有事实写权

## 反模式

| 反模式 | 后果 |
| ------ | ---- |
| 无 LLM 就暂停世界 | 违反 Second Human World |
| 失败后让模型「补写」过去事件 | 伪造历史 |
| 无限重试 | 成本与雪崩 |
| 硬编码单厂商 | 不可替换 |
| 把 provider requestId 写进世界事实 | 污染 ledger |
