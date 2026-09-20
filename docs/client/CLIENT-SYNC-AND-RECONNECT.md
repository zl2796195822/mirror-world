# CLIENT-SYNC-AND-RECONNECT

## 目标

客户端永远不因为漏更新、乱序、断网而成为第二 Truth。

## 统一同步接口

```ts
interface IWorldProjectionSource {
  handshake(): Promise<ContractHandshakeV0>;
  getSnapshot(worldId: string): Promise<ClientWorldSnapshotV0>;
  getEvents(
    worldId: string,
    afterSeq: string,
    options?: { limit?: number },
  ): Promise<ClientWorldEventV0[]>;
  getReplay?(
    worldId: string,
    atWorldTime: string,
  ): Promise<ClientReplayEnvelopeV0>;
}
```

V0 实现：`HttpPollProjectionSource`。  
未来可替换：`SseProjectionSource` / `WebSocketProjectionSource`。

## Cursor

客户端状态：

```ts
type ClientCursorV0 = {
  worldId: string;
  lastAppliedWorldSeq: string;
  lastSnapshotWorldTime: string;
  connectionState: "CONNECTED" | "STALE" | "RECONNECTING";
};
```

## 应用规则

1. snapshot 的 worldSeq 必须是当前已知权威起点。
2. events 仅按 `seq > lastAppliedWorldSeq` 应用。
3. duplicate seq：忽略。
4. gap：视为 missing sequence，重新拉 snapshot。
5. unknown resident/place/activity：fallback + warning，不丢弃整包。

## 重连

1. 断网 → `RECONNECTING` / `STALE`
2. 恢复 → 请求 authoritative snapshot
3. 从新 snapshot 继续，不把断网期间预测当正式状态

## Freshness UI

若未来有正式 freshness contract，可用：

- CURRENT
- MINOR_LAG
- CATCHING_UP
- SEVERELY_BEHIND

V0 在没有正式 contract 时只用：

- CONNECTED
- STALE
- RECONNECTING

不要冒充 M7 正式状态。

## 限制记录

若使用 snapshot poll 而非 delta stream，客户端与文档必须记录：

`TEMPORARY_CLIENT_SYNC_LIMITATION`
