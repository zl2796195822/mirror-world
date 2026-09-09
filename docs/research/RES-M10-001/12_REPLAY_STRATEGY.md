# 12 · Replay Strategy

## 约束（继承主线）

- Replay 不允许重新调用 LLM 来「重写历史」。
- Event Ledger 是客观历史权威。
- Checkpoint 可重建，不是真理。
- 相同 manifest + 有序事件 → 相同 canonical hash。

## Intelligence LOD 在 Replay 中的位置

LOD 选择与 cognition 输出**不是**通过「再跑一遍模型」恢复，而是通过保存的 evidence 恢复。

```text
Realtime:
  wake → policy → (maybe LLM) → Intent → Request → Kernel commit → events
                ↘ save CognitionEnvelope (optional but required for I2/I3)

Replay:
  read events (+ optional envelopes for decision digest)
  never call provider
```

## 三种方案比较

### 方案 A：保存 structured cognition result（Intent only）

| 项 | 评价 |
| -- | ---- |
| determinism | 高（事实路径） |
| storage | 低 |
| privacy | 中 |
| provider independence | 高 |
| auditability | 中 |
| 能否重建「当时为何这样想」 | 弱 |

### 方案 B：保存 input/output digest

| 项 | 评价 |
| -- | ---- |
| determinism | 中高（可校验，不可重算） |
| storage | 低 |
| privacy | 较好（摘要） |
| provider independence | 高 |
| auditability | 中高 |
| 能否复现模型输出 | 否 |

### 方案 C：保存 frozen model output envelope（推荐主路径）

| 项 | 评价 |
| -- | ---- |
| determinism | 最高（直接重放 Intent） |
| storage | 中高 |
| privacy | 需策略（可截断/哈希敏感） |
| provider independence | 最高 |
| auditability | 最高 |
| 实现复杂度 | 中 |

## 正式推荐（研究）

**主推荐：C（frozen envelope）用于 I2/I3；I0/I1 heuristic 路径用确定性重算或 A。**

辅助：

- 所有层事实历史始终以 Event Ledger 为准
- envelope 用于 decision digest、调试、equivalence
- digest-only（B）作为大人口归档压缩选项

### 存储定位

- 不进 Kernel 事务真理
- 可旁路表/对象存储
- 可按 retention 归档
- 缺失 envelope 时：事实仍可重放；decision digest 降级为「仅事实 hash」

## 与 M2 Replay 的关系

M2 Replay：ordered events + fixed seed + checkpoint suffix。  
M10 不改 M2 权威，只规定：

- I2/I3 的 decision 可观测性依赖 envelope
- 若 envelope 缺失，**不得**调用 LLM 补齐
- 若缺少 envelope 导致 decision digest 无法复现，应显式标记 `DECISION_DIGEST_UNAVAILABLE`，而不是伪造

## Equivalence 要求

| Artifact | 必须一致？ |
| -------- | ---------- |
| authoritative projection / event sequence | 是 |
| outcome status/reason/event refs | 是 |
| worldSeq/worldTime terminal | 是 |
| derivedDecisionDigest | 若路径完全确定或 envelope 完整则是 |
| wall metadata | 否 |

## 风险

| 风险 | 缓解 |
| ---- | ---- |
| envelope 膨胀 | retention、摘要、只存 I2/I3 |
| privacy | 字段最小化、脱敏、访问控制（未来） |
| schema 演进 | envelopeVersion |
| 半缺失 | 明确降级语义，不编造 |
