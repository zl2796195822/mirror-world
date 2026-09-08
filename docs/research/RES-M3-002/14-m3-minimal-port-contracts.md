## 仅保留两个 port

本文件是接口草案，不创建 TypeScript/API/migration。World Clock 读值包含在 Observation Snapshot 中，不另造空接口。

### WorldObservationPort

```text
read(worldId, residentIds?) -> WorldObservationSnapshot
```

职责：返回带 `{worldId,worldSeq}` revision 的只读 world/resident/actor/location/routine/resource/need 输入。authority 是 World Query/Projection；location、资源和时间仍归 Kernel/Economy/PostgreSQL。

禁止：返回 writer/repository；直接暴露 Drizzle schema；省略 revision；允许 Life 用快照更新事实。

### KernelActionPort

```text
submit(ActionRequest) -> ActionOutcome
query(requestId, idempotencyKey) -> ActionOutcome
```

职责：唯一事实 submission boundary。`COMMITTED` 至少带 requestId、worldSeqFrom/to、resultingEventIds、actorVersion；`REJECTED` 带 reasonCode/retryability；`DUPLICATE` 返回原完整 outcome；`UNKNOWN` 只能 query，不能盲目重发。`PENDING/CONFLICT` 也必须有明确机器语义。

禁止 Life 直接 update location/resource/world time；把 persisted 当 committed；用 score/trace/forecast 当 result。

### 明确省略

不另建 `WorldClockReadPort`，因为 clock/status/seq 已在 Observation 中；T01 不需要 ResidentStateStore/LifeStateStore。T03 如果要求 restart 后恢复 goal/attempt/backoff，再决定一个只存 Life runtime 的最小存储，不能提前造巨型 CQRS。
