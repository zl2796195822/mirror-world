# EXP-REALTIME-001: 第三方依赖评估与多方案对比 (THIRD_PARTY_EXPERIMENT)

## 1. Colyseus 深入技术评估

| 评估维度 | 调研与实测结论 |
| :--- | :--- |
| **项目名称** | `Colyseus` / `@colyseus/core` |
| **版本核定** | 服务端核心：`@colyseus/core@0.16.26` + `@colyseus/ws-transport@0.16.5`；Schema 引擎：`@colyseus/schema@3.0.76`；客户端：`colyseus.js@0.16.22` |
| **开源许可证** | **MIT License**（完全兼容镜界商业与私有化诉求，无 Copyleft 传染风险） |
| **维护状态** | 高度活跃，GitHub 13k+ Stars，持续发布，具有完善的文档与社区 |
| **Node.js 兼容性** | 在 Node.js **v24.11.1** 上运行正常；对 `nanoid` 依赖通过标准 `patches/nanoid@3.3.18.patch` 解决了 ESM 兼容与漏洞警告 |
| **TypeScript 支持** | 原生一流支持，支持 `@type` 装饰器与类型推断 |
| **状态增量机制** | `@colyseus/schema` 基于位图（Bitmask）与二进制序列化，单实体更新仅需 9~18 字节，远优于 JSON Patch 或 raw msgpack |
| **房间生命周期** | 内置 `onCreate`、`onJoin`、`onLeave`、`onDispose`；支持 `autoDispose = false` 保持世界常驻投影 |
| **断线重连机制** | 内置 `allowReconnection(client, seconds)` 与客户端 Token 换取恢复，开箱即用 |
| **横向扩展能力** | 官方支持 `@colyseus/redis-presence` 与 `@colyseus/redis-driver`，支持多实例集群部署 |
| **Web 3D / R3F 集成** | 客户端监听 `room.onStateChange` 与实体 `onChange`，与 React Three Fiber `useFrame` 或状态映射无缝咬合 |

---

## 2. 三种实时技术路线全维度横向对比

| 评估维度 | 方案 A: Colyseus Room State (本实验方案) | 方案 B: 纯 WebSocket + 自研二进制投影 | 方案 C: Event Stream (SSE/WS) + 客户端 Cache |
| :--- | :--- | :--- | :--- |
| **开发复杂度** | **低 ~ 中**：内置 Schema 增量、房间会话、重连机制，免于造轮子 | **高**：需自行编写二进制 Diff、心跳、重连路由、会话状态机 | **中**：单向推送简单，但在多实体状态合成时客户端负担重 |
| **网络传输性能** | **极高**：内置二进制状态差异编码（30 实体 20Hz 仅 10~300 KB/s） | **可做到极高**：取决于自定义协议质量，但前期容易粗糙 | **较低**：若使用 JSON Event 则带宽极大；高频坐标推送容易膨胀 |
| **断线重连复杂度** | **极低**：自带 Token 重连与 Session 挂起窗口（5秒内无感恢复） | **中 ~ 高**：需自行在 Redis 维护 Session 与快照偏移 | **高**：需维护全局 Event Seq 补发，容易产生事件雪崩 |
| **水平扩展性 (Scale)** | **良好**：自带 Redis Presence，房间无状态化容易 | **取决于架构**：需自研网关与 Broker | **极佳**：只读 Event 流天然容易通过 CDN/边缘网关分发 |
| **调试与排错** | **良好**：官方提供 Monitor 控制台与 Inspector | **差**：私有二进制协议抓包与分析困难 | **极佳**：纯事件流文本易读，容易做回放审计 |
| **Web 3D / R3F 集成** | **极佳**：实体变更精确到单个字段，插值缓冲简单直接 | **良好**：需要自己对接 Three.js 变换 | **一般**：客户端需从事件逆向解析实时坐标 |
| **权威事实隔离性** | **优秀**：只要严禁在 room 挂写入口，仅作为 Projection 极度安全 | **优秀**：自研逻辑容易划定边界 | **天然优秀**：Event 流本身就是只读下游 |

---

## 3. 最终技术选型推荐

### 推荐结论：**方案 A（Colyseus Room State 作为有界投影层）**
- **理由**:
  1. 镜界的核心壁垒是 **World Kernel 与社会真实模拟**，不应该把研发资源浪费在手写二进制差量同步协议、WebSocket 连接心跳与会话重连管理上。
  2. Colyseus 的成熟度、性能表现与 MIT 许可证完全满足 M7/M8 要求。
  3. 只要严格执行本实验确立的**“Colyseus 仅作只读投影，禁止直接改写事实”**的红线规则，方案 A 在工程性价比、稳定性与开发周期上具有决定性优势。
