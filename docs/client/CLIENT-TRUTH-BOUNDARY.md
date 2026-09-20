# CLIENT-TRUTH-BOUNDARY

## 权威分层

```
PostgreSQL durable truth
        │
World Kernel（世界事实唯一写入口）
        │
Event Ledger / runtime state / seed fixtures
        │
Read-only Client Projection Adapter (temporary v0)
        │
   ┌────┴────┐
   ▼         ▼
Web Observer  3D Client
```

## 客户端永远不能

- 直接连接 PostgreSQL
- 直接修改 Resident truth / location / activity / resource
- 直接创建世界事件
- 跳过 World Kernel
- 把本地视觉 transform、插值位置、断网预测上传为世界事实

## Server wins

视觉 Actor 与 projection 不一致时，以 server projection 为准；客户端重新对齐。

## 客户端可以拥有

- 资产与场景锚点
- 动画状态机
- 相机与输入
- 插值与表现性路径
- `ClientVisualManifest`（placeId / resident visual profile → asset）
- `IWorldProjectionSource` 的传输实现（HTTP poll / 未来 SSE）

## 与 Kernel / Scheduler / Life Engine 的关系

| 层           | 职责                                           |
| ------------ | ---------------------------------------------- |
| Scheduler    | WHEN                                           |
| Life Engine  | WHAT                                           |
| World Kernel | CAN / COMMIT                                   |
| Client       | OBSERVE / PRESENT / SUBMIT INTENT（V0 仅观察） |

V0 客户端没有 Player Character，不提交 ActionRequest。未来 Embodied Mode 只预留架构位，不实现。
