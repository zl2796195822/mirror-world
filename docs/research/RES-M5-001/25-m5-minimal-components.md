# 25 - 正式 M5 v1 最小组件架构规范 (M5 Minimal Components Blueprint)

## 1. 设计哲学：坚决奉行 YAGNI，严防过度设计

在企业级微服务与分布式系统设计中，最容易犯的错误就是“为了架构图美观而凭空制造几十个接口与模块”。
在「镜界」M5 Agent Runtime 的设计中，我们恪守 **YAGNI 原则（You Aren't Gonna Need It）**：

- 不搞“多 Agent 自治辩论委员会”；
- 不造“分布式复杂反思图计算引擎”；
- 不搞“三十个分层的微服务 RPC”。

**只保留保证认知意图生成、版本安全收敛与内核事实裁判所绝对必需的 9 个核心组件！**

---

## 2. M5 v1 最小架构全景组件图

```mermaid
flowchart TD
    subgraph TriggerSource [外部刺激与主时钟]
        T1[World Event Stream]
        T2[Life Engine Schedule]
        T3[Player Direct Input]
    end

    subgraph M5_Core_Runtime [M5 Agent Runtime 极简核心 (9大组件)]
        C1[1. AgentWakeRouter<br/>唤醒门禁与LOD路由]
        C2[2. AgentQueue<br/>BullMQ 多车道缓冲]
        C3[3. ObservationComposer<br/>空间裁切与只读感知装配]
        C4[4. ProviderPort<br/>统一多模型调度端口]
        C5[5. IntentParser<br/>结构化 JSON 语法解析]
        C6[6. IntentValidator<br/>前置沙箱与合法性检验]
        C7[7. KernelActionPort<br/>网关适配与请求提交]
        C8[8. AgentOperationStore<br/>Redis 运行态单并发控制]
        C9[9. AgentAuditTracer<br/>异步运维指标批处理]
    end

    subgraph KernelDomain [World Kernel 权威层 (保持既有封闭性)]
        K1[World Gateway / ActionRequest]
        K2[Kernel Pure Validator]
        K3[(PostgreSQL world_events)]
    end

    T1 & T2 & T3 --> C1
    C1 -->|通过门禁| C2
    C1 -.->|LOD-I0/I1| NO_LLM[Life Engine 本地规则消化]

    C2 --> C8
    C8 --> C3
    C3 --> C4
    C4 --> C5
    C5 --> C6
    C6 -->|合法意图| C7
    C7 --> K1
    K1 --> K2
    K2 -->|Commit| K3

    C4 & C6 & K2 -.->|异步收集指标| C9

    classDef comp fill:#e1f5fe,stroke:#0288d1;
    classDef kernel fill:#e8f5e9,stroke:#2e7d32;
    class C1,C2,C3,C4,C5,C6,C7,C8,C9 comp;
    class K1,K2,K3 kernel;
```

---

## 3. 九大核心组件职责、输入输出与依赖契约表

| 序号  | 组件名称 (Component)      | 核心法定职责 (Responsibilities)                                                          | 标准输入 (Inputs)                      | 核心输出 (Outputs)                               | 下游关键依赖                   |
| :---- | :------------------------ | :--------------------------------------------------------------------------------------- | :------------------------------------- | :----------------------------------------------- | :----------------------------- |
| **1** | **`AgentWakeRouter`**     | 监听世界事件与作息时钟，执行休眠态过滤与 Intelligence LOD 判定，过滤 90% 无效调用。      | 触发事件、居民当前状态、系统预算水位   | 唤醒指令 / 直接转交 Life Engine                  | Life Engine 状态投影           |
| **2** | **`AgentQueue`**          | 承载 5 大优先级车道，实施全局并发配额限制、速率削峰与排队超时清理。                      | 唤醒任务 Payload                       | 排队调度的异步任务句柄                           | Redis / BullMQ                 |
| **3** | **`ObservationComposer`** | 纯只读空间局部性裁切，批量检索 M4 记忆与关系投影，装配不可变快照。                       | `residentId`, `worldId`                | `WorldObservationSnapshot` (带版本)              | M4 Query Port, 地图空间网格    |
| **4** | **`ProviderPort`**        | 封装模型提供商抽象，管理超时 `AbortSignal`，调用 LLM 并提取原始输出。                    | 标准 Prompt, 目标能力层级, Schema 契约 | 原始响应文本 / 结构化对象 / 错误码               | Vercel AI SDK, 云端/本地大模型 |
| **5** | **`IntentParser`**        | 将模型输出文本安全提取为内存键值对，处理 Markdown 围栏或轻微格式瑕疵。                   | 模型原始文本流                         | 弱类型结构体或解析异常                           | 纯 TypeScript 纯函数           |
| **6** | **`IntentValidator`**     | 执行严格的 Zod Schema、权限沙箱与业务前置可行性核验（拒绝负数/瞬移）。                   | 待验结构体, 居民能力边界               | 合法 `ActionIntent` 或拒绝原因                   | `@mirror/contracts`            |
| **7** | **`KernelActionPort`**    | 网关适配器：为意图打上 `idempotencyKey`、`traceId` 与 `expectedActorVersion`，递交网关。 | `ActionIntent`                         | `ActionRequest` 提交，接收 `KernelActionOutcome` | World Gateway 接口             |
| **8** | **`AgentOperationStore`** | 维护居民当前活跃操作互斥锁（单居民单并发），记录运行态开始时间与状态机流转。             | `operationId`, `residentId`, 状态跃迁  | 互斥锁获取结果, 运行态心跳                       | Redis 内存哈希表               |
| **9** | **`AgentAuditTracer`**    | 收集 Token 消耗、耗时、模型层级与失败码，异步批量刷盘至运维日志库。                      | Trace 数据包                           | 批量写入 `ai_traces`，推送监控指标               | 运维日志表 / 时序数据库        |

---

## 4. 架构闭环保障原则

1. **单向依赖（Unidirectional Dependency）**：
   - 依赖关系严格遵循：`触发源 -> 调度 -> 队列 -> 观察 -> 模型 -> 校验 -> 网关 -> 内核`。
   - 绝不允许内核反向同步调用 Agent Runtime，绝不允许网关反向等待模型推理完成。
2. **零循环引用与纯契约通信**：
   - 所有组件之间通过纯数据传输对象（DTO / TypeScript Interfaces）通信，没有复杂的双向事件总线环路，确保单测可 Mock 性达到 100%。
