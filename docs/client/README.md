# Mirror World Client V0 — 文档索引

状态：`C3 BLOCKED_BY_UE_ENVIRONMENT`（`task/client-v0-first-street-c2`）

本目录属于镜界客户端 / 世界可视化轨道。当前主线 `origin/main = b774533`，`M3 Life Engine v1 = IN_PROGRESS`，因此 production implementation 不得合入主线。

已完成：

- C0 Client Projection v0
- C1 Web Observer V0
- C1.1 real-lifecycle verification
- C2 First Street static 3D design / mapping

当前：

- C3 First Street UE Greybox = `BLOCKED_BY_UE_ENVIRONMENT`
- 本机未安装 Unreal Engine；未静默下载、未创建 UE project

C2 设计目录：`docs/client/first-street/`  
C3 环境门禁报告：`docs/client/CLIENT-C3-FIRST-STREET-UE-GREYBOX-verification-report.md`

## 一句话边界

- Web Observer：看懂世界。
- 3D Client：走进世界。
- World Server：决定世界发生了什么。

## 文档

| 文档                                                                   | 内容                             |
| ---------------------------------------------------------------------- | -------------------------------- |
| [CLIENT-VISION.md](./CLIENT-VISION.md)                                 | 产品定位与非目标                 |
| [CLIENT-ARCHITECTURE.md](./CLIENT-ARCHITECTURE.md)                     | 总体架构与技术方案比较           |
| [CLIENT-TRUTH-BOUNDARY.md](./CLIENT-TRUTH-BOUNDARY.md)                 | 客户端不得成为 Truth 的硬边界    |
| [CLIENT-PROJECTION-CONTRACT-v0.md](./CLIENT-PROJECTION-CONTRACT-v0.md) | 临时只读 Client Projection DTO   |
| [WEB-OBSERVER-V0.md](./WEB-OBSERVER-V0.md)                             | Web Observer 产品与屏幕设计      |
| [FIRST-STREET-3D-V0.md](./FIRST-STREET-3D-V0.md)                       | 第一条街 3D 范围                 |
| [UE-CLIENT-ARCHITECTURE.md](./UE-CLIENT-ARCHITECTURE.md)               | UE 客户端分层架构                |
| [PLACE-VISUAL-BINDING.md](./PLACE-VISUAL-BINDING.md)                   | placeId 与视觉锚点绑定           |
| [RESIDENT-VISUAL-STATE.md](./RESIDENT-VISUAL-STATE.md)                 | 居民视觉状态与活动映射           |
| [CLIENT-SYNC-AND-RECONNECT.md](./CLIENT-SYNC-AND-RECONNECT.md)         | Snapshot / Delta / Cursor / 重连 |
| [CLIENT-REPO-STRATEGY.md](./CLIENT-REPO-STRATEGY.md)                   | 仓库与资产策略                   |
| [CLIENT-TEST-STRATEGY.md](./CLIENT-TEST-STRATEGY.md)                   | 测试与跨端一致性                 |
| [CLIENT-RISK-REGISTER.md](./CLIENT-RISK-REGISTER.md)                   | 风险登记                         |
| [CLIENT-MILESTONES.md](./CLIENT-MILESTONES.md)                         | C0–C8 里程碑                     |
| [CLIENT-IMPLEMENTATION-PLAN.md](./CLIENT-IMPLEMENTATION-PLAN.md)       | 批准后的实施顺序                 |

## 当前授权快照

| 项                                          | 值                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Client implementation currently authorized? | **NO**                                                                    |
| 原因                                        | `M3 != PASS`；设计需人工批准                                              |
| 允许产出                                    | 架构 / 契约草案 / Observer 与 3D 计划                                     |
| 禁止                                        | 改 DB、改 Kernel、新增 production API、创建 UE project、scaffold 正式前端 |
