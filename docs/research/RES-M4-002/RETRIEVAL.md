# RETRIEVAL

## 1. 定位

Retrieval 是查询/排序，不是事实权威。  
检索分数不得写入 World Event，也不得成为 Memory Truth。

## 2. RES-M4-001 权重

`20/25/25/15/15` 等历史参数：

- **baseline only**
- 正式 contract 必须 policy-driven
- M4 首日不得冻结这些权重

## 3. v1 最小检索端口（概念）

```ts
type MemoryRetrievalQuery = {
  worldId: string;
  ownerResidentId: string; // resident-scoped hard filter
  worldTime: Date;
  limit: number;
  filters?: {
    aboutResidentId?: string;
    locationId?: string;
    eventType?: string;
    minImportance?: number;
  };
};
```

Hard filters 先行：world + owner + status + time bounds。  
排序可用：recency / importance / relation relevance / goal relevance —— 全部 CALIBRATION。

## 4. 安全边界

- Resident A 不能检索 Resident B episodic memories（除非未来正式授权/传播机制）
- 不能检索他人的 relationship inner state
- System omniscience ≠ API omniscience

## 5. pgvector

- 可作为 optional retrieval index
- 删除 vector index 后 memory truth 仍在 structured rows
- 不得 `vector(768)` 进入 domain contract
