# 18 Version Namespace Reconciliation

## Rule

所有 `version` 都必须带 namespace 和 owner；不同 namespace 的数值不能比较，也不能用一个全局递增数替代。下表是当前事实与未来合同的对照，`Proposed` 不表示已实现。

| Name                       | Owner direction               | Monotonic?                              | Scope                     | Replay relevance                  | Audit relevance | Can reset?                   | Durable?                       | State                        |
| -------------------------- | ----------------------------- | --------------------------------------- | ------------------------- | --------------------------------- | --------------- | ---------------------------- | ------------------------------ | ---------------------------- |
| `policyVersion`            | policy package / domain owner | within policy lineage                   | policy/domain             | yes, selects semantics            | yes             | new lineage only             | when referenced by result      | Current pattern / formalize  |
| `charterVersion`           | M9 Proxy Charter              | strictly increasing                     | delegation/resident       | yes for authorization replay      | high            | no within delegation         | yes                            | M9 proposed                  |
| `appearanceVersion`        | M7 embodiment/presentation    | increasing per appearance lineage       | embodiment/resident       | presentation replay only          | yes             | new embodiment lineage       | proposed                       | Pending M7/M9                |
| `schemaVersion`            | contract/event payload owner  | increasing within schema lineage        | payload type              | yes                               | yes             | new schema lineage only      | event/payload                  | Current payload pattern      |
| `decisionEpoch`            | driver/decision boundary      | increasing per resident decision stream | world + resident          | yes for ordering                  | yes             | only with new stream/lineage | wake registration when present | Current scheduler field      |
| `worldSeq`                 | Kernel Event Ledger           | strictly increasing                     | world                     | primary history cursor            | high            | never within world           | yes                            | Formal current fact          |
| `stateVersion`             | Kernel runtime state          | increasing per world + resident         | runtime row               | fence/replay input                | yes             | only new resident genesis    | yes                            | Formal current fact          |
| `sourceWorldSeq`           | runtime/projection source     | non-decreasing                          | world/resident projection | identifies source point           | yes             | new projection lineage       | yes where stored               | Current main + M7/M8 overlap |
| `assetVersion`             | asset registry                | increasing per asset lineage            | asset                     | presentation only                 | yes             | new asset lineage            | registry                       | Pending M7                   |
| `geometryVersion`          | place/geometry registry       | increasing per geometry lineage         | place/geometry            | presentation only                 | yes             | new geometry lineage         | registry                       | Pending M7                   |
| `cognitionEnvelopeVersion` | M10 envelope contract         | increasing schema/lineage               | cognition result          | required for deterministic replay | high            | new envelope lineage only    | envelope/result                | Pending M10                  |
| `manifestHash`             | replay harness/ops            | immutable content hash                  | simulation run            | yes                               | high            | new run only                 | run artifact                   | Pending PRE-AL-GATE          |
| `freshness`                | M7/M8 read model              | not a version                           | world/projection/client   | no, only interpretation           | useful          | n/a                          | projection metadata            | Pending cross-layer contract |

## Known semantic collision

M7 `sourceWorldSeq`/`afterSeq`、M8 world/catch-up cursor、current runtime `sourceWorldSeq` 都有“看到哪里”的外观，但不一定指同一 stream。必须在正式 contract 中分别命名 `truthWorldSeq`、`projectionSourceWorldSeq`、`visibleSeq` 或等价字段；本研究不擅自选定字段名。
