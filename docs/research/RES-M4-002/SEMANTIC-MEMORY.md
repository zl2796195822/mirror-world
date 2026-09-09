# SEMANTIC-MEMORY

## 1. 定位

Semantic Memory = 居民持有的去时空化信念/常识。  
不是 embedding chunk 堆，也不是 World Truth 镜像。

## 2. 从 episodic 到 semantic

```text
multiple episodic observations
        ↓
deterministic consolidation policy
        ↓
structured belief / fact candidate
        ↓
validate + lineage
        ↓
semantic memory upsert (resident-scoped)
```

## 3. 最小结构（sketch）

```ts
type SemanticBelief = {
  beliefId: string;
  worldId: string;
  ownerResidentId: string;
  subjectKey: string; // e.g. place:cafe:open-hours, person:B:role
  predicateKey: string;
  value: JsonValue; // structured
  confidence: number;
  sourceEpisodicIds: string[];
  lastReinforcedAtWorldTime: string;
  encodingPolicyVersion: string;
  status: "ACTIVE" | "SUPERSEDED" | "RETRACTED";
};
```

## 4. World Truth vs Belief

- World：`employment of B is CAFE_BARISTA`
- A 的 belief 可能过时/错误
- 错误 belief 仍是合法 cognitive state
- **禁止** belief 回写 world employment

## 5. v1 范围

- 只做少量确定性 consolidation 规则（例如：多次同地点同相位经历 → 地点作息 belief）
- 不做自由概念图谱、不做机构知识库
- LLM 可未来做 interpretation candidate，但不能绕过 schema/lineage

## 6. 冲突更新

新 episodic 与 belief 强冲突时：

- 可 `SUPERSEDE` 旧 belief 或降低 confidence
- 必须保留 source lineage
- 不删除底层 world events
