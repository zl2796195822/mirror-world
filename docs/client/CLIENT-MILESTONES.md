# CLIENT-MILESTONES

总原则：每一步都能看见效果；不要一次写完整未来客户端。

## C0 — Architecture & Contract

产出：

- client architecture
- projection boundary
- repo strategy
- API inventory
- DTO
- connection model
- visual manifest
- risk register

状态：本目录文档即 C0 设计产物；实现 C0 API 前仍需批准与 M3 授权。

## C1 — Web Observer V0

做到：

- 可打开
- 世界时间
- 30 residents
- 地点
- activity
- events
- resident detail
- causal evidence
- replay

## C2 — First Street 3D Static Scene

只完成：

- First Street 静态环境
- place anchors
- Observer camera
- 可先用 mock snapshot

## C3 — Server Snapshot Integration

接入真实 read-only world snapshot，30 Resident 真实 spawn。

## C4 — Resident Visual State

IDLE / SLEEPING / EATING / WORKING / TALKING / TRAVELING 可见。

## C5 — MOVE

server-authoritative logical movement + 客户端插值表现。

## C6 — Realtime / Reconnect

delta 或更优实时通道、reconnect、stale、catch-up；仍不拥有 Truth。

## C7 — Cross-client Verification

证明 Web 与 UE 看的是同一个世界。

## C8 — First Street Client Alpha

可以：

- 打开 Mirror World Client
- 进入 First Street
- 自由移动 Observer Camera
- 点击任意 Resident
- 看见真实生活并持续观察

## 依赖门

| 里程碑              | 前置                                            |
| ------------------- | ----------------------------------------------- |
| C1 production merge | 人工批准 + M3 PASS（或明确隔离 prototype 授权） |
| C3+                 | C1 可用的 projection adapter                    |
| C6+                 | 正式或临时 delta 策略落地                       |
| C7                  | C3–C5 真实数据通路                              |

## 明确不做（跨里程碑）

Player body、economy、dialogue、memory UI、relationship UI、weather simulation、multiplayer、VR/AR、large city。
