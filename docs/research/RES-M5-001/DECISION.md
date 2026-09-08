# 架构裁决报告 (DECISION: RES-M5-001)

- **任务编号**: RES-M5-001
- **任务名称**: AI Agent Runtime / Intent / Cost & Determinism Architecture Research
- **最终架构决议 (Final Decision)**: **`READY_WITH_RISKS`**

---

## 1. 三十一项核心架构问题权威解答清单

### 1. Resident 是否需要永久 Agent Process？

> **明确裁决：绝对不需要（NO）！**
> 居民是数据库中的持久社会实体，其日常生理作息由 M3 Life Engine 纯代码确定性运行。为每个居民启动独立常驻进程在 1,000 人时会导致 200GB 内存枯竭与调度死锁。Agent Runtime 必须是**基于无状态工作池（Stateless Worker Pool）的按需唤醒机制**。

### 2. 推荐 Agent Wake 模型？

> **明确裁决：推荐“方案 E：混合唤醒模型（Hybrid: Schedule + World Event + On-Demand）”。**
> 日常由日程时间节点唤醒，遭遇突发强刺激时由世界事件唤醒，人类玩家靠近交互时享有最高优先级按需唤醒。

### 3. 推荐 Intelligence LOD？

> **明确裁决：推荐四级智能细节体系（LOD-I0 ~ LOD-I3）。**
>
> - **LOD-I0 (休眠静息)**：远景或睡眠居民，纯确定性生命基线推进，零调用；
> - **LOD-I1 (规则缓存)**：中景日常行为，基于行为树/效用矩阵，零大模型；
> - **LOD-I2 (敏捷轻量)**：近景偶发社交，调用端侧/云端轻量小模型（SLM）；
> - **LOD-I3 (前沿深层)**：焦点主角与玩家交互，调用旗舰大模型深度推理。

### 4. 哪些行为 NO_LLM？

> **明确裁决：日常生理排解（睡觉、进食、如厕）、上下班打卡工作、基础廉价采购、擦肩而过表情礼貌、寻路避障重试。**
> 该类行为占社会总运转量的 85%~95%，由 M3 Life Engine 纯代码毫秒级消化，成本为 $0。

### 5. 哪些行为 OPTIONAL_LLM？

> **明确裁决：非关键居民在咖啡馆的偶发闲聊、轻微环境突变情绪反应（如抱怨下雨）、睡前日记摘要生成。**
> 可由 Tier-1 轻量模型生成；当系统负载高或处于远景时自动降级为预设模板。

### 6. 哪些行为 REQUIRED_LLM？

> **明确裁决：人类玩家直接发起的多轮深度对话、突发恶性社会危机（破产、失窃、遭捕）、重大商业谈判（租房、借贷、大额签约）、深层人际伦理抉择。**
> 必须调用 Tier-2/3 高阶大模型。

### 7. Agent Runtime 是否拥有任何 world fact authority？

> **明确裁决：绝对零权威（Zero Fact Authority）！**
> Agent Runtime 产生的只是主观意图（`ActionIntent`）。世界内核（World Kernel）是事实裁决与修改的唯一合法写入口。LLM 输出的任何自然语言与非结构化文本绝对不能直接成为世界事实。

### 8. Agent Observation contract？

> **明确裁决：统一采用受限的只读 DTO：`WorldObservationSnapshot`。**
> 具备 World-scoped、Actor-scoped、Versioned、Bounded 与 Read-only 五大特征。严禁 Agent 直连数据库执行任意 SQL。

### 9. Structured Intent contract？

> **明确裁决：采用强类型 `ActionIntent` 规范。**
> 必须显式携带 `intentId`、`residentId`、`basedOn.actorVersion`、`basedOn.worldSeq`、`actionType`、`parameters`、`confidence`、`reasonCategory`。严禁保存非结构化思维链。

### 10. stale snapshot 处理？

> **明确裁决：版本栅栏安全拦截（Fencing Gate）。**
> 意图携带的基准版本号转换为 `ActionRequest.expectedActorVersion`。内核事务核验发现版本不一致时，严格返回 `KERNEL_CONFLICT`，安全丢弃，触发基于最新状态的新鲜重规划，严禁强行写入。

### 11. ActionResult / KernelOutcome 需求？

> **明确裁决：必须建立强类型的 `KernelActionOutcome` 执行闭环。**
> 包含 `ACCEPTED`、`REJECTED`、`CONFLICT`、`DUPLICATE`、`TIMED_OUT` 五种机器可判状态及事实凭据指针，为 Life Engine 与 M5 提供因果反馈闭环。

### 12. retry 模型？

> **明确裁决：严格划分三层受限重试（Bounded Retry）。**
>
> - Provider 瞬态网络故障：指数退避，限 2 次；
> - Operation Schema 格式错误：Prompt 纠错，限 1 次；
> - Action 内核版本冲突：重新感知全新规划，限 1 次；
> - 业务拒绝（如余额不足）：**严禁重试**。

### 13. timeout 模型？

> **明确裁决：物理现实时钟（Wall Time）与虚拟世界时钟（World Time）双重解耦超时。**
>
> - Wall-time Provider Timeout：硬上限 8 秒，触发 `AbortSignal.abort()`；
> - Queue Deadline：排队超 15 秒强制丢弃；
> - World-time Expiry：超过 `expiresAtWorldTime` 内核拒绝执行。

### 14. queue/lanes 推荐？

> **明确裁决：借鉴 OpenClaw 建立五大优先级隔离车道（Command Lanes）。**
> `LANE_FOREGROUND` (玩家独占直通)、`LANE_CRITICAL` (重大冲突)、`LANE_PLANNING` (日常规划)、`LANE_SUMMARY` (离线反思)、`LANE_MAINTENANCE` (系统巡检)。保障高优先级交互绝不被后台任务饿死。

### 15. Provider abstraction 推荐？

> **明确裁决：基于标准接口构建轻量 `ProviderPort`。**
> 隔离 OpenAI、Anthropic、DeepSeek 与本地端侧模型，统一输入输出与计量接口，严禁厂商 SDK 私有类型侵入领域层。

### 16. Model routing 推荐？

> **明确裁决：面向“能力层级（Capability Tiers）”动态路由，禁止代码硬编码具体厂商模型名。**
> 划分为 `TIER_0_HEURISTIC`、`TIER_1_LIGHT`、`TIER_2_STANDARD`、`TIER_3_ADVANCED` 与 `TIER_OFFLINE_BATCH`。

### 17. Session 策略？

> **明确裁决：推荐“方案 D：纯无状态决策为主，短暂多轮微会话为辅（Stateless Core + Ephemeral Micro-Session）”。**
> 95% 场景使用无状态请求加 M4 记忆检索（用后即焚）；仅在与玩家面对面持续交流时激活带 TTL 的短期微会话（120 秒到期自动归档销毁）。

### 18. Context 策略？

> **明确裁决：采用定额分箱上下文组装器（Bounded Context Composer）。**
> 严格将输入划分为人设、自身状态、空间现实、社交关系、Top-3 检索记忆、最近反馈、输出规范 7 个硬上限槽位，总体 Token 预算硬锁死在 1,300 Tokens 以内。

### 19. Memory 边界？

> **明确裁决：严格对齐 RES-M4-001 五层现实边界。**
> Agent Runtime 仅为记忆的只读消费者，绝不拥有记忆事实主权；会话历史绝不能替代持久记忆；严禁原始思维链写入 `memories`。

### 20. Relationship 边界？

> **明确裁决：大模型只能生成社交意图，严禁直接加减好感度数值！**
> 好感度与信任度必须经由客观世界事件（`CONVERSATION_COMPLETED`）触发 M4 关系引擎的确定性规则进行更新。

### 21. Tool / permission 边界？

> **明确裁决：感知工具只读受限，行动工具唯一收敛至网关。**
> 严禁向居民开放 SQL 工具或代码解释器；写工具严格指向 `submit_action_intent` 并受主体类型（Native AI / Proxy）及沙箱限额约束。

### 22. Prompt injection 防线？

> **明确裁决：四重纵深防御体系。**
> 系统宪法指令最高、环境文本全部置于严格转义的 XML 沙箱信封中、仅开放受限 JSON Schema 提取、物理世界内核终审核验（物理定律无法被越狱违背）。

### 23. Audit 模型？

> **明确裁决：世界事件账本 (`world_events`) 与认知运维追踪 (`ai_traces`) 物理绝对隔离。**
> 核心账本永不记录 Token 与耗时；运维指标异步批量写入专用日志流，保障世界历史的纯洁与轻量。

### 24. Graceful degradation？

> **明确裁决：AI 全网瘫痪时，M3 Life Engine 确定性保活接管。**
> 居民照常打卡、工作、吃饭、就寝，世界时钟单调向前流逝，社会永不停止运转。

### 25. 30/100/1000/10000 scale 结论？

> **明确裁决：阶梯式平滑演进。**
> 30 人单机高频互动 $\to$ 100 人 BullMQ 车道与基础 LOD $\to$ 1,000 人纯事件驱动加严格配额 $\to$ 10,000 人宏观静息态加局部微观视口激活。10,000 居民月度模型开销严格控制在 \$165 美元以内。

### 26. OpenClaw 复用方式？

> **明确裁决：吸收多车道优先级与 Per-session 串行化思想（REFERENCE）；严禁单居民独立常驻完整进程（DO NOT USE）。**

### 27. AI SDK 结论？

> **明确裁决：`RECOMMEND`。**
> 作为实现统一模型提供商端口与 `generateObject` 结构化输出守门员的标准依赖。

### 28. BullMQ 结论？

> **明确裁决：`CONDITIONAL RECOMMEND`。**
> 仅限用于运行时异步任务队列编排与限流削峰，严禁替代 PostgreSQL 作为持久世界事实源。

### 29. M5 最小组件？

> **明确裁决：严格奉行 YAGNI，收敛为 9 大核心组件。**
> `AgentWakeRouter`、`AgentQueue`、`ObservationComposer`、`ProviderPort`、`IntentParser`、`IntentValidator`、`KernelActionPort`、`AgentOperationStore`、`AgentAuditTracer`。

### 30. M5 最大 blocker？

> **明确判定：`MIRROR-FIND-001 / GAP-M3-001`（ActionRequest 执行结果闭环缺失）。**
> 必须在 Pre-M3 / M3-T02 先行完成数据库 Migration，为 `action_requests` 增加状态回写与事件指针，否则 M3 动作循环与 M5 认知重规划均无法获得真实闭环反馈。

### 31. 是否建议未来进入正式 M5？

> **明确建议：在完成 M3（Life Engine）与 M4（Memory/Relationship）正式里程碑后，且在落地 Pre-M3 数据库结果闭环的前提下，正式进入 M5 开发。**

---

## 2. 最终准入决议评级

| 决议评级               | 综合判定理由                                                                                                                                                                                                                                                                |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`READY_WITH_RISKS`** | 1. **架构就绪度 100% (READY)**：理论论证、数据契约、安全防线、成本测算、规模模型与测试矩阵已全部彻底闭环；<br/>2. **前置风险警示 (RISKS)**：必须先执行 M3 生命引擎基线与 M4 记忆架构，且需优先闭环 `KernelActionOutcome` 数据库改造。当前不可越级跳跃进入 M5 正式代码编写。 |
