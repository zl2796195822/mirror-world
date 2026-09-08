# EXP-3D-002 移动端验证与真机调试指南 (Mobile Report)

---

## 1. 移动端真机状态明确声明

> [!WARNING]
> **PHYSICAL MOBILE DEVICE = UNVERIFIED**
> 
> 本实验由自动化环境与 Chromium 模拟环境执行，**并未接入物理真实的 iOS / Android 手机硬件**。
> 严禁将开发机 Chrome `390×844` 视口模式下的帧率与内存表现作为「移动端性能已及格」的结论。

---

## 2. 模拟视口已验证项目 (390×844 Viewport Emulation)

在 Chrome `390×844` (DPR = 2.0) 视口下已完成严格验证：

- **页面布局无溢出**：`scrollWidth = 390`，无横向或纵向异常滚动；
- **响应式 UI 适配**：指标面板缩小为 200px 紧凑布局，不会遮挡中央角色视线；
- **实验性触控控件**：
  - 屏幕左下方虚拟方向键（↑、←、→、↓）正常响应 `pointerdown` / `pointerup`；
  - 独立「跑」触控按钮正常调用 Ecctrl 跑步冲刺逻辑；
  - 画布配置 `touch-action: none`，单指拖拽镜头与多点触控未引发浏览器原生双击缩放或页面下拉刷新；
- **控制台状态**：0 实验代码错误。

---

## 3. 物理真机未覆盖的核心技术风险

1. **统一内存与系统杀后台 (Jetsam Kill)**：
   - iOS WebKit 对单个网页标签页的内存占用有严格阈值（通常在 300MB ~ 600MB 之间）。
   - 在高压测试中，雨天 + 30 个 VRM 模型在桌面端产生了 **279 MB** 的 JS Heap，若加上物理显存与解码缓冲区，真实手机极易触发 iOS Jetsam 崩溃闪退。
2. **GPU 发热与降频 (Thermal Throttling)**：
   - 手机在持续 60 FPS 渲染 70 万 ~ 300 万三角形时，SOC 将在 3~5 分钟内快速升温并触发系统降频，导致帧率断崖式下滑至 20~30 FPS。
3. **高 Retina 像素填充率压力 (Fill-Rate Bottleneck)**：
   - 现代旗舰手机屏幕物理分辨率高达 `1170×2532`（DPR = 3.0）。若直接以 1:1 绘制全分辨率，GPU 像素着色器负载将增加 4~9 倍。

---

## 4. 人工工程师局域网真机测试指南

为在真实 iPhone / Android 设备上复核本项目，请按以下步骤操作：

### 步骤一：启动局域网监听
在 `experiments/realistic-street-performance/` 目录下执行：
```bash
# 启动构建产物全网卡监听
pnpm preview --host 0.0.0.0 --port 5174
```

### 步骤二：获取本机局域网 IP
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
例如输出 `192.168.1.100`。

### 步骤三：手机连接同一 Wi-Fi 并访问
手机浏览器打开：
- 基础 5 人街区：`http://192.168.1.100:5174/?weather=day&actors=5`
- 压力测试 30 人：`http://192.168.1.100:5174/?weather=day&actors=30`
- 雨天压力测试：`http://192.168.1.100:5174/?weather=rain&actors=5`

### 步骤四：远程真机性能检查
- **iOS**：连接 Mac 数据线，在 Mac Safari 中打开「开发 -> [手机设备名] -> 镜界网页」，检查 WebGL 上下文内存、Layers 与 WebKit Console。
- **Android**：连接 USB 开启调试，在 Chrome 打开 `chrome://inspect` 进行 DevTools 挂载。

---

## 5. M7 移动端落地硬性指标建议

1. **强制 DPR 限制**：移动端渲染管线强制设定 `dpr={[1, Math.min(window.devicePixelRatio, 1.5)]}`，绝不允许在移动端以 DPR 3.0 跑 3D。
2. **移动端 Resident 配额**：手机视野内近景 VRM 人物数限制为 **不超过 3~5 人**，其余全部强制压入 LOD2 代理。
3. **显存预算红线**：移动端整包（网格 + 纹理 + 物理）显存占用必须控制在 **120 MB 以内**。
