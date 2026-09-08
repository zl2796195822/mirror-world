# 15 - 上下文组装与预算上限机制 (Context Budget & Composer Architecture)

## 1. 为什么上下文绝不能无限增长？

在许多 Agent 实现中，普遍存在“随着模拟时间推移，对话历史越来越长、记忆越塞越多”的上下文失控现象。
这种做法会带来三大系统性灾难：

1. **注意力迷失与模型痴呆（Lost in the Middle）**：当上下文达到数万 Token 时，大模型对核心指令和当前物理环境的遵循能力大幅下降，甚至遗忘自己的设定；
2. **首字延迟飙升（TTFT 暴增）**：超长 Prompt 会导致模型 Prefill 阶段耗时从 200ms 剧增至 3~8 秒，破坏交互实时性；
3. **成本爆炸**：每次决策都要重复发送居民“一生的经历”，Token 消耗将以模拟天数呈二次方激增。

因此，**镜界确立“定额分箱上下文组装器（Bounded Context Composer）”，严禁把居民的完整人生每次全量塞入大模型！**

---

## 2. 定额分箱上下文架构 (The Fixed-Bin Context Model)

`ContextComposer` 将提供给模型的 Prompt 严格划分入 7 个具备硬上限的独立槽位（Bins）。任何单个槽位超限时，在槽内执行确定性截断或滑动窗口遗忘，绝不挤占其他槽位配额。

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 槽位 1: 核心系统人设与宪法 (System Persona & Invariants)               │
│ - 硬上限: 250 Tokens (固定内容, 严禁动态增长)                          │
├────────────────────────────────────────────────────────────────────────┤
│ 槽位 2: 当前行动者状态与目标 (Actor Self State & Active Goal)          │
│ - 硬上限: 150 Tokens (当前坐标、精力饥饿、手头任务)                     │
├────────────────────────────────────────────────────────────────────────┤
│ 槽位 3: 空间局部感知切片 (Nearby Physical Reality)                     │
│ - 硬上限: 200 Tokens (同场景人员、可见道具、可达出口, 最多 Top-5)      │
├────────────────────────────────────────────────────────────────────────┤
│ 槽位 4: 社交关系与印象 (Target Relationship Projections)               │
│ - 硬上限: 150 Tokens (仅限同场交互对象的有向关系数值与印象标签)        │
├────────────────────────────────────────────────────────────────────────┤
│ 槽位 5: 检索召回的主观记忆 (Retrieved Memories - M4 Top-K)             │
│ - 硬上限: 250 Tokens (最多 3 条与当前场景最相关的剧集/语义记忆)         │
├────────────────────────────────────────────────────────────────────────┤
│ 槽位 6: 最近因果反馈与微对话 (Recent Action Outcome & Micro-Dialogue)   │
│ - 硬上限: 150 Tokens (前序动作成功/失败原因, 最近 3 轮短句对话)         │
├────────────────────────────────────────────────────────────────────────┤
│ 槽位 7: 结构化输出契约指令 (Output Schema Directives)                  │
│ - 硬上限: 150 Tokens (严格要求输出合法 ActionIntent JSON)              │
└────────────────────────────────────────────────────────────────────────┘
```

$$\text{Total Max Input Budget} = 250 + 150 + 200 + 150 + 250 + 150 + 150 = \mathbf{1,300\text{ Tokens}}$$

---

## 3. 分箱容量与压缩淘汰策略矩阵

| 槽位名称              | 来源数据源        | Token 上限 | 实体/条目数量硬上限      | 超限时的压缩与淘汰策略                   |
| :-------------------- | :---------------- | :--------- | :----------------------- | :--------------------------------------- |
| **System Invariants** | 静态设定库        | 250 tokens | 1 份不可变人设卡         | 静态编译期冻结，禁止运行时拼接           |
| **Self State**        | M3 Life Engine    | 150 tokens | 1 个实体自身快照         | 仅保留数值摘要，不展开历史生理曲线       |
| **Nearby Reality**    | World Observation | 200 tokens | 最多 5 个实体 / 5 个道具 | 按物理距离升序排列，超限实体直接裁切     |
| **Relationships**     | M4 关系投影表     | 150 tokens | 最多 3 个交互对象        | 仅提取好感度/信任度及 1 句主观印象短语   |
| **Retrieved Memory**  | M4 记忆检索端口   | 250 tokens | **严格 Top-3 记忆条目**  | 仅提取 30 字单句摘要，禁止原文展开       |
| **Recent Outcome**    | Kernel 反馈流     | 150 tokens | 1 条前序结果 + 3 轮对话  | 采用先进先出滑动窗口，丢弃更早的聊天历史 |
| **Output Schema**     | 契约库            | 150 tokens | 1 份 JSON Schema         | 压缩字段描述，复用精简格式提示词         |

---

## 4. Context Composer 装配执行流水线

```typescript
/**
 * 上下文组装器伪代码规范 (ContextComposer)
 */
export class ContextComposer {
  public compose(input: {
    systemPrompt: string;
    observation: WorldObservationSnapshot;
    maxBudgetTokens: number; // 默认 1300
  }): ComposedContext {
    // 1. 静态人设安全裁切 (Token Bounded)
    const system = truncateToTokens(input.systemPrompt, 250);

    // 2. 状态与生理目标格式化
    const selfState = formatSelfState(input.observation.self, 150);

    // 3. 空间感知截断 (最多 5 个附近实体，防止密集场景挤爆)
    const nearby = formatNearby(input.observation.nearby, 200, { maxEntities: 5 });

    // 4. 社交关系按需投影 (仅提取现场人员)
    const relations = formatRelations(
      input.observation.cognitiveContext.relationshipProjections,
      150,
      { maxTargets: 3 },
    );

    // 5. 记忆注入 (严格限制 Top-3，严禁全量注入)
    const memories = formatMemories(
      input.observation.cognitiveContext.relevantMemories,
      250,
      { maxItems: 3 },
    );

    // 6. 前序动作反馈
    const feedback = formatFeedback(input.observation.cognitiveContext.lastActionOutcome, 150);

    // 7. Schema 规范指令
    const schemaDirective = formatSchemaDirective(150);

    // 8. 组装为标准 Messages 数组
    return {
      messages: [
        { role: "system", content: `${system}\n${schemaDirective}` },
        {
          role: "user",
          content: `${selfState}\n${nearby}\n${relations}\n${memories}\n${feedback}`,
        },
      ],
      estimatedTokens: estimateTotalTokens(...),
    };
  }
}
```

### 关键防膨胀红线：

1. **禁止记忆直接嵌套（No Memory Recurrence）**：记忆中如果引用了其他记忆，只取单层展开，严禁递归追踪记忆树。
2. **禁止把世界事件流水当作对话历史**：世界中的移动、打卡等事件已在状态中物化，严禁将其作为“系统消息列表”一条条喂给模型。
3. **严格 Token 计数守门（Hard Token Guard）**：发送前执行本地分词估算（如基于 cl100k/o200k 分词规则）；若总体估算超过 1,500 Tokens，在发起网络请求前即刻拦截并进行紧急二阶截断，彻底阻断长提示词造成的超支隐患。
