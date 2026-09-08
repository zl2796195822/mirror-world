## 输入与排序

```text
seed = versioned world.seed + M3 fixture config version
snapshot = world-scoped observation at worldSeq/worldTime
residentState = ordered profile + need signals + runtime cursor
decisionEpoch = resident Life cursor
```

resident 顺序按固定字节/ASCII 的 residentId；candidate 按 `score desc → goal priority desc → stable candidate key asc`；event 只按 world-local seq；wake key 为 `worldTime → residentId → wakeReason`。tie-break 使用 `hash(seed,worldId,residentId,worldDay,decisionEpoch,candidateKey)`。

禁止 `Math.random()`、未注入 wall clock、机器时区、unordered iteration、LLM、HTTP arrival order、客户端插值和 created_at 影响选择。M3 simulation 可用由 `(worldId,residentId,epoch)` 派生的 deterministic UUID；生产 opaque UUID 不进入核心 hash，或 replay 时规范化。

暂停时 world time、needs、epoch、backoff 和新 request 不推进；wall clock 回拨不能让 world time/anchor 回退。M2 hash 只覆盖最小 replay state，M3 还需将 committed domain events/outcomes 纳入 reducer。

验收关系：相同 `(snapshot, worldTime, resident state, seed, decision epoch)` 必须得到相同 semantic ActionRequest；改变遍历顺序、created_at 或网络时延不得改变结果。
