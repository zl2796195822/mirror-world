# MEMORY-TAXONOMY-V2

## 1. 结论：M4 v1 最小类型

| 类型                 | v1 裁决                           | 形态                                                      |
| -------------------- | --------------------------------- | --------------------------------------------------------- |
| **Episodic**         | **CORE 实现**                     | structured memory row + lineage                           |
| **Semantic**         | **CORE 最小巩固**                 | 从 episodic 晋升的 structured belief                      |
| **Relationship**     | **CORE，但作为 projection state** | directional relationship state，不是“又一张 vague memory” |
| Emotional            | **ADAPT**                         | episodic/relationship 上的 attributes                     |
| Identity milestone   | **ADAPT**                         | episodic 上的 high-retention flag/policy                  |
| Procedural           | **DEFER**                         | 由 M3 routines/behavior 承载                              |
| Institutional        | **DEFER**                         | M6+/文明层                                                |
| Collective / Culture | **DEFER**                         | civilization layer                                        |

## 2. 不建 7 张表

RES-M4-001 也反对一次铺开；v2 再收紧：

- 不要 `emotional_memories`
- 不要 `procedural_memories`
- 不要 `institutional_memories`
- 不要把 relationship 塞进同一张 episodic 大宽表当唯一真相

## 3. World Truth vs Resident Belief

|                | World Fact                    | Resident Belief / Memory             |
| -------------- | ----------------------------- | ------------------------------------ |
| 载体           | `world_events` + Kernel state | `memories` / relationship projection |
| 可错性         | 权威事实                      | 允许偏差、遗漏、过时                 |
| 可否反写 World | —                             | **绝对禁止**                         |
| 遗忘           | 不删事件                      | 只影响居民认知状态                   |

例子：

- World Truth：商店老板是 B。
- Resident Belief：A 记成老板是 C。  
  即使 belief 错误，它仍是 A 的真实 mental state。

## 4. Identity

- 静态身份继续由 resident seed/profile 承载。
- 人生里程碑 = 高保留 episodic policy，不是 `decay=0` 永恒数学常数。
- Memory ownership 挂 **Resident**，不挂 Auth user。

## 5. Procedural

- v1 不编译技能记忆。
- routines/goals 已提供行为模板；未来 M8 再考虑 learning。

## 6. Institutional / Collective

- 公司账本、组织档案：M6 economy/institutions。
- 文化记忆、公共历史、媒体：future civilization layer。
- M4 只预留接口方向，不实现。
