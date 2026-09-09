# DECISION-OBSERVATION-VS-PERCEPTION

## 1. 永久边界

```text
World Event     = 已经发生的权威世界事实
Observation     = 某居民有机会感知到的输入
Memory          = 某居民最终编码并保留的主观内容
```

再叠加当前 main 的第三条边界：

```text
WorldObservationSnapshot (Decision Observation)  ≠  M4 PerceptionObservation
```

## 2. Decision Observation（已存在）

来源：PRE-AL-02 / `packages/contracts/src/observation-contract.ts`

- 名称：`WorldObservationSnapshot`
- 版本：`m3-observation-v1`
- 用途：Life Engine **当前时刻决策输入**（Needs/Goals/约束）
- 形态：world-time 显式、read-only、deep-frozen、`sourceWorldSeq` stale-fence
- 内容：self profile、employment、actorRef、location、activity、workObligation、resources
- 不是：事件流、记忆、感知信道、注意力结果
- 明确禁止：读取其他居民 private memory / relationship inner state

## 3. M4 Perception Observation（未来）

用途：把 **committed world events** 转成 **resident-scoped 可记忆输入**。

建议概念契约（研究 sketch，非实现）：

```ts
// conceptual only
type PerceptionObservation = {
  policyVersion: "m4-perception-v1"; // future
  worldId: string;
  observerResidentId: string;
  sourceWorldSeq: string;
  sourceEventId: string;
  sourceEventType: string;
  channel: PerceptionChannelV1;
  confidence: number; // calibrated by channel/policy
  salience: number;
  observerRole: "ACTOR" | "TARGET" | "CO_PRESENCE" | "INDIRECT";
  locationId: string | null; // semantic location at perception time
  perceivedAtWorldTime: string;
  subjectSlice: {
    primaryActorId?: string;
    targetRefId?: string;
    summaryKey: string; // structured, not free prose only
    facts: Record<string, unknown>; // bounded, schema-validated
  };
};
```

## 4. 共享与禁止合并

**允许共享概念**：

- `worldId`
- `residentId` / subject identity
- `sourceWorldSeq`
- World Time
- semantic `locationId`

**禁止合并**：

| 禁止                                             | 原因                                     |
| ------------------------------------------------ | ---------------------------------------- |
| 把 event stream 塞进 Decision Snapshot           | 决策快照会爆炸，且污染 M3 边界           |
| 把 Memory/Relationship 塞进 Decision Snapshot    | 变成全知读模型，破坏 resident isolation  |
| 用 Perception Observation 替代 Decision Snapshot | Needs/Goals 需要当前状态，不是历史事件袋 |
| 用 Decision Snapshot 直接生成 Memory             | 跳过 eligibility/attention/encoding      |

## 5. 数据流分层

```text
                    ┌──────────────────────────────┐
                    │ World Kernel / Event Ledger  │
                    └───────────────┬──────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
   Decision Observation Path                  Perception Path (M4)
   WorldObservationSnapshot                   Committed Event
   (current state read model)                        │
              │                                      ▼
              ▼                               Perception Candidate
        Life Engine                             │
        Needs/Goals                             ▼
                                         Perception Policy
                                                │
                                                ▼
                                       Perception Observation
                                                │
                                                ▼
                                      Attention / Salience
                                                │
                                                ▼
                                         Memory Encoding
                                                │
                                                ▼
                                           Memory Store
```

## 6. Hard invariants

1. Decision Observation 读取 **不产生** World Event、Memory、Relationship delta。
2. Perception Pipeline **不得**修改 World Kernel Truth。
3. 同一 resident 在同一 `sourceWorldSeq` 上，Decision Snapshot 与 Perception Observations 是不同对象。
4. Observation 可以 ephemeral；Memory 才是主观持久层；World Event 才是客观持久层。
5. `System knows all ≠ Resident can query all`。

## 7. 结论

- **KEEP** Event ≠ Observation ≠ Memory。
- **KEEP** Decision Observation 与 Perception Observation 分层。
- RES-M4-001 的 ObservationEnvelope 应被 **重命名/重写为 PerceptionObservation**，而不是扩展 `WorldObservationSnapshot`。
