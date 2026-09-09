# PERFORMANCE

## 1. 原则

本任务 docs only，不制造伪 benchmark。历史 `<3ms` 无真实证据，继续标记 **UNPROVEN TARGET**。

## 2. 复杂度方向

| 操作                    | 复杂度方向                   | 备注                                |
| ----------------------- | ---------------------------- | ----------------------------------- |
| Event fanout            | O(events × coPresent)        | semantic co-presence，不是全城 O(N) |
| Memory insert           | O(encoded memories)          | AFS 先丢弃大部分噪音                |
| Memory growth           | 随 encoded memories 线性增长 | 必须靠 retention/consolidation 控制 |
| Retrieval               | 先结构化硬过滤再排序         | 不得全表扫 + 全量 embed             |
| Relationship projection | O(observed interactions)     | 幂等 cursor 后增量                  |

## 3. Memory growth 策略方向

- attention gate 拦截多数琐事
- consolidation 压缩 episodic → semantic
- forgetting/retention status 变迁
- archive 仅作后续策略方向，v1 不实现复杂冷存基础设施

## 4. Future benchmark plan（不执行）

### 30 residents

- eligibility fanout per event
- encoded memories / world-day
- projection apply latency
- retrieval p95 under bounded limit

### 1000 residents

- co-presence batch cost
- index size
- consolidation batch window
- storage growth per world-day

在真实测量前，任何毫秒级承诺都不得进入正式 contract。
