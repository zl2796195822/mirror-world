# CLIENT-C2-PROJECTION-GAP-REPORT

状态：`NO_P0_BLOCKING_GAPS`

基于 `client-projection-v0` 与 C1.1 真实 snapshot。

## P0 blocking

无。

C3 Greybox / Snapshot spawn 所需字段已具备：

- placeId / placeKey / placeType
- residentId / activity / targetPlaceId
- activityInstanceId / startedAt / dueAt / projectionSeq

## P1 important

| Gap                           | Impact                               | Note                                  |
| ----------------------------- | ------------------------------------ | ------------------------------------- |
| 无正式 place adjacency API    | 无法做 authoritative visual topology | 使用 `VISUAL_ONLY_ADJACENCY`          |
| 无 causal evidence client API | Observer WHY? 暂缓                   | 记录 `CAUSAL_VIEW_PENDING_CLIENT_API` |
| 无 realtime delta             | C6 前 polling                        | `IWorldProjectionSource` 可替换       |

## P2 optional

| Gap                       | Impact                             |
| ------------------------- | ---------------------------------- |
| displayName 缺失          | UI 使用 Resident 001               |
| visualKey 不在 server DTO | 正确：放 client manifest           |
| freshness 细粒度状态      | V0 用 CONNECTED/STALE/RECONNECTING |

## 结论

不扩大 C2 API 范围。若 C3 实现中发现新 P0，再另开任务。
