# 02 - 开源研究资产登记与许可证审计 (Source Register)

本登记册依据《镜界\_第三方代码资产登记与许可证审计模板\_v1.0》与《镜界开发规则》编制。所有外部项目在被阅读、对照或参考前均经过许可证 Gate 审查。

---

## 1. 核心研究对象登记表

| ID          | 项目名称                         | 官方仓库 / 上游 URL                                                             | 审计锁定版本 / Commit                      | 许可证         | 许可证文件位置     | 版权声明 (Copyright)                         | 维护状态        | 本任务研究模式 | 建议镜界定位                                                                                                        |
| ----------- | -------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------ | -------------- | ------------------ | -------------------------------------------- | --------------- | -------------- | ------------------------------------------------------------------------------------------------------------------- |
| **SRC-001** | **AI Town**                      | [a16z-infra/ai-town](https://github.com/a16z-infra/ai-town)                     | `8e05997f2409275669c8344b84a51692e83f3f33` | **MIT**        | `LICENSE` (根目录) | Copyright (c) 2023 a16z-infra                | 活跃维护        | **REFERENCE**  | 借鉴 Agent Loop、异步调用隔离、Step/Tick 组织；不移植其 Convex 数据层与全局内存加载机制。                           |
| **SRC-002** | **Concordia**                    | [google-deepmind/concordia](https://github.com/google-deepmind/concordia)       | `9e4173f64a9f6c7990d2f5f52a11bc8e1f3aa61c` | **Apache-2.0** | `LICENSE` (根目录) | Copyright 2023 DeepMind Technologies Limited | 活跃维护        | **REFERENCE**  | 借鉴 Game Master 中介裁决思想、Putative Event 提出机制、实体组件化；坚决否定其以 LLM 作为世界权威事实仲裁者的设计。 |
| **SRC-003** | **OpenClaw World (ChenKuanSun)** | [ChenKuanSun/openclaw-world](https://github.com/ChenKuanSun/openclaw-world)     | `65a576ab27005ff3aa5f101a059786a338c40244` | **MIT**        | `LICENSE` (根目录) | Copyright (c) 2025 OpenClaw Contributors     | 静态归档 / 参考 | **REFERENCE**  | 借鉴 20Hz 循环、Spatial Grid 空间划分、AOI 半径过滤与广播优化；不移植其纯内存 WorldState 与无持久化设计。           |
| **SRC-004** | **OpenClaw World (Two-Weeks)**   | [Two-Weeks-Team/openClawWorld](https://github.com/Two-Weeks-Team/openClawWorld) | `4f17dd5f24367dfcf0f57838f9cec9cfc64f8210` | **MIT**        | `LICENSE` (根目录) | Copyright (c) 2026 Two-Weeks-Team            | 活跃维护        | **REFERENCE**  | 借鉴 AIC（Agent Interface Contract）、InputRecorder 格式；对照其内存 TTL 幂等与镜界 PG 持久幂等。                   |
| **SRC-005** | **OpenClaw Core**                | [openclaw/openclaw](https://github.com/openclaw/openclaw)                       | 本地 v2026.9.2 (`packages/openclaw`)       | **MIT**        | `LICENSE` (根目录) | Copyright (c) 2026 OpenClaw Foundation       | 高度活跃        | **REFERENCE**  | 借鉴 Command Queue Lanes（通道分组）、Per-Session 串行化与 AbortSignal 控制；不作为普通居民世界内核。               |

---

## 2. 衍生与观察项目记录

| ID              | 项目名称      | 上游 URL                                      | 许可证状态                            | 法律与架构合规策略                                                                                              |
| --------------- | ------------- | --------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **SRC-OBS-001** | **AstrTown**  | `https://github.com/AstralSolipsism/AstrTown` | MIT (AI Town 衍生)                    | **REFERENCE ONLY**：仅参考其 Fastify Gateway 独立层与 Bot 接入架构；保留 AI Town 版权通知。                     |
| **SRC-OBS-002** | **ClawVille** | `https://github.com/ItachiDevv/ClawVille`     | **Proprietary / All rights reserved** | **REFERENCE ONLY (STRICT)**：严禁复制任何源码、组件、SQL、3D 资产或逻辑代码；仅作为公开设计路线与商业竞品观察。 |

---

## 3. 许可证准入判定与红线

1. **红线验证通过**：
   - AI Town（MIT）允许自由使用与修改。
   - Concordia（Apache-2.0）允许使用、修改与分发，须保留 Notice 与许可声明。
   - OpenClaw 相关套件（MIT）均属于宽松开源协议。
2. **源码引用限制**：
   - 所有外部项目在本任务中均标记为 **REFERENCE**。
   - 禁止整体复制代码库；若未来需要局部 Port（算法或结构），必须建立独立的单元契约测试，并重构为镜界 TypeScript 体系。
