# CLIENT-PROJECTION-CONTRACT-v0

状态：`TEMPORARY_V0 / NON_AUTHORITATIVE / READ_ONLY`  
目标：给 Web Observer 与 UE Client 一个最小、可替换、只读的投影契约。  
不是正式 M7 Projection authority。

## Handshake

客户端启动时请求：

```http
GET /api/v1/client/v0/contract
```

响应字段：

```json
{
  "schemaVersion": "client-projection-v0",
  "capabilities": [
    "world_snapshot",
    "places",
    "resident_detail",
    "event_feed",
    "replay_snapshot"
  ],
  "transport": ["http_poll"],
  "realtime": "unavailable"
}
```

若客户端无法理解 `schemaVersion`，显示 `INCOMPATIBLE CLIENT VERSION`，不得猜字段。

## World Snapshot

```http
GET /api/v1/client/v0/worlds/:worldId/snapshot
```

```ts
type ClientWorldSnapshotV0 = {
  schemaVersion: "client-projection-v0";
  worldId: string;
  worldTime: string; // ISO world time
  worldSeq: string; // decimal string of bigint
  worldStatus: "RUNNING" | "PAUSED" | "MAINTENANCE";
  generatedAt?: string;
  places: ClientPlaceProjectionV0[];
  residents: ClientResidentProjectionV0[];
};
```

## Resident Projection

```ts
type ClientResidentProjectionV0 = {
  residentId: string;
  displayName?: string; // absent in M3 V0 unless formal data exists
  placeId: string;
  placeKey?: string;
  placeKind?: "HOME" | "OFFICE" | "CAFE" | "STORE" | "PARK" | "TRANSIT";
  activity:
    | "IDLE"
    | "TRAVELING"
    | "SLEEPING"
    | "EATING"
    | "WORKING"
    | "TALKING"
    | "UNKNOWN_ACTIVITY";
  activityInstanceId?: string | null;
  activityStartedAtWorldTime?: string | null;
  activityDueAtWorldTime?: string | null;
  targetPlaceId?: string | null;
  participantId?: string | null;
  employmentStatus?: "EMPLOYED" | "UNEMPLOYED";
  workplaceId?: string | null;
  projectionSeq: string;
};
```

注意：

- V0 若正式数据没有 display name，UI 显示 `Resident 001` 风格标签，不后端伪造 Identity。
- 不把 UE asset path 写入世界 Truth。
- `foodUnits` 等资源字段默认不进入 client DTO；若 Observer 需要展示，只能来自正式只读 observation capability，并明确 `dev-only` 标记。

## Place Projection

```ts
type ClientPlaceProjectionV0 = {
  placeId: string;
  placeKey: string; // e.g. office, cafe, home-unit-01
  placeType:
    | "HOME"
    | "OFFICE"
    | "CAFE"
    | "STORE"
    | "PARK"
    | "TRANSIT"
    | "UNKNOWN_PLACE";
  displayName: string;
  parentPlaceId?: string | null;
  residentCount?: number;
};
```

`visualKey` 不进入 World Truth；视觉映射见客户端 `ClientVisualManifest`。

## Event Feed

```http
GET /api/v1/client/v0/worlds/:worldId/events?afterSeq=&limit=&residentId=&placeId=&eventType=
```

```ts
type ClientWorldEventV0 = {
  eventId: string;
  worldSeq: string;
  eventType: string; // RESIDENT_MOVE_STARTED, ...
  occurredAtWorldTime: string;
  residentId?: string | null;
  participantId?: string | null;
  placeId?: string | null;
  targetPlaceId?: string | null;
  payloadSummary?: Record<string, string | number | boolean | null>;
};
```

只读 Event Ledger 投影，不可编辑。

## Resident Detail / Causal Evidence

```http
GET /api/v1/client/v0/worlds/:worldId/residents/:residentId
GET /api/v1/client/v0/worlds/:worldId/residents/:residentId/evidence?aroundWorldTime=
```

Causal chain 结构化字段：

```ts
type ClientCausalEvidenceV0 = {
  worldTime: string;
  observation?: {
    placeId?: string;
    activity?: string;
    sourceWorldSeq?: string;
  };
  need?: {
    hungerPressure?: number;
    restPressure?: number;
    socialPressure?: number;
  };
  goal?: {
    goalType?: string;
    reasonCode?: string;
  };
  candidates?: Array<{ actionType: string; score?: number }>;
  selectedAction?: {
    actionType: string;
    targetPlaceId?: string;
    participantId?: string;
  };
  actionRequest?: {
    status?: string;
    requestId?: string;
  };
  kernelOutcome?: {
    status: "COMMITTED" | "REJECTED" | "CONFLICT" | "UNAVAILABLE";
    reasonCode?: string;
  };
  events: ClientWorldEventV0[];
  nextObservation?: {
    placeId?: string;
    activity?: string;
  };
};
```

禁止展示模型内部 chain-of-thought。没有正式 evidence 时显示 `UNAVAILABLE`，不得编造。

## Replay Snapshot

```http
GET /api/v1/client/v0/worlds/:worldId/replay?atWorldTime=2026-10-07T09:00:00.000Z
```

返回与 live snapshot 同构的只读 projection，额外字段：

```ts
type ClientReplayEnvelopeV0 = {
  mode: "REPLAY";
  atWorldTime: string;
  snapshot: ClientWorldSnapshotV0;
};
```

UI 必须显示 `REPLAY`，与 `LIVE` 明确区分。Replay 不得产生新世界行为。

## Polling 与 Cursor

V0 默认：

```http
GET .../events?afterSeq=<lastAppliedSeq>&limit=100
```

客户端维护：

- `worldId`
- `lastAppliedWorldSeq`
- `connectionState`: `CONNECTED | STALE | RECONNECTING`

不要把 polling 写进核心游戏逻辑；统一走 `IWorldProjectionSource`。

## 未来替换

正式 M7 到来时：

1. 保留 `client-projection-v0` 路径或提供版本迁移说明。
2. 新增 formal realtime transport。
3. Observer / UE 只替换 source 实现与 DTO mapper。

## 实现状态

本契约目前是设计文档。  
生产 API 尚未实现。实现必须在：

1. 人工批准本设计；
2. M3 正式 PASS（或用户明确授权仅在隔离分支做 non-merge prototype）；
3. 新建 C0/C1 正式任务并验证。

之后进行。
