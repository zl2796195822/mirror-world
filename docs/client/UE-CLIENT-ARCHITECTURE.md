# UE-CLIENT-ARCHITECTURE

## 分层

```text
MirrorWorldClient
├─ Core
│  ├─ Projection
│  ├─ Entities
│  ├─ Places
│  ├─ Activities
│  └─ Time
├─ Networking
│  ├─ SnapshotClient
│  ├─ DeltaClient
│  ├─ Reconnect
│  └─ Cursor
├─ Presentation
│  ├─ Residents
│  ├─ Places
│  ├─ Movement
│  ├─ Animation
│  ├─ Lighting
│  └─ UI
└─ Debug
   ├─ ProjectionInspector
   ├─ ResidentInspector
   └─ ConnectionStatus
```

各层不得混成一个大类。

## 网络层

优先：

1. HTTP snapshot
2. HTTP event/delta poll（封装在 `IWorldProjectionSource`）
3. 未来可替换 SSE/WebSocket

不新引入复杂 broker，除非正式 backend 已有。

## Cursor 语义

客户端必须跟踪：

- worldId
- lastAppliedWorldSeq
- connectionState
- snapshot generation id / worldTime

用途：

- detect missing updates
- avoid duplicate apply
- reconnect 后 request authoritative snapshot

## 失败安全

必须处理：

- duplicate update
- out-of-order update
- reconnect
- snapshot refresh
- server restart
- unknown resident / place / activity
- contract version mismatch

错误时保持 server state 或 fallback debug anchor，记录 warning，不崩溃、不写回。

## Snapshot 进入流程

1. contract handshake
2. full world snapshot @ seq X
3. consume events after X
4. render

若当前 API 尚无正式 delta，V0 可用短周期 snapshot poll，但必须记录：

`TEMPORARY_CLIENT_SYNC_LIMITATION`

不要假装正式 M7 已完成。

## UE 项目边界

- 禁止连接 PostgreSQL
- 禁止 admin secret
- 禁止本地 UE Tick 决定 Resident 行为
- 禁止把客户端位置上传覆盖 Kernel location

## 未来 Player Mode 预留

```text
ObserverMode          // V0 实现
FutureEmbodiedMode    // V0 不实现
```

Player identity / proxy / avatar / authority 与 M9 强相关，V0 不得提前设计死。
