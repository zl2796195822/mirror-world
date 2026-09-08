# 20 - 故障自愈矩阵与无模型优雅降级体系 (Failure Modes & Graceful Degradation)

> **注**：本文件同时作为 `NO_LLM_DEGRADATION.md` 归档。

## 1. 核心架构底线：AI 全崩，世界不倒 (Zero-LLM Resilience)

在许多过度依赖大模型的 AI 虚拟小镇原型中，一旦云端大模型服务商（如 OpenAI）发生全网故障或欠费停机，整个小镇的所有居民瞬间集体石化，甚至模拟主进程直接崩溃抛错。

在「镜界」持久数字社会中，**确立绝对不妥协的容灾哲学**：

> **M5 Agent Runtime 是社会的“高阶智能增强插件”，绝对不是社会生命唯一的发动机！**
> **如果外部大模型 API 遭遇全球性断网或服务全面瘫痪，M3 生命引擎（Life Engine）将接管全部居民的基础生存与社会运转。**
> **社会作息照常运转，工人照常打卡，居民照常进食就寝，世界时钟继续单调向前！**

---

## 2. 十六类系统故障全景应对矩阵 (Comprehensive Failure Matrix)

| 故障场景                  | 故障现象与原因                         | 系统捕获层级       | 自动化处置规范与预期行为 (Expected Behavior)                                                     | 对世界运转的影响                               |
| :------------------------ | :------------------------------------- | :----------------- | :----------------------------------------------------------------------------------------------- | :--------------------------------------------- |
| **1. Provider Down**      | 大模型 API 全球宕机 (HTTP 500/502/503) | Provider Port      | 触发重试 2 次失败后，熔断器打开，任务标记 `FAILED`，自动将该居民切入 Life Engine 确定性作息。    | 零影响。世界正常推进，居民暂时不发起复杂聊天。 |
| **2. Provider Timeout**   | 大模型接口挂起超过 8 秒未返回          | AbortController    | 触发 `abort()` 强制切断 HTTP 连接，标记 `TIMED_OUT`，清理居民挂起标记，记录告警。                | 零影响。居民结束“沉思”，转入原地待命。         |
| **3. Invalid JSON**       | 模型输出纯文本或被截断的残破格式       | IntentParser       | 尝试本地轻量修复；若失败允许 1 次定向修复重试；仍失败直接放弃并退回规则动作。                    | 零影响。不提交任何非法垃圾至内核。             |
| **4. Schema Invalid**     | JSON 语法正确，但缺少关键必填字段      | Zod Validator      | 提取字段错误详情，重发一次定向 Prompt 纠错；耗尽重试后标记校验拒绝。                             | 零影响。非法参数在认知层被彻底物理拦截。       |
| **5. Model Refusal**      | 触发大模型厂商安全审查策略，返回拒绝   | Provider Adapter   | 捕获 `CONTENT_POLICY_VIOLATION`，立即终止本次意图，记录安全合规审计。                            | 居民表现为礼貌回避该敏感话题。                 |
| **6. Rate Limit (429)**   | 达到厂商 QPS 或 TPM 配额上限           | Provider Adapter   | 熔断该厂商通道，自动将请求故障转移（Failover）至备用云端或本地小模型。                           | 零影响。用户感知到略微延迟但不会报错。         |
| **7. Queue Overload**     | 突发事件导致任务队列积压超水位线       | Queue Arbiter      | 触发车道背压（Backpressure），自动丢弃远景非关键车道的规划任务，保全玩家交互车道。               | 背景居民自动退回 LOD-I0 规则层。               |
| **8. Stale Snapshot**     | 思考期间实体版本已跃迁被修改           | Kernel Arbiter     | 内核比对 `expectedActorVersion` 不符，返回 `KERNEL_CONFLICT`，安全丢弃，触发基于最新状态重规划。 | 物理世界无脏写入，无数据竞态。                 |
| **9. Kernel Conflict**    | 目标资源被他人抢先一步拿走/买空        | Kernel Arbiter     | 内核返回 `KERNEL_INSUFFICIENT_RESOURCE`，判定动作失败，写回结果码。                              | 居民得知商品已无，转入重新寻觅。               |
| **10. Inactive Resident** | 居民在思考中被封禁、死亡或转为休眠     | Agent Worker       | Worker 检查居民状态若为 `INACTIVE`，立即调用 `CANCELLED` 作废任务，不提交意图。                  | 避免对死人或离线实体产生幽灵动作。             |
| **11. World Paused**      | GM 管理员通过后台暂停了世界模拟时钟    | Gateway            | 网关拒收任何非紧急请求，内核返回 `WORLD_NOT_RUNNING`，所有任务挂起休眠。                         | 世界时钟静止，等待管理员恢复。                 |
| **12. World Stopped**     | 世界实例被归档销毁                     | Agent Runtime      | 清理该世界关联的 Redis 运行态缓存与任务队列，Worker 退出。                                       | 资源彻底释放。                                 |
| **13. Duplicate Input**   | 客户端网络抖动重复发送了相同请求       | ActionRequestStore | 命中 SHA-256 指纹，返回 `KERNEL_DUPLICATE_REQUEST` 并附带历史真实执行结果。                      | 绝不重复扣款，绝不重复位移。                   |
| **14. Late Completion**   | 思考耗时 20 秒，在系统超时放弃后才返回 | Agent Worker       | Worker 发现该 Operation 已被标记为 `TIMED_OUT`，直接静默丢弃其结果，绝不往网关递交。             | 彻底杜绝“穿越动作”覆盖最新现实。               |
| **15. Worker Crash**      | 执行大模型调用的 Worker 节点硬件崩溃   | BullMQ Watchdog    | Redis 租约到期自动检测到僵尸任务，看门狗将其重新放回队列或标记失败。                             | 居民挂起状态在 30 秒内自愈解冻。               |
| **16. Redis Flush/Down**  | 运行态缓存与队列发生临时抖动           | Ingress Gateway    | 网关暂时将任务降级为内存直通或直接降级为 Life Engine；PostgreSQL 核心数据毫发无损。              | 核心持久事实毫发无损。                         |

---

## 3. 无大模型优雅降级路线图 (Zero-LLM Degradation Blueprint)

```mermaid
flowchart TD
    HEALTH{大模型提供商健康检查}
    HEALTH -->|正常 (100% 绿灯)| NORM[全功能运行: LOD-I0 ~ LOD-I3 满血启用]
    HEALTH -->|出现轻微抖动/限流| DEG1[一阶降级: 提升 LOD 阈值, 压低背景居民调用]
    HEALTH -->|主力云端宕机| DEG2[二阶降级: 热切至本地开源 SLM 或备用提供商]
    HEALTH -->|全网大模型彻底断网| DEG3[三阶终极降级: 全界切入 ZERO_LLM 模式]

    subgraph ZeroLLMMode [终极保活模式: M3 Life Engine 纯确定性运转]
        DEG3 --> L1[生理需求由 Utility AI 纯函数更新]
        DEG3 --> L2[上下班与睡觉由时间表硬规则驱动]
        DEG3 --> L3[路遇熟人由预置动作库与插值模板对话]
        DEG3 --> L4[玩家交互提示: '居民正在专注工作中...']
    end

    classDef normal fill:#e8f5e9,stroke:#2e7d32;
    classDef deg fill:#fff8e1,stroke:#f57f17;
    classDef crit fill:#ffebee,stroke:#c62828;
    class NORM normal;
    class DEG1,DEG2 deg;
    class DEG3,L1,L2,L3,L4 crit;
```

### 3.1 终极降级模式的核心指标承诺：

- **CPU 与内存消耗**：降至日常峰值的 10% 以下；
- **世界时钟推进稳定性**：100% 稳定，毫无抖动；
- **经济与财务结算**：定时轮班发薪、房租扣款 100% 正常进行；
- **社会可玩性保底**：居民在街道上依然川流不息、工作吃饭睡觉有条不紊。待大模型服务恢复后，系统可在 1 秒内无缝重新开启高阶思考能力！
