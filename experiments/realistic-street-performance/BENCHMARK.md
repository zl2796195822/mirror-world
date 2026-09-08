# EXP-3D-002 基准性能测试报告 (Benchmark Report)

本文件记录在真实青禾街场景负载、PBR 材质、动态天气系统、1~30 VRM 虚拟居民压力下，在桌面端与移动端视口测得的真实性能指标。

---

## 1. 测试环境与测量条件

- **浏览器**：Google Chrome `152.0.7977.77` (Headless via CDP)
- **操作系统**：macOS (Apple Silicon, Metal GPU 加速)
- **桌面视口**：`1440×900`，DPR = 1.0
- **移动视口**：`390×844`，DPR = 2.0 (Mobile Emulation)
- **服务模式**：本地静态构建预览 (`vite preview --host 127.0.0.1:5174`)
- **数据采集方式**：Three.js `WebGLRenderer.info` 实时硬件指标 + 浏览器 Navigation Timing + `performance.memory` (JS Heap)

---

## 2. 桌面端核心性能矩阵 (Desktop 1440×900)

| 场景用例 | 天气 | VRM 规模 | LOD 策略 | 瞬时/均帧率 | 均帧时间 | P95 帧时 | Draw Calls | 可见面数 (Tris) | 纹理数 | 几何体数 | JS Heap | 首屏渲染 (First Scene) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **空场景基线** | Day | 0 | Dynamic | **60 FPS** | 16.7ms | 17.7ms | 110 | 18,020 | 11 | 68 | 43.7 MB | 571ms |
| **基础小街** | Day | 5 | Dynamic | **63 FPS** | 15.8ms | 16.0ms | 310 | 719,180 | 39 | 77 | 83.8 MB | 437ms |
| **中等街道** | Day | 15 | Dynamic | **67 FPS** | 14.9ms | 15.3ms | 610 | 1,900,644 | 39 | 82 | 88.7 MB | 413ms |
| **高密度街区 (LOD 优化)** | Day | 30 | Dynamic | **70 FPS** | 14.2ms | 14.4ms | 986 | 3,300,412 | 39 | 81 | 120.3 MB | 432ms |
| **高密度街区 (强制全量 VRM)** | Day | 30 | Force L0 | **71 FPS** | 14.2ms | 14.5ms | 1062 | 3,404,540 | 39 | 81 | **137.5 MB** | 424ms |
| **夜景中压** | Night | 5 | Dynamic | **63 FPS** | 15.8ms | 16.1ms | 310 | 719,180 | 39 | 80 | 216.3 MB | 423ms |
| **夜景高压** | Night | 30 | Dynamic | **69 FPS** | 14.1ms | 14.3ms | 986 | 3,300,412 | 39 | 81 | 219.9 MB | 387ms |
| **雨天中压** | Rain | 5 | Dynamic | **63 FPS** | 15.9ms | 16.0ms | 311 | 719,180 | 39 | 82 | 190.2 MB | 446ms |
| **雨天高压** | Rain | 30 | Dynamic | **70 FPS** | 14.2ms | 15.1ms | 923 | 2,929,028 | 39 | 81 | 279.0 MB | 443ms |

> **关键观察**：
> 1. 单个高质量 VRM 模型在镜头内时，带来约 **200~300 个 draw calls** 与 **700,000 个面片** 的巨大开销。
> 2. 当 30 个 VRM 处于场景内时，Draw Calls 从空场景的 110 次激增到 **986~1062 次**，面片数突破 **330 万面**。
> 3. 雨天由于包含 2400 个动态雨丝粒子与高反射 PBR 材质，内存升至 **279.0 MB**。

---

## 3. 硬件实例化对比 (Instancing Benchmark)

在桌面 5 个 VRM 相同机位对比：

| 模式 | Draw Calls | GPU 几何体数 (Geometries) | 渲染面数 (Triangles) | 平均帧耗时 | 收益分析 |
|---|---|---|---|---|---|
| **开启 Instancing** (`instancing=true`) | **310 calls** | **77** | 719,180 | 15.8ms | 树木、路灯、空调外机、路桩全部批量合并渲染 |
| **关闭 Instancing** (`instancing=false`) | **375 calls** | **136** | 707,044 | 15.9ms | 多产生 **65 次 Draw Calls** 与 **59 个独立几何体** |

---

## 4. 移动端视口验证 (Mobile 390×844)

| 场景配置 | FPS | 均帧时间 | P95 帧时 | Draw Calls | 可见面数 | 显存/内存 | 页面滚动溢出 |
|---|---|---|---|---|---|---|---|
| **移动 5 VRM** | **71 FPS** | 15.2ms | 16.3ms | 35 calls | 11,510 tris | 252.8 MB | `scrollWidth = 390` (无溢出) |
| **移动 30 VRM (LOD)** | **70 FPS** | 13.7ms | 14.5ms | 35 calls | 11,510 tris | 188.4 MB | `scrollWidth = 390` (无溢出) |

> **移动端边界结论**：
> 视口模拟下通过响应式触控验证，且布局无溢出。但**严禁将 Chrome 390px 视口判定为移动端性能及格**（详见 `MOBILE.md`，真机状态定为 `PHYSICAL MOBILE DEVICE = UNVERIFIED`）。

---

## 5. 产物包体积与传输分析 (Production Bundle)

基于独立 `vite build` 产物分析：

| 产物文件 | 原始体积 (Raw) | Gzip 压缩后体积 | 说明 |
|---|---|---|---|
| `dist/assets/index-*.js` | 3,638.30 kB | **1,232.03 kB** | 包含 React 19、Three.js、R3F、Rapier、Ecctrl 与 Three-VRM |
| `dist/assets/index-*.css` | 4.64 kB | **1.63 kB** | 实验调试 HUD 与移动端触控样式 |
| `dist/index.html` | 0.55 kB | **0.39 kB** | HTML 入口 |
| `public/models/VRM1_*.vrm` | 10,879.54 kB | 10.88 MB (二进制) | 测试 VRM 人物资产 |
| `public/textures/*.png` | 1,048.58 kB | 1.05 MB (二进制) | 10 张 PBR 纹理贴图总和 |
| `public/basis/basis_transcoder.wasm` | 527.33 kB | **248.94 kB** | KTX2 客户端转码运行时 |
| `public/draco/draco_decoder.wasm` | 285.74 kB | **89.66 kB** | Draco 几何解压运行时 |

---

## 6. 控制台日志审计 (Console Audit)

- **Console Errors**：**0** (完全无报错)
- **Console Warnings**：24 项，全部为依赖链内部弃用提示（如 `THREE.Clock` 与 `THREE.Vector3.setEulerFromRotationMatrix`），不影响渲染管线与运行稳定性。
