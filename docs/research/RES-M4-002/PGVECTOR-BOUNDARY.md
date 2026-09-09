# PGVECTOR-BOUNDARY

## 1. 角色

```text
PostgreSQL structured memory rows = Truth
pgvector index = Retrieval Index (optional, rebuildable)
```

## 2. KEEP / REJECT

| 项                                           | 裁决         |
| -------------------------------------------- | ------------ |
| 使用 PostgreSQL 原生 pgvector                | KEEP（可选） |
| Vector Index ≠ Memory Truth                  | KEEP         |
| embedding dim 768 进 domain contract         | **REJECT**   |
| 用 vector row 作为唯一 memory representation | **REJECT**   |
| 独立向量库作为真相源                         | **REJECT**   |

## 3. Provider 可替换性

- domain contract 使用 `embeddingRef` / provider+version 抽象
- storage adapter 可有 provider-specific dimension
- 换 embedding provider 不得破坏 memory lineage

## 4. 删除索引试验（未来 Gate 候选）

- 删除/重建 vector index 后：
  - structured memory 仍可读
  - 关系投影仍可点查
  - 仅语义相似检索降级/重建
