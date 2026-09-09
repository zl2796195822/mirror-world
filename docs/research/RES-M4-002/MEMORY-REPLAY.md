# MEMORY-REPLAY

## 1. 两种模式必须拆开

### A. Historical Cognitive Replay

目标：重建 **当时居民实际形成的 Memory**。

需要：

- durable observation/encoding decisions，或
- 足够的 persisted lineage + immutable policies + immutable intermediate decisions

### B. Re-derived Cognitive Projection

目标：根据历史 World Events + 指定 policy 版本，重新推导“可能的 Memory”。

特点：

- 不必等于历史真实心智
- 更适合审计“如果用 policy X 会怎样”
- 成本更低，但不是 cognitive ground truth

## 2. 对 RES-M4-001 “world_events only → identical memories” 的裁决

**REJECT 作为无条件声明。**

除非同时固定：

- resident state / seed
- observation eligibility policy version
- attention policy version
- encoding policy version
- relationship interpretation policy version
- exact intermediate decisions that were non-derivable

否则无法声称 identical memories。

## 3. 当前 main 限制

- M2 Replay 只真正推进 `WORLD_TIME_ADVANCED` 并校验 MOVE/SLEEP payload。
- Checkpoint 是 digest checkpoint，不是全量 cognitive snapshot。
- 因此 **M4 v1 不能假装已有 full cognitive replay**。

## 4. v1 推荐

- 优先保证 **World Replay** 不被污染。
- Memory 侧提供：
  1. lineage 可审计
  2. deterministic zero-LLM re-derivation harness（mode B）
  3. 对“已编码 memory”的 restart persistence（不因重启消失）
- Historical Cognitive Replay（mode A）作为更强目标，依赖 observation persistence 策略 C。

## 5. Hard rule

Forgetting / Memory rewrite / Relationship rebuild  
**永远不得删除或修改 World Events**。
