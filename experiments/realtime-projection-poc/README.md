# EXP-REALTIME-001: Realtime World Projection / Colyseus PoC

> **实验编号**: EXP-REALTIME-001  
> **实验名称**: Realtime World Projection / Colyseus PoC  
> **任务类型**: TECH SPIKE / EXPERIMENT ONLY  
> **状态**: COMPLETED (VALIDATED)  
> **执行分支**: `exp/realtime-projection-poc`  
> **隔离工作区**: `../mirror-world-realtime-poc`

---

## 1. 实验定位与核心命题

镜界（Persistent Digital Society）的核心基础设施已经确定：
- **PostgreSQL**: Durable Truth（持久事实源）
- **World Kernel**: 世界事实唯一写入口（Transaction + Sequence Guard）
- **Event Ledger**: 权威世界事实历史（Append-only Event Log）

未来浏览器、Web 3D 世界（如 M7/M8）和在线观察者需要：
- 低延迟
- 实时增量推送
- 断线平滑重连
- 局部视野（AOI）过滤

**本实验的核心命题**：
> “是否适合使用 Colyseus 或类似实时状态层，把 World Kernel / Event Ledger 的权威事实安全投影给在线客户端？”

### 不可破坏边界（Inviolable Boundaries）
1. **Realtime Layer ≠ World Truth**: 实时层仅为只读投影（Read-Only Projection View）。
2. **Colyseus 永远不能成为**:
   - Durable Truth（持久事实）
   - World Authority（世界权威决策者）
   - 事实写入口（Fact Write Entrance）
3. **客户端严禁直接 Mutate 世界事实**：客户端向 Colyseus 发送的动作仅由 Command Stub / Gateway 记录排队状态，不直接改写事实。
4. **本任务不是 M3、M7 或 M8 正式开发**，不引入真实居民、Life Engine、记忆或经济系统。

---

## 2. 目录结构

```text
experiments/realtime-projection-poc/
├── README.md                     # 本说明文档
├── ARCHITECTURE.md               # 实验架构与世界真相隔离规范
├── RESULT.md                     # 实验全景结论汇总
├── BENCHMARK.md                  # 1~200 并发客户端压力测试报告
├── AOI-BENCHMARK.md              # 100 实体 Spatial Grid 与 AOI 广播报告
├── FAILURE-RECOVERY.md           # 5秒断线重连、服务崩溃恢复与乱序版本拒绝
├── DECISION.md                   # 12项关键决策强制答卷
├── THIRD_PARTY_EXPERIMENT.md     # Colyseus 第三方选型评估与对比
├── package.json                  # 独立实验依赖与脚本
├── tsconfig.json                 # TypeScript 编译配置
├── eslint.config.js              # ESLint 代码规范
├── vite.config.ts                # 前端 Vite 配置
├── index.html                    # 极简 Web 入口
├── patches/                      # pnpm 依赖安全补丁
├── server/
│   ├── index.ts                  # Colyseus 服务端入口
│   ├── simulator/                # 确定性权威源模拟器（30 & 100 Dummy Entities）
│   │   ├── authoritative-simulator.ts
│   │   └── types.ts
│   ├── schema/                   # Colyseus 增量状态 Schema
│   │   └── WorldState.ts
│   ├── adapter/                  # 事件投影适配器与 Command Stub 网关
│   │   └── projection-adapter.ts
│   ├── rooms/                    # Colyseus 房间实现
│   │   ├── WorldProjectionRoom.ts
│   │   └── AoiProjectionRoom.ts
│   ├── aoi/                      # Spatial Grid 空间索引与视口过滤
│   │   └── spatial-grid.ts
│   └── tests/                    # 单元与集成测试套件
│       ├── simulator.test.ts
│       ├── spatial-grid.test.ts
│       └── sync-lifecycle.test.ts
├── scripts/                      # 压测与自动化脚本
│   ├── stress-benchmark.ts       # 1/10/30/100/200 客户端压测
│   ├── aoi-benchmark.ts          # Global vs AOI 空间广播压测
│   └── capture-screenshot.ts     # 无头浏览器截图与控制台 0 错误验证
├── src/                          # 极简 R3F 3D 客户端
│   ├── App.tsx                   # 3D 场景、HUD 指标与交互测试
│   ├── main.tsx
│   └── styles.css
└── screenshots/                  # 真实运行截图证据
    ├── desktop-projection-30-entities.png
    ├── mobile-projection.png
    └── action-stub-and-reconnect.png
```

---

## 3. 快速启动与验证命令

在 `experiments/realtime-projection-poc/` 目录下执行：

```bash
# 1. 安装依赖
pnpm install

# 2. 代码检查与类型检查
pnpm lint
pnpm typecheck

# 3. 运行核心集成测试套件 (11/11 PASS)
pnpm test

# 4. 运行 1~200 客户端高压基准测试
pnpm run benchmark:stress

# 5. 运行 100 实体 Spatial Grid AOI 广播基准测试
pnpm run benchmark:aoi

# 6. 前端静态构建
pnpm run build

# 7. 运行生产依赖安全审计 (HIGH=0, CRITICAL=0)
pnpm audit --prod --registry=https://registry.npmjs.org

# 8. 启动服务端与前端预览 (用于手动交互)
pnpm run server
pnpm run dev
```

---

## 4. 关键验证指标速览

| 实验项目 | 验证结果 | 关键数据 / 结论 |
| :--- | :--- | :--- |
| **30 Dummy Entities 同步** | **PASS** | 20Hz 稳定同步，首帧 Initial Snapshot，后续二进制增量补丁 |
| **100 实体 AOI 广播** | **PASS** | 带宽节省 **89.4%**（554.7 KB/s → 59.0 KB/s），消息负载减少 **89.7%** |
| **1~200 客户端并发压测** | **PASS** | 200 客户端下 CPU 25.3%，延迟 P95 10.13ms，Loop Delay 11.52ms |
| **5秒断线重连 (Reconnect)** | **PASS** | 客户端利用 Token 无缝重连，世界时间继续前进，自动刷新权威投影 |
| **服务端崩溃重启恢复** | **PASS** | 内存状态全清空后重新从权威源灌入，证明实时层非真相 |
| **乱序旧版本防御 (Stale Guard)** | **PASS** | 单调版本号防御机制，自动拒绝旧版本覆盖 |
| **权限与写事实隔离** | **PASS** | 客户端动作被拦截并进入 Stub Gateway 排队，严禁修改世界事实 |
| **R3F 3D 客户端接入** | **PASS** | 30 实体变换渲染正常，浏览器 Console **0 experiment-owned errors** |
| **依赖安全审计** | **PASS** | `HIGH=0, CRITICAL=0` |
