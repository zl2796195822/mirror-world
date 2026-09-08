# EXP-REALTIME-001: 实验架构与世界真相隔离规范 (ARCHITECTURE)

## 1. 三层世界状态概念分层

镜界作为 Persistent Digital Society，状态必须严格划分为三层，绝不允许层级倒置：

```
┌────────────────────────────────────────────────────────┐
│ 1. Authoritative Fact (权威世界事实)                    │
│    · 存储: PostgreSQL (worlds, world_events, etc.)     │
│    · 规则: 仅 World Kernel 事务可写，严格单调 world_seq  │
│    · 特征: Durable Truth, Append-only Ledger           │
└───────────────────────────┬────────────────────────────┘
                            │ 权威事件流 / 周期性 Snapshot
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Projection View (世界投影视图)                      │
│    · 职责: 权威事实的高性能衍生只读读取模型             │
│    · 规则: 随时可丢弃、可基于 Event Ledger 100% 重建   │
│    · 特征: Read-Only, Derived Model, Ephemeral Cache   │
└───────────────────────────┬────────────────────────────┘
                            │ 状态同步 / AOI 视口增量裁剪
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Ephemeral Realtime State (网络实时瞬态)             │
│    · 载体: Colyseus Room State / WebSocket Buffer      │
│    · 内容: 客户端连接 Session、视口坐标、Ping、插值缓冲  │
│    · 特征: 纯内存瞬态，服务重启全部丢失，绝非真实世界事实 │
└────────────────────────────────────────────────────────┘
```

---

## 2. 实验目标拓扑结构

```
[ Authoritative Source Simulator ] (确定性 20Hz 模拟器 Fixture, Mulberry32 Seed=42)
               │
               │  WorldProjectionEvent 流 (POSITION_UPDATED, ACTIVITY_CHANGED, etc.)
               ▼
      [ Projection Adapter ]
         ├── 区分 Domain Event 与 Presentation Coordinate Tick
         ├── 维护只读 Projection State
         └── [ Fake ActionRequest Gateway / Command Stub ]
               ▲
               │  Client Action Request (STUB ONLY)
               │
      [ Colyseus Realtime Room ] (WorldProjectionRoom / AoiProjectionRoom)
         ├── 二进制 Schema 增量计算 (@colyseus/schema)
         ├── 客户端会话管理与 5 秒 Reconnect 预约
         └── Spatial Grid AOI 兴趣集过滤 (10x10 格子)
         │           │           │
         ▼           ▼           ▼
    [Client A]   [Client B]   [Client C] (Synthetic Clients & Minimal R3F Viewer)
```

---

## 3. 事件分类与 Event Ledger 映射

本实验在 `ProjectionAdapter` 中对世界产生的数据流建立了明确的边界划分：

| 事件类型 | 性质分类 | 是否写入正式 Event Ledger？ | 同步与处理策略 |
| :--- | :--- | :--- | :--- |
| `ENTITY_ENTERED` / `ENTITY_LEFT` | **Authoritative Domain Event** | **是** | 持久化入库，分配全局 `world_seq`，广播通知客户端生命周期变更 |
| `ACTIVITY_CHANGED` | **Authoritative Domain Event** | **是** | 持久化入库，记录状态机流转原因、时间与因果 |
| `DESTINATION_TARGET_CHANGED` | **Authoritative Domain Event** | **是** | 记录意图或寻路路点改变，频率低（通常数秒一次） |
| `POSITION_UPDATED` (连续移动坐标) | **Presentation Realtime Update** | **绝对禁止** | **仅在内存中作为高频呈现增量**，绝不能每 50ms 刷写一次数据库账本 |

> **关键规则**:
> 严禁将每秒 20 次的浮点坐标全量写入 PostgreSQL 的 `world_events`。高频位移属于**运行时物理/视觉呈现过程**，唯有位移关键帧、到达目标点、状态变更等高阶事实才具备领域审计价值。

---

## 4. 权限与事实写入边界 (Authority Isolation)

在整个实验实现中，严格落实以下防线：

1. **禁止 `room.onMessage(...)` 直接修改世界数据**：
   - 当客户端在 Web 或 3D 界面发起动作时，调用 `request_action`。
   - `WorldProjectionRoom` 将请求交由 `ProjectionAdapter.handleClientActionRequest`。
   - 适配器仅记录：
     ```json
     {
       "accepted": true,
       "status": "QUEUED_FOR_KERNEL_VALIDATION",
       "message": "Command stub received: action routed to Kernel validation pipeline, realtime layer does not mutate world facts directly"
     }
     ```
   - Colyseus 房间内的实体状态、坐标、版本均**未发生任何违规篡改**。

2. **单向数据流原则**：
   - 世界状态变更：只能由 `AuthoritativeSimulator`（模拟 World Kernel）推进。
   - 变更通知：单向流入 `ProjectionAdapter`，再由 `WorldProjectionRoom` 推送给订阅客户端。
   - 客户端只能“观察”投影，不能“写入”投影。

---

## 5. 崩溃恢复原则 (Crash & Rebuild)

本实验设立的关键断言：
> **如果杀死实时同步服务器会导致世界事实永久丢失，则该架构判定为不合格。**

实验通过 `Server Restart Recovery` 测试验证：
- 强制关停运行中的 Colyseus 实例，其所有内存状态全部清空。
- 启动新的 Colyseus 实例。
- 新实例通过 `ProjectionAdapter.initFromSnapshot()`，直接从持久/权威源（`AuthoritativeSimulator` 快照）拉取全量事实并重新灌入 Room。
- 客户端重新连接后，获得与崩溃前完全一致的实体版本与世界时间。
- **结论成立：Colyseus 实时层是完全无状态、可随时重建的投影转发器。**
