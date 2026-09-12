# CLIENT-TEST-STRATEGY

## 原则

- 客户端测试只验证 observation/presentation/sync，不验证世界新事实。
- 不得通过客户端测试写回 Event Ledger。
- 跨端一致性是 V0 硬验收。

## Web Observer

覆盖：

1. contract handshake
2. snapshot rendering
3. 30 residents
4. place map
5. resident detail
6. causal evidence（有/无）
7. timeline filter
8. replay mode
9. LIVE/REPLAY separation
10. error state
11. stale data
12. empty state

## Client Projection Source

覆盖：

1. initial snapshot
2. duplicate delta
3. missing sequence → resnapshot
4. out-of-order
5. reconnect
6. snapshot refresh
7. unknown resident
8. unknown place
9. unknown activity
10. contract version mismatch

## UE

覆盖：

1. 30 residents spawn
2. place mapping
3. MOVE visual
4. SLEEP visual
5. EAT visual
6. WORK visual
7. TALK paired visual
8. world-time lighting
9. disconnect / reconnect
10. snapshot correction
11. 不产生 server mutation

## Cross-client consistency（必做）

给定同一个 World Snapshot：

- Web Observer 显示 R017 WORKING at OFFICE
- UE Client 必须看到 R017 在 Office 播放 WORKING

允许视觉表现不同，逻辑必须一致。

## Golden First Street Scenario

仅用于客户端验证的非 Truth fixture/reference：

```text
08:20 R001 home
08:25 MOVE → workplace
08:45 arrives
09:00 WORK
R007 EAT
R009/R012 TALK
R020 SLEEP
```

用于验证 UI / visual projection，不能改变真实世界 simulation。

## Gate 边界

普通回归 PASS ≠ Story Gate PASS。  
客户端测试 PASS 也不等于 M3 PASS。
