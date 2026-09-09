# RELATIONSHIP-MODEL-V2

## 1. 与 RES-M4-001 的关键分歧

RES-M4-001 建议 Kernel 写 `RELATIONSHIP_CHANGED` 作为权威 World Fact。  
在当前 main 架构下，该做法 **v1 REJECT**。

理由：

1. 关系是 **居民主观社会认知**，不是物理/经济事实。
2. A→B 与 B→A 不对称；Kernel 不应裁决“双方真实信任值”。
3. 同一客观互动，不同观察者可形成不同 relationship delta。
4. 若 Kernel 直接写 trust，会把 subjective projection 污染进 Event Ledger。

## 2. v2 正确链

```text
Objective World Interaction Facts (TALK/HELP/WORK/BUY... committed events)
        ↓
Resident Observation / Perception
        ↓
Interpretation / Projection Policy
        ↓
Relationship Delta (resident-scoped)
        ↓
Directional Relationship State (materialized, rebuildable)
```

## 3. 六维 ontology 复审

| Dimension   | v1 建议                                    |
| ----------- | ------------------------------------------ |
| familiarity | **KEEP**                                   |
| trust       | **KEEP**                                   |
| affinity    | **KEEP**                                   |
| conflict    | **KEEP**                                   |
| obligation  | **KEEP（可先窄化为未偿人情/债务感知）**    |
| dependency  | **DEFER 或并入 obligation/economic later** |

说明：这是 **candidate ontology**，不是永久人类关系真理。

M4 v1 可从 4–5 维起步，避免一上来六维全量标定。

## 4. 方向性

必须：

```text
(worldId, fromResidentId, toResidentId) → independent state
A→B ≠ B→A
```

禁止单行双向共享 trust。

## 5. 与 SocialPressure

- SocialPressure = 自身 contact deficit Need
- Relationship = 对特定对象的长期社会状态
- 禁止 `SocialPressure=80 → trust-=20` 这类直接耦合
- Relationship 可影响候选对象、交互效用、encoding、未来 Goal scoring

## 6. 表形态建议（不实现）

- world-scoped directional key
- dimensions + version + lastAppliedWorldSeq/cursor + policy version
- 可 truncate 后从 observed interaction projections 重建（在 pinned policies 下）
