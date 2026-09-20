# Mirror World Client V0 — 文档索引

状态：`MERGED TO MAIN`（C0–C3；C3 greybox 在独立仓库 `mirror-world-client-ue`）

本目录属于镜界客户端 / 世界可视化轨道。当前基线 `origin/main = 2d0c8f9`，`M3 Life Engine v1 = PASS`（2026-09-13 关闭）；客户端实现已由用户批准（2026-09-20）并合入主线。

已完成：

- C0 Client Projection v0
- C1 Web Observer V0
- C1.1 real-lifecycle verification
- C2 First Street static 3D design / mapping
- C3 UE First Street greybox（独立仓库 `mirror-world-client-ue`）

C2 设计目录：`docs/client/first-street/`  
C3 指针：`docs/client/CLIENT-C3-UE-REPO-POINTER.md`

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

| 项                                          | 值                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| Client implementation currently authorized? | **YES**                                                                           |
| 依据                                        | `M3 = PASS`（2026-09-13）+ 用户人工批准（2026-09-20）                             |
| 已交付                                      | 只读 Client Projection v0 API + Web Observer（apps/api、apps/web、contracts、db） |
| 永久禁止（不变）                            | 改 Kernel、改世界事实、写入 DB、把客户端当 Truth —— 见 CLIENT-TRUTH-BOUNDARY.md   |
| UE 侧                                       | 独立仓库 `mirror-world-client-ue`，不在本仓 CI 范围内                             |

## 历史报告口径

本目录下的逐阶段验证报告（`CLIENT-V0-C01-*`、`CLIENT-C1.1-*`、`CLIENT-C2-*`、`CLIENT-C3-*`）记录**当时**的事实。其中 `M3 = IN_PROGRESS`、`Main merge allowed? NO until M3 PASS`、`not authorized` 等表述属于当时状态，已被本节更新取代。

按仓库规则，历史报告不改写、不追溯改判；当前状态以本 README 与 `docs/PROJECT_STATE.md` 为准。
