# CONCURRENCY-IDEMPOTENCY

## 1. 目标

同一 Observation/Event 处理两次，不得：

- trust +5 再 +5
- 同一事实生成重复“独立记忆”而不共享 source identity

## 2. Relationship projection 幂等

推荐 source identity：

```text
(worldId, observerResidentId, sourceEventId, projectionPolicyVersion)
```

或：

- per-resident `lastAppliedWorldSeq` cursor
- plus applied-event uniqueness

重复应用 = no-op。

## 3. Memory encoding 幂等

推荐：

```text
(worldId, ownerResidentId, sourceEventId, encodingPolicyVersion, channel)
```

作为去重键候选。  
同一事件在不同 channel/role 可形成不同 memory（若 policy 允许），但不得无限重复同键。

## 4. 并发模型 v1

- 30 residents：**correctness first**
- resident-scoped sequential apply by `worldSeq`
- 不需要全局分布式队列
- 可用 world row / resident row optimistic version

## 5. 与 Kernel stateVersion

- runtime `stateVersion` 仍是动作执行并发原语
- cognitive projection 需要自己的 cursor/version，不要复用成唯一语义
