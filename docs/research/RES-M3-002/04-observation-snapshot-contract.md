## 当前 M2 事实

没有 `WorldObservationSnapshot`、projection、query port 或 durable resident read model。`validateActionRequest()` 的 `ActionValidationContext` 是调用方提供的纯内存 `world/actors/locations/items`（`action-validator.ts:35-64`）；ADR-0004 明确这不是 durable truth。当前 schema 也没有 residents、locations、items、accounts 或 action_results 表。

## 是否需要 Pre-M3

| 边界                                   | T01 | 真实 Action Loop   | M3 Gate                   |
| -------------------------------------- | --- | ------------------ | ------------------------- |
| 完整 Observation Snapshot              | NO  | YES                | YES                       |
| 纯 fixture input shape                 | YES | 可作为测试 adapter | YES，但最终需真实只读来源 |
| Life Engine 直接 import Drizzle schema | NO  | NO                 | NO                        |

T01 只生成可序列化 `ResidentSeedBundle`，不需要查询世界。Action Loop 前必须有最小只读观察边界，否则 Life 不知道 actor/location/resource 是否仍属于当前 world。

## M3 v1 最小 snapshot

```text
WorldObservationSnapshot {
  world: { id, seed, status, worldTime, worldSeq, timezone }
  residents: [{
    residentId, actorRef, identityKind, homeLocationId, locationId,
    employment: { status, workplaceId?, schedule? }, routineProfile,
    needSignals, resources: { cashCents?, foodUnits? },
    activity: { kind, busyUntilWorldTime? }, actorVersion
  }]
  places: [{ id, capability, worldId }]
  edges: [{ fromId, toId, travelMinutes }]
  items: [{ id, locationId, isFood, priceCents?, stockQuantity? }]
  snapshotRevision: { worldId, worldSeq }
}
```

资源、库存、location 仍由 Kernel/Economy 事实拥有；M3 只能读 fixture/projection。snapshot 过期只能解释，不能提交绕过 Kernel 的写入。不要为了“纯洁架构”造巨大 CQRS；一个按 world/resident 范围返回的最小 query adapter 足够。

本文件不创建 snapshot 表、repository、migration 或 API。T01 仅冻结 input shape；观察 port 是 Action Loop 的前置设计。
