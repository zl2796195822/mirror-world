# 29 - 开源研究资产登记册 (Source Register)

> **注**：本文件同时作为 `SOURCE_REGISTER.md` 归档。编制标准严格遵循《镜界开发规则》与第三方资产准入审计规范。

---

## 1. 核心外部研究对象准入登记表

| ID             | 项目名称           | 官方仓库 / 上游代码库                                       | 审计锁定版本 / Commit                      | 许可证状态            | 版权声明 (Copyright)                    | 本任务定位 | 建议镜界复用模式                  | 核心应用场景与隔离说明                                                                                    |
| :------------- | :----------------- | :---------------------------------------------------------- | :----------------------------------------- | :-------------------- | :-------------------------------------- | :--------- | :-------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| **SRC-M5-001** | **OpenClaw Core**  | [openclaw/openclaw](https://github.com/openclaw/openclaw)   | 本地 v2026.9.2 / commit 追踪               | **MIT** (合规)        | Copyright (c) 2026 OpenClaw Foundation  | 核心参考   | **REFERENCE**                     | 借鉴其多通道优先级（Command Lanes）与 Per-session 任务串行化；坚决禁止单居民常驻独立 OpenClaw 守护进程。  |
| **SRC-M5-002** | **a16z AI Town**   | [a16z-infra/ai-town](https://github.com/a16z-infra/ai-town) | `8e05997f2409275669c8344b84a51692e83f3f33` | **MIT** (合规)        | Copyright (c) 2023 a16z-infra           | 核心参考   | **REFERENCE**                     | 借鉴其 `inProgressOperation` 异步操作解耦与非阻塞 Tick 思想；彻底拒绝其全量内存加载与 Convex 专有云绑定。 |
| **SRC-M5-003** | **Vercel AI SDK**  | [vercel/ai](https://github.com/vercel/ai)                   | Release v4.1.0 / NPM `@ai-sdk`             | **Apache-2.0** (合规) | Copyright (c) 2024 Vercel, Inc.         | 核心候选   | **DEPENDENCY_CANDIDATE**          | 推荐作为 M5 统一模型提供商端口（ProviderPort）与 Zod `generateObject` 结构化输出提取的标准依赖库。        |
| **SRC-M5-004** | **BullMQ**         | [taskforcesh/bullmq](https://github.com/taskforcesh/bullmq) | Release v5.34.0 / NPM `bullmq`             | **MIT** (合规)        | Copyright (c) 2020-present Taskforce.sh | 核心候选   | **DEPENDENCY_CANDIDATE** (有条件) | 推荐作为异步认知任务的多车道优先级缓冲与限流削峰编排器；严禁将其作为持久世界事实源。                      |
| **SRC-M5-005** | **Letta (MemGPT)** | [letta-ai/letta](https://github.com/letta-ai/letta)         | Release v0.1.13 / Commit 追踪              | **Apache-2.0** (合规) | Copyright (c) 2023 Letta AI             | 架构对照   | **REFERENCE**                     | 审查其上下文分箱（Working Context）与外部存储隔离思想；不使用其 Python 服务端与复杂自治循环。             |
| **SRC-M5-006** | **Mem0**           | [mem0ai/mem0](https://github.com/mem0ai/mem0)               | Release v0.1.45 / Commit 追踪              | **Apache-2.0** (合规) | Copyright (c) 2024 Mem0 Inc.            | 架构对照   | **REFERENCE**                     | 审查其用户级/会话级记忆过滤投影；镜界记忆主权完全由 M4 负责，仅吸收其提取抽象。                           |

---

## 2. 外部资产许可证准入红线核验

1. **许可证合规性 100% 通过**：
   - 本次审查的 6 大核心开源项目全部采用宽松商业友好协议（**MIT** 或 **Apache-2.0**）；
   - 不存在任何 GPL/AGPL 强传染性协议，不存在任何未知许可证（Unknown License）或带有“非商业用途限制（Commons Clause / CC-BY-NC）”的代码资产。
2. **源码物理隔离原则**：
   - 本研究中**没有向镜界代码库复制任何外部第三方源码文件**；
   - 所有外部模式均定性为 **REFERENCE**（思想重构）或 **DEPENDENCY_CANDIDATE**（未来通过 npm 显式声明安装并锁定 hash）；
   - 彻底杜绝代码污染风险。
