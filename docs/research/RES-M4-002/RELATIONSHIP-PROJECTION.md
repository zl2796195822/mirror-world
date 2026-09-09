# RELATIONSHIP-PROJECTION

## 1. Projection 不是 World Fact 写入

Relationship state 是 **derived cognitive projection**。  
World Kernel 只提交客观互动事实；不直接 `UPDATE trust`。

## 2. 最小投影输入

```text
observed interaction event(s)
+ observer identity/role
+ interpretation policy version
+ current relationship state (optional baseline)
→ delta / new state
```

## 3. 幂等（P1）

同一 observation/event 不得重复加减：

- 使用 source identity：`(worldId, observerResidentId, sourceEventId, projectionPolicyVersion)`
- 或 projection cursor：`lastAppliedWorldSeq` + per-event applied set
- 重复处理必须 no-op

## 4. 顺序

同一居民连续观察多个关于 B 的事件：

- 按 `worldSeq` 严格顺序应用
- M4 30 residents：优先 correctness，不为百万居民过早分片

## 5. 解释层

未来 LLM 可做 interpretation candidate，但：

- 必须 schema validated
- 必须 source lineage
- 不可用时 deterministic baseline 必须可继续

## 6. 禁止

- Economy/Event 直接 `trust += 10`
- 把 relationship state 写回 world_events 作为全量镜像（只可考虑未来审计型记录，且非 v1）
- 让 Life Engine 直接 SQL 修改 relationships
