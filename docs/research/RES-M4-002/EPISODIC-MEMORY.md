# EPISODIC-MEMORY

## 1. 定位

Episodic Memory = 居民对一次 eligible perception 的主观持久编码。  
不是 World Event 复制件，也不是 LLM 日记。

## 2. 最小 structured core（研究 sketch）

```ts
type EpisodicMemoryCore = {
  memoryId: string;
  worldId: string;
  ownerResidentId: string; // cognitive owner
  kind: "EPISODIC";
  observedAtWorldTime: string;
  locationId: string | null;
  primaryActorId?: string;
  targetRefId?: string;
  sourceEventIds: string[]; // lineage, usually 1
  perceptionChannel: PerceptionChannelV1;
  confidence: number;
  salience: number;
  importance: number; // policy-computed
  emotionalValence?: number; // -1..1 optional
  arousal?: number; // 0..1 optional
  isIdentityMilestone?: boolean;
  status: "ACTIVE" | "DECAYED" | "ARCHIVED";
  encodingPolicyVersion: string;
  observationPolicyVersion: string;
  summaryKey: string; // structured key, not sole truth
  narrative?: string | null; // optional projection, not authority
};
```

## 3. “事件引用 + 主观解释” 裁决

**KEEP** RES-M4-001 的方向：

- 存 source lineage
- 存主观字段
- 不把 prose 当唯一 truth

**ADAPT**：

- narrative 必须 optional
- structured core 必须可在无 LLM 下生成

## 4. 生命周期

```text
ACTIVE → (decay) → DECAYED → (archive policy) → ARCHIVED
```

- forgetting 不删 `world_events`
- identity milestone 使用 high-retention policy，不是硬编码 decay=0

## 5. 禁止

- 用 memory 覆写 Kernel truth
- 把 retrieval score / AFS intermediate 写成 memory truth
- 全局广播后人人一条相同 omniscient memory
