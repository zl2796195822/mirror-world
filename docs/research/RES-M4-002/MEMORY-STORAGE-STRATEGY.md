# MEMORY-STORAGE-STRATEGY

## 1. 方案对比

| 方案                                    | 描述                | 优点   | 缺点                          |
| --------------------------------------- | ------------------- | ------ | ----------------------------- |
| A single `memories` + type              | 一表多态            | 简单   | 语义/关系字段互相污染，约束弱 |
| B episodic/semantic 分表                | 类型分表            | 边界清 | 关系仍另表；查询要 join       |
| C core memory + specialized projections | 核心记忆 + 专门投影 | 可演进 | 设计要求高                    |

## 2. 推荐

**M4 v1 推荐近似 B/C 混合：**

1. `resident_episodic_memories`（或等价 core memory）
   - structured core + optional narrative + lineage
2. `resident_semantic_beliefs`
   - structured belief + sourceEpisodicIds
3. `resident_relationships`
   - directional projection state（不是 episodic 混存）

不要把 relationship dimensions 塞进每条 episodic 行。

## 3. 考虑因素

- lineage 查询
- forgetting status
- policy versions
- pgvector 仅挂在可检索文本/向量附属表或列，且可重建
- privacy：ownerResidentId 强制

## 4. 不写 migration

本文件仅为未来 schema proposal 方向。
