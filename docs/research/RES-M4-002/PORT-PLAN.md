# PORT-PLAN

不 merge RES-M4-001。对 RES-M4-001 做选择性移植。

## 1. 直接概念复用

- Event ≠ Observation ≠ Memory
- No global broadcast
- Facts → Projection → State（关系）
- Directional relationship
- Vector Index ≠ Truth
- Zero-LLM baseline
- Forgetting 不删 World Event
- Memory ownership = resident
- Structured core + optional narrative

## 2. 需要重写/适配

- ObservationEnvelope → PerceptionObservation（semantic v1）
- 六物理信道 → 最小 channel set
- RELATIONSHIP_CHANGED 作为 Kernel truth → interaction facts + resident projection
- world_events-only identical memory replay → dual-mode replay
- AFS/retrieval 具体数值 → policy CALIBRATION
- identity decay=0 → high-retention policy
- checkpoint = digest，不是全量认知快照

## 3. 只留参考

- Generative Agents 权重启发
- 声学/视觉衰减公式
- 大规模 1000 居民估算
- 夜间巩固作为唯一触发

## 4. 应删除/拒绝进入正式设计

- embedding dim 768 作为 domain 常量
- MEMORY_CREATED / RELATIONSHIP_CHANGED 作为 v1 权威世界事实
- 一次 7 表铺开
- `<3ms` 无证据性能承诺
- “系统知道事件=所有居民记忆”

## 5. 后续路径

```text
RES-M4-001 + RES-M4-002
→ ADR-M4-001 (future, after M3 PASS)
→ Formal M4 tasks
→ TDD / Migration
```
