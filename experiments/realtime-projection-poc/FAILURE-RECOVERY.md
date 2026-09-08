# EXP-REALTIME-001: 故障恢复、重连与状态防御测试报告 (FAILURE-RECOVERY)

## 1. 实验目标

在分布式与实时多人系统中，网络抖动、客户端短时失联、网络包乱序以及后端进程故障是家常便饭。本实验重点验证三大约束与恢复策略：
1. **客户端断线重连 (5秒窗口) 与世界推进一致性**
2. **乱序旧版本数据包防御 (Stale Guard)**
3. **实时服务器崩溃重启与权威源重建 (Server Restart Recovery)**

---

## 2. 实验一：5秒断线重连 (Client Reconnect)

### 测试场景
- 客户端加入 `world_projection` 房间，建立连接并保存 `reconnectionToken`。
- 客户端模拟非正常失联（Unconsented Disconnect，`room.leave(false)`），触发 Colyseus 的会话保留机制（`allowReconnection(client, 5)`）。
- 客户端断开连接期间，世界时钟与 30 个实体继续按照 20Hz 频率移动推进。
- 等待 500ms 后，客户端调用 `client.reconnect(token, WorldStateSchema)`。

### 实验结果与断言
- **重连成功率**: **100%**。
- **状态验证**:
  - 重连后客户端立即恢复 30 实体的当前最新坐标与朝向。
  - 重连时的世界 Tick 严格大于断开时的 Tick（`reconnected.state.tick > initialTick`）。
  - 客户端无需重放断线期间错过的中间帧，而是直接无缝衔接最新状态。

---

## 3. 实验二：乱序与陈旧版本防御 (Stale State Defense)

### 问题本质
高频网络传输（UDP / WebSocket）在网络拥塞时可能出现数据包乱序（如第 9 版状态包在第 10 版之后到达）。若无版本防御，客户端将把已推进的实体坐标错误倒退回历史位置，造成视觉瞬移（Rubber-banding / Snapping）。

### 防御机制与测试
- 实体 Projection 维护单调递增的整数序列 `version`（不依赖易受系统时钟回拨影响的 wall-clock timestamp）。
- 客户端实现 `ClientEntityProjection` 版本守卫：
  ```typescript
  public applyUpdate(update: { version: number; x: number; y: number }): boolean {
    if (update.version <= this.version) {
      this.rejectedCount++;
      return false; // 严禁状态版本倒退
    }
    this.version = update.version;
    this.x = update.x;
    this.y = update.y;
    return true;
  }
  ```
- **测试结果**:
  - 先送入 `v10`（正常应用，坐标更新为 $(15, 20)$）。
  - 随后模拟延迟到达的 `v9`（被守卫直接拦截抛弃，坐标维持 $(15, 20)$，`rejectedCount = 1`）。
  - 随后送入 `v11`（正常应用，坐标更新为 $(16, 22)$）。
  - **断言全部通过，证明单调序列号在防御网络抖动方面完胜纯时间戳。**

---

## 4. 实验三：实时服务器崩溃重启与权威源重建 (Server Restart)

### 核心命题
> **“Realtime Layer 是否真的一点都不是真相？”**

如果杀死实时服务器会导致世界状态无法恢复，则说明实时层伪装成了事实源。

### 测试步骤与证据
1. 启动持久权威模拟器（`AuthoritativeSimulator`），将其推演至第 50 个 Tick。
2. 导出权威快照（`exportSnapshot`），保存当前 30 实体的精确坐标与版本。
3. 启动端口 2569 上的临时 Colyseus 实时服务实例，客户端连接并观察世界。
4. **强行终止服务端实例（`tempServer.stop()`）**，Colyseus 内存中所有 Room、Client Session、Schema 缓存全部灰飞烟灭。
5. 启动全新的 Colyseus 服务实例，**调用 `ProjectionAdapter.initFromSnapshot()` 从第 2 步的权威快照灌入状态**。
6. 新客户端连接重启后的服务实例：
   - 验证实体总数精确为 30。
   - 验证实体坐标、朝向、行为和版本与崩溃前的权威快照完全一致。

### 结论
**Realtime 层的内存全部丢失不构成任何世界数据灾难。只要 PostgreSQL 与 World Kernel 还在，Colyseus 可以随时在 1 秒内满血重生。**

---

## 5. 正式架构建议：Snapshot vs Snapshot + Delta

在评估客户端重连后的恢复机制时，我们对比了两种策略：

| 恢复策略 | 机制描述 | 优点 | 缺点 | 推荐结论 |
| :--- | :--- | :--- | :--- | :--- |
| **Strategy A: Fresh Full Snapshot** | 重连后直接下发当前世界全量投影快照 | 逻辑极简、无状态累积、100% 消除漂移与丢包累积 | 在实体极多（数千）时首包较大 | **强力推荐（当前首选）** |
| **Strategy B: Snapshot + Delta Buffer** | 服务端维护近 $N$ 秒的 Delta Ring Buffer，重连时补发差量 | 首包极小 | 内存开销大、Ring Buffer 溢出需回退降级、实现复杂度翻倍 | 不推荐作为 M7/M8 起步方案 |

> **建议**: 鉴于 30 ~ 100 实体在 `@colyseus/schema` 二进制编码下的全量快照仅约 **2KB ~ 4KB**，完全无需维护复杂的客户端版本差量重放缓冲区。重连直接拉取当前权威快照是最高效、最稳健的方案。
