# 04 - Google DeepMind Concordia 深度源码剖析与技术审查 (Concordia Analysis)

- **研究对象**: `google-deepmind/concordia`
- **审计版本 Commit**: `9e4173f64a9f6c7990d2f5f52a11bc8e1f3aa61c`
- **许可证**: Apache-2.0
- **核心文件证据**:
  - `concordia/environment/README.md`
  - `concordia/environment/engine.py`
  - `concordia/environment/engines/sequential.py`
  - `concordia/environment/engines/simultaneous.py`
  - `concordia/components/game_master/event_resolution.py`
  - `concordia/components/game_master/world_state.py`
  - `concordia/contrib/components/game_master/thread_safe_generative_clock.py`
  - `concordia/typing/entity.py`

---

## 核心技术问题深度解答 (13项专题)

### 1. Agent 能否直接改变世界？

- **代码事实**: **绝对不能（Strictly Disallowed）**。
- 在 Concordia 架构中，所有 Agent（实体 Entity）只能通过实现 `entity_lib.Entity.act(action_spec)` 返回一个代表行动提议的字符串。
- 引擎将该字符串封装为前缀为 `[putative_event]` 的“假定事件”（Putative Event）。Agent 没有任何接口或指针去直接修改环境对象、其他 Agent 的属性或全局状态。

### 2. Game Master 在一次行为中做什么？

- **代码事实**:
  - 在 `Sequential` 引擎中，一次行为循环包括（`concordia/environment/engines/sequential.py:261-335`）：
    1. **广播观察（Make Observation）**：GM 调用自身的 `make_observation` 组件，为所有观察者并行生成专属的环境感知文本并灌入其记忆（`entity.observe(obs)`）。
    2. **选取行动者（Next Acting）**：GM 裁决下一步由谁行动，并生成对应的 `ActionSpec`（自由文本、选项枚举或特定格式要求）。
    3. **收集提议（Putative Action）**：被选中的 Agent 调用 `act(action_spec)` 产出行动文本。
    4. **仲裁解决（Resolve）**：GM 的 `EventResolution` 组件介入，将 `[putative_event]` 转化为经过裁决的正式事件 `[event]`，并触发世界状态组件的更新。

### 3. Agent 的 proposal 如何成为 world outcome？

- **代码事实**:
  - 核心逻辑位于 `concordia/components/game_master/event_resolution.py:141-217`：
    1. GM 从其关联记忆组件中通过 `selector_fn=lambda x: PUTATIVE_EVENT_TAG in x` 扫描出该 Agent 提出的 `putative_action`。
    2. GM 拼接当前的上下文组件状态（如环境描述、位置、规则）。
    3. 启动交互式文档思维链（`run_chain_of_thought`），向 LanguageModel 提出核心提示词：_"Because of all that came before, what happens next?"_
    4. LLM 综合判断动作是否合理、后果为何，并生成正式的叙事结果语句（`event_statement`）。
    5. 该结果被打上 `[event]` 标签存入全局记忆，并选择性通知其他观察者。

### 4. Game Master 如何读取：world state / agent state / context？

- **代码事实**:
  - **组件化文本拼装（Entity-Component System via Strings）**：
  - GM 自身也是一个实体（Entity），挂载了多个 `ContextComponent`（如 `world_state`、`inventory`、`rules`）。
  - 在裁决前，GM 调用 `_component_pre_act_display(key)`，让每个组件吐出自己的文本状态表示（例如 "Current locations: Alice in kitchen, Bob in garden"）。
  - 所有状态最终被拼接成一段多段落的上下文 Prompt 喂给 LLM。

### 5. Game Master 是：deterministic authority 还是 LLM authority？

- **代码事实**: **Concordia 的 Game Master 是典型的 LLM Authority（大语言模型权威）**。
- 裁决动作是否生效、物体是否损坏、协议是否达成，本质上不是由一行确定性的 `if (balance >= price)` 代码计算，而是通过向 LLM 询问并在 Prompt 里给出规则让 LLM 生成裁决判定。

### 6. 如果 Game Master 使用 LLM：哪些思想镜界可以借鉴，哪些绝对不能使用？

- **可借鉴思想（REFERENCE）**：
  - **Mediator 架构模式**：实体只提 proposal，必须经由仲裁者产生事实。
  - **Entity-Component 解耦思想**：通过组件化挂载感知、记忆与状态，保持实体轻量。
  - **Observation 生成隔离**：世界事实发生后，不同观察者根据相对位置和认知能力获得不同的感知信息。
- **绝对禁止使用（NEVER USE IN WORLD KERNEL）**：
  - **镜界不可破坏红线：LLM 永远不能成为权威事实仲裁者！**
  - 在镜界中，诸如资产余额、扣费、物品所有权、位移是否撞墙、工作考勤等，**必须由 PostgreSQL 事务和 TypeScript 纯规则确定性裁决**。若用 LLM 判定扣费或合法性，会出现幻觉、越狱（Prompt Injection）、非确定性和严重的审计风险。

### 7. Concordia 如何表达：action / observation / world consequence？

- **代码事实**:
  - **全部采用自然语言非结构化文本**：
    - Action: `Alice: I will offer Bob 5 gold for the apple.`
    - Observation: `Alice sees Bob standing near the counter looking thoughtful.`
    - Consequence: `Bob accepts the offer and hands the apple to Alice.`
  - 这种设计极其灵活，适合开放叙事社会学实验，但对于需要高并发、数据库索引和资产严肃性的数字社会而言，完全丧失了工程严密性。

### 8. 是否存在结构化 event？

- **代码事实**: **不存在**。
- 源码中仅有简单的字符串标签：`PUTATIVE_EVENT_TAG = '[putative_event]'` 与 `EVENT_TAG = '[event]'`。
- 没有 JSON Payload、没有 Schema 强校验、没有全局连续整型序号（Sequence）、没有版本号、没有事务隔离机制。

### 9. 时间如何推进？

- **代码事实**:
  - 存在两种模式：
    1. **步进计数（Step-based）**：每执行一次回合循环，`steps += 1`。
    2. **生成式时钟（Generative Clock）**：如 `GenerativeClock`（`world_state.py:405-450`），竟然也是由 LLM 提示词根据文本情节推测时间过去了多少分钟！
    3. 实验 prefabs 中亦有固定增量时钟（`FixedIncrementClock`），每次 Step 增加固定 timedelta。

### 10. 多人行为冲突如何处理？

- **代码事实**:
  - 在 `Sequential` 引擎中，由于是完全的串行回合制（Turn-based），天然规避了物理并发冲突。
  - 在 `Simultaneous` 引擎中，多人的 Action 文本被搜集成列表，一次性整合成 Prompt 提交给 Game Master LLM，让 LLM 在生成结果时一并化解冲突（例如："Alice and Bob both grabbed the cup at the same time, but Alice was faster."）。

### 11. 是否支持 deterministic replay？

- **代码事实**: **完全不支持（Non-replayable）**。
- 核心决策依赖 LLM 随机采样（Temperature / Top-p）。即便锁定 Random Seed，由于底层模型提供商推理硬件、并发浮点数精度的微小差异，以及文本自然语言状态机的模糊性，重新运行必定产生发散的历史分支。

### 12. 哪些设计最接近镜界的 ActionRequest -> Kernel -> Event 链条？

- **映射对照**:
  - Concordia 的 `ActionSpec` 对应镜界的 `ActionContract`。
  - Concordia 的 `putative_event` 对应镜界的 `ActionRequest`。
  - Concordia 的 `Game Master.resolve` 对应镜界的 `Kernel.validate & commit`。
  - Concordia 的 `event_statement` 对应镜界的 `world_events`。
- **差异在于**：镜界的整条链路是强类型、JSON Schema 约束、PostgreSQL 事务保证的硬核确定性管线；而 Concordia 是自然语言 Prompt 流水线。

### 13. 哪些设计由于高度依赖 LLM，不适合镜界 World Kernel？

- **不适合清单**:
  1. **基于 LLM 的前置条件检查**：不可用于经济、位置与权限校验。
  2. **基于 Prompt 的时钟推断（GenerativeClock）**：世界时钟必须由确定性数学公式或固定 Tick 步进驱动。
  3. **非结构化全局记忆扫描（Memory Scan String Search）**：Concordia 依赖在内存字符串数组中用 `PUTATIVE_EVENT_TAG in x` 查找待决动作，在大规模持续运行时会出现 O(N) 内存爆炸和查找丢失。
