# EXP-3D-002 · Realistic Street Assets / VRM / LOD / Streaming Performance PoC

这是「镜界 / Persistent Digital Society」的独立 Web3D 性能与架构实验，**不是 M7 正式开发**。

本实验在前置实验 `EXP-3D-001`（技术骨架可行性验证）的基础上，深入回答：**在引入更接近真实青禾街的负载（写实 PBR 资产、动态天气光照、VRM 人物骨骼动画、硬件实例化、空间串流与 Visual LOD）后，Web 端是否依然能够维持可接受的性能水平？**

---

## 1. 运行与操作

### 本地启动
```bash
cd experiments/realistic-street-performance
pnpm install
pnpm dev
```
打开 `http://127.0.0.1:5173/`。

### URL 实验参数支持
- **天气切换**：`?weather=day`（白天阴天）、`?weather=night`（夜晚点光源）、`?weather=rain`（暴雨与湿滑反射）
- **居民规模**：`?actors=0`、`5`、`15`、`30`
- **LOD 控制**：`?lod=true`（三级 Visual LOD 开启）、`?lod=false`（强制全量 VRM 压力测试）
- **实例化控制**：`?instancing=true`（硬件 InstancedMesh 批处理）、`?instancing=false`（独立 Mesh 对比）

示例：`http://127.0.0.1:5173/?weather=rain&actors=30&lod=true`

### 交互操作
- **键盘**：WASD / 方向键移动，Shift 跑步冲刺，Space 跳跃
- **鼠标**：拖拽旋转第三人称镜头
- **移动端触控**：`390×844` 视口下显示方向虚拟按键与跑步按钮

---

## 2. 核心实验能力

1. **场景写实度还原（对照 A01 母版与 C01~C04 参考图）**：
   - 300m × 300m 中国南方现代普通城市街区（临江市 · 青禾街区）；
   - 包含沥青主路（PBR 凹凸法线贴图）、黄色双实线、人行道方砖与黄色导盲盲道、斑马线、雨水井盖；
   - 转角青禾咖啡（木纹立面、发光 "coffee" 艺术招牌、大面积落地透光玻璃、室外木质休闲台与 3 阶入口台阶）；
   - 拾光便利店（开敞式门头、冷柜与商品陈列货架）；
   - 商务办公大厦（蓝灰反射幕墙）、住宅群（水泥抹灰外立面、挂装空调室外机）；
   - 公交站候车亭（绿色 LED 到站预报屏、长椅）。
2. **动态天气压力 (Weather Stress)**：
   - **Day**：漫射日光与浅灰天空雾；
   - **Night**：路灯光斑投射、店铺暖色光溢出、暗夜氛围；
   - **Rain**：2400 个动态雨丝粒子、路面粗糙度骤降（0.08）与镜面反射增强。
3. **VRM 虚拟居民与 Visual LOD**：
   - 官方 MIT 样本 `VRM1_Constraint_Twist_Sample.vrm`；
   - 骨骼动画采用步态相位确定性偏移（Phase Offset），零 `Math.random()`；
   - 三级 Visual LOD：LOD0（近景 25m 全量更新）、LOD1（中景 45m 骨骼降频 20FPS）、LOD2（远景无骨骼极简代理）；
   - Avatar 就近分配升降级（Lazy Loading）。
4. **硬件实例化 (Hardware Instancing)**：
   - 行道树、路灯杆、空调室外机与石桩全面采用 `THREE.InstancedMesh` 合并渲染，直降 65 次 Draw Calls。
5. **空间串流 (Scene Chunking)**：
   - 街区划分为 Zone A（核心十字路口/出生点）、Zone B（北区商务办公）与 Zone C（南区公园公交站）；
   - 动态距离感应加载，配备 20m 空间滞后缓冲（Hysteresis）。
6. **压缩技术实测评估**：
   - 纹理：KTX2 / Basis Universal（UASTC 与 ETC1S）节省 99% 传输体积与 75%~87% VRAM；
   - 几何：对比 Google Draco 与 Meshopt，验证 Meshopt 在轻量解码与 SIMD 流式解压上的巨大优势。
7. **Ecctrl 复杂地形验证**：
   - 验证了角色拾级而上（咖啡店 3 阶台阶）、沿 15° 斜坡行走、以及在 1.8m 狭窄小巷中的碰撞表现；
   - 修复了薄地面刚体在掉帧时的物理穿透缺陷，加厚为 20m 地下防穿透刚体。

---

## 3. 验证命令

在 `experiments/realistic-street-performance/` 目录下：

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod --registry=https://registry.npmjs.org
```

自动化基准与截图抓取：
```bash
node scripts/run-benchmarks.mjs
```

---

## 4. 实验报告与证据目录

- [RESULT.md](./RESULT.md)：总体实验结果与技术观察
- [BENCHMARK.md](./BENCHMARK.md)：全量桌面与移动视口测试矩阵、帧率、面数与内存
- [ASSET_REGISTER.md](./ASSET_REGISTER.md)：全部模型、贴图与测试样件的开源许可证与哈希登记
- [LOD.md](./LOD.md)：Visual LOD 三级分级策略与 30 VRM 瓶颈分析
- [STREAMING.md](./STREAMING.md)：Zone A/B/C 空间串流与首屏载入
- [COMPRESSION.md](./COMPRESSION.md)：KTX2 显存压缩与 Draco vs Meshopt 评测
- [MOBILE.md](./MOBILE.md)：移动端视口验证与局域网物理真机测试指南
- [DECISION.md](./DECISION.md)：13 项核心架构回答与最终决策
- [THIRD_PARTY_EXPERIMENT.md](./THIRD_PARTY_EXPERIMENT.md)：直接第三方包版本、角色与安全审计
- 截图证据：
  - [screenshots/day.png](./screenshots/day.png)：白天全景与 5 VRM
  - [screenshots/night.png](./screenshots/night.png)：夜景路灯与商铺溢光
  - [screenshots/rain.png](./screenshots/rain.png)：雨天湿滑反射与雨丝粒子
  - [screenshots/5-vrm.png](./screenshots/5-vrm.png)：5 角色街区
  - [screenshots/15-vrm.png](./screenshots/15-vrm.png)：15 角色中等密度
  - [screenshots/30-vrm.png](./screenshots/30-vrm.png)：30 角色 Visual LOD 高密度街区
  - [screenshots/mobile.png](./screenshots/mobile.png)：390×844 移动端触控与布局

---

## 5. 隔离与红线保证

- **分支**：`exp/realistic-street-performance`
- **Worktree 路径**：`../mirror-world-realistic-street`
- **代码收敛**：全部文件严格限制在 `experiments/realistic-street-performance/` 内部
- **业务未触碰**：未修改正式 `apps/web`，未连接 World Kernel、PostgreSQL、Redis、Life Engine、Event Ledger 或居民业务逻辑
- **Git 规则**：不合并进入 `main` 分支
