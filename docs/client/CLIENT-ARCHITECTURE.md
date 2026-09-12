# CLIENT-ARCHITECTURE

基线：`origin/main = b774533`（2026-09-12 后 runner remediation remote CI closure）。  
M3：`IN_PROGRESS`。公开 Client API：不存在。

## 仓库审计摘要

### 仓库形态

- monorepo：`pnpm` + Turborepo
- `apps/web`：Next.js App Router 产品壳（M1），深色低密度，路由为 home / world / residents / events / settings
- `apps/api`：Fastify + OpenAPI
- `packages/contracts`：Action / Observation / Runtime / Outcome / Replan / Scheduler 契约
- `packages/db`：Drizzle schema、seed、runtime state
- `packages/world-kernel`：clock、ledger、validator、executor、scheduler、replay/projection
- `packages/life-engine`：needs / goals / rule decision / action loop

### 当前公开 API

| Method | Path                                 | 能力                      |
| ------ | ------------------------------------ | ------------------------- |
| GET    | `/api/v1/health`                     | 进程健康                  |
| GET    | `/api/v1/ready`                      | 依赖就绪                  |
| GET    | `/api/v1/worlds`                     | 世界元信息列表            |
| GET    | `/api/v1/worlds/:worldId`            | 世界时钟/状态             |
| POST   | `/api/v1/worlds/:worldId/admin/time` | development-only 时钟控制 |

没有公开的：

- resident read model API
- place API
- event ledger read API
- projection/replay API
- activity outcome causal evidence API
- SSE / WebSocket

### 已有内部能力（可被薄 Adapter 复用）

- `m3-resident-projection-v2`：`@mirror/world-kernel` typed replay reducer
- typed events：MOVE/SLEEP/EAT/WORK/TALK STARTED/COMPLETED + WORLD_TIME_ADVANCED
- `resident_runtime_states`：location / activity durable read authority
- `getFirstStreetLocationFixtures(worldId)`：12 home + office/cafe/store/park/transit
- Observation contract：location/activity/work obligation 可为 AVAILABLE
- Action Outcome store：COMMITTED / REJECTED / CONFLICT + event association
- Checkpoint / full replay / suffix replay / genesis rebuild（Gate 证据已存在，但是 package 内能力，不是公网 API）

### 实验输入（非生产 authority）

| 工作树                      | 可用结论                                                       |
| --------------------------- | -------------------------------------------------------------- |
| `mirror-world-first-street` | R3F + Rapier 可渲染 300m 第一条街 placeholder；Yuka 不推荐锁死 |
| `mirror-world-realtime-poc` | Projection 三层分层有价值；Colyseus 不自动成为 M7 authority    |
| `exp/*avatar*`              | 仅研究输入，不升级为正式身份系统                               |

## Client V0 如何获得可视状态：三种方案

### 方案 A — 直接复用当前 read APIs

从现有 `/worlds/:id` 与 package 内只读能力拼 Observer。

- 优点：几乎零新契约
- 缺点：没有 resident/place/event/projection 公开面；客户端会开始直接摸 DB 或复制 Kernel 逻辑
- 判定：不可作为 V0 主路径

### 方案 B — 增加薄的 Client Projection Adapter（推荐）

在 API 层新增临时 `client-projection-v0` 只读接口，内部组合：

- worlds clock
- first-street place fixtures
- resident seed + runtime state
- typed event ledger read
- M3 resident projection / observation snapshot
- outcome + recent events for causal evidence

- 优点：read-only、minimal、replaceable、不锁死正式 M7
- 缺点：V0 需要新增少量 API 路由与 DTO（设计允许；实现需 M3 PASS + 批准）
- 判定：**推荐**

### 方案 C — 正式 Realtime Projection Service

独立服务、WebSocket、AOI、持久 cursor。

- 优点：实时体验最好
- 缺点：提前固化 M7、成本高、与 M3 未关闭冲突
- 判定：V0 不做；只保留接口可替换位

## 产品形态方案比较

| 方案       | 描述                           | 速度 | 体验           | 架构风险 | 长期演进          | 个人成本 | M7 兼容                 |
| ---------- | ------------------------------ | ---- | -------------- | -------- | ----------------- | -------- | ----------------------- |
| A Web-only | Observer + 可选 R3F            | 快   | 读懂强、沉浸弱 | 低       | 易变观测工具      | 低       | 高                      |
| B UE-only  | 只做 3D                        | 中   | 沉浸强、读懂弱 | 中高     | 容易跳过 evidence | 高       | 中                      |
| C Hybrid   | Web Observer + UE First Street | 中   | 读懂 + 走进    | 中       | 最清晰            | 中高     | 高（若 Adapter 可替换） |

**推荐：Option C Hybrid。**

理由：

1. Observer 是“让我看见世界活着”的最短路径。
2. 3D 是“走进世界”的体验层，但不能替代 causal evidence。
3. 仓库已有 Next.js 产品壳，适合承载 Observer。
4. 用户目标包含原生 3D Client；UE 作为独立客户端轨道更干净。
5. M7 research 是 input，不阻止 V0 用临时 read-only Adapter。

## 推荐总体架构

```
Mirror World Server
  PostgreSQL
  World Kernel
  Event Ledger
  Life Engine / Scheduler
        │
  Client Projection Adapter (v0, temporary)
  IWorldProjectionSource
        │
  ┌─────┴─────┐
  ▼           ▼
Observer    UE Client
(Next.js)   (First Street)
```

### 服务端角色

- 提供只读 snapshot / places / residents / events / causal evidence
- 不接受客户端写世界事实
- 契约版本化：`client-projection-v0`

### Web Observer 角色

- 高信息密度系统观察工具
- LIVE / REPLAY 明确分离
- causal chain 是 V0 最重要功能之一

### UE Client 角色

- 表现真实世界状态
- placeId 绑定视觉锚点
- resident activity → animation
- Observer camera only

## Projection strategy

状态：`TEMPORARY V0 / NON_AUTHORITATIVE / REPLACEABLE`

不得宣称“正式 M7 Projection architecture 已完成”。  
未来正式 M7 到来时，只替换 `IWorldProjectionSource` 的传输与 DTO 映射，不重写 Observer 页面与 UE 表现层。

## 当前授权边界

| 项                                        | 值                                                 |
| ----------------------------------------- | -------------------------------------------------- |
| Client production implementation 合入主线 | **NO**                                             |
| 原因                                      | M3 Story Gate 未通过；需人工批准设计后另开实现会话 |
| 本轮允许                                  | 全部设计文档                                       |
