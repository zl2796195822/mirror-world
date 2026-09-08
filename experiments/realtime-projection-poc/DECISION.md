# EXP-REALTIME-001: 决策与架构结论 (DECISION)

> **任务编号**: EXP-REALTIME-001  
> **状态**: COMPLETED  
> **本文件为 12 项强制决策问题的正式裁定书。**

---

### 1. Colyseus 评级结论
**【RECOMMEND (有条件推荐 / CONDITIONAL WITH BOUNDARIES)】**  
在恪守“只读投影”前提下推荐使用。Colyseus 具备极佳的二进制增量同步性能、成熟的客户端 SDK 与完善的会话生命周期管理，完全胜任镜界未来的实时观察层。

### 2. 是否适合作为 Realtime Projection Layer？
**【是 (YES)】**  
非常适合。Colyseus 的 Room State 与 `@colyseus/schema` 二进制增量同步能够以微秒级的开销将 World Kernel 产生的确定性事实与坐标流投影给成百上千个在线 Web 浏览器与 3D 客户端。

### 3. 是否绝对不应作为 Durable Truth？
**【绝对不应 (ABSOLUTELY NOT)】**  
镜界的持久真理唯一源是 **PostgreSQL**，事实唯一写入口是 **World Kernel**，事实历史是 **Event Ledger**。Colyseus 属于易失性纯内存网络层，其内部状态随时可以丢弃并重新计算，严禁承载持久事实。

### 4. 30 Entities 可行性
**【完全可行 (HIGHLY FEASIBLE)】**  
实测 30 实体在 20Hz 同步下，单客户端出站仅 10.9 KB/s，服务端 CPU 开销小于 5%，内存占用小于 25MB，性能富余极大。

### 5. 100 Entities 可行性
**【完全可行，强烈建议配合 AOI (FEASIBLE WITH AOI)】**  
全局广播下 100 实体网络出站达 554.7 KB/s；引入简易 10×10 Spatial Grid 进行 AOI 视口裁剪后，出站带宽剧降至 59.0 KB/s（**节省 89.4%**），每个观察者单 Tick 仅处理 ~10 个视野内实体，单机承载力大幅跃升。

### 6. 100 Clients 可行性
**【完全可行 (FULLY FEASIBLE)】**  
100 并发客户端实测推送吞吐 1,963 msg/s，出站吞吐 1.07 MB/s，平均延迟仅 2.91ms，P95 延迟 4.65ms，事件循环延迟 11.87ms，CPU 占用仅 25.4%。

### 7. Reconnect 策略
**【推荐 Token-based Session Reservation + Fresh Snapshot 刷新】**  
- 客户端短时失联（≤ 5秒）：利用 Colyseus 内置 `allowReconnection` 无缝重连。
- 重连成功后：直接获取最新全量投影快照（Fresh Snapshot），无需在服务端维护复杂的增量差量重放缓冲区（Delta Buffer），逻辑极简且彻底免疫时序漂移。

### 8. Restart 恢复策略
**【从 Authoritative Source 100% 重建 Room】**  
当 Realtime 进程发生故障重启时，内存状态全部丢失。新进程通过 Adapter 直接向 World Kernel / 模拟权威源请求当前世界的 Active Snapshot 灌入 Room，客户端重新拉起并刷新。实测证明服务重启对世界事实无任何破坏。

### 9. AOI 推荐方案
**【在 Projection Layer 实施轻量级 Spatial Grid (20m 格子)】**  
参考 `RES-M2-OSS-001` 中 OpenClaw World 的空间分区设计：
- 每 Tick 或每秒数次清空并重建单元格索引（$O(N)$）。
- 根据客户端注视点坐标与视野半径动态查询兴趣集。
- **空间索引代码严格限制在网络投影层，禁止侵入 World Kernel 核心。**

### 10. 建议同步频率与性能预算
**【分层动态频率 (Layered Frequency Budget)】**:
1. **高频连续位置 (Continuous Transform)**: **15Hz ~ 20Hz**（客户端利用插值平滑补全到 60fps），严禁上冲 60Hz 广播。
2. **行为状态与意图 (Activity / Intent)**: **Event-driven (事件驱动)**，发生变更时瞬时下发。
3. **低频静态/元数据 (Profile / Attributes)**: **按需变更时同步**或初次进入 AOI 视口时单次下发。
4. **视野之外 (Out-of-AOI)**: **0Hz**，完全剔除。

### 11. M7 是否建议使用？
**【建议使用 (RECOMMENDED FOR M7 START)】**  
M7（第一条街 Web 3D 展现）初期建议采用 `Colyseus Room State` 作为从 World Kernel 到 React Three Fiber 的官方推荐投影层，能够大幅压低自研实时网络层的不确定性。

### 12. M8 是否需要进一步实验？
**【是 (YES)】**  
当 M8 迈向千人规模与多区域分布式街区时，需进一步针对以下课题展开专题实验（EXP-REALTIME-002）：
1. Redis Presence 跨节点房间路由与分片扩容。
2. 跨格移动时的实体边界平滑切换（Handoff）。
3. WebTransport / UDP 二进制通道对 WebSocket 的性能替代可行性。
