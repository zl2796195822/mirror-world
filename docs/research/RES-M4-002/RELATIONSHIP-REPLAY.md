# RELATIONSHIP-REPLAY

## 1. 不能简单说 world_events → relationship state

除非同时固定：

- perception eligibility policy
- interpretation/projection policy
- observer identity
- ordering
- source lineage / applied cursor

## 2. RelationshipReplayInputs（研究结构）

```ts
type RelationshipReplayInputs = {
  worldId: string;
  observerResidentId: string;
  events: Array<{
    eventId: string;
    seq: string;
    type: string;
    payloadRef: unknown;
  }>; // ordered
  eligibilityPolicyVersion: string;
  projectionPolicyVersion: string;
  baselineState?: RelationshipState | null;
};
```

## 3. 两种 replay

| Mode                               | 含义                            |
| ---------------------------------- | ------------------------------- |
| Historical relationship replay     | 重建当时实际投影结果            |
| Re-derived relationship projection | 用当前/指定 policy 重推可能结果 |

v1 至少保证 re-derived deterministic projection。  
Historical exact replay 依赖 durable applied-cursor / decisions。

## 4. 与 World Replay 的关系

- World Replay 权威仍是 Event Ledger。
- Relationship rebuild 不得改 events。
- Relationship table 可删除重建（在 pinned inputs 下）。
