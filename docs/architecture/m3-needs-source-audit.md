# M3 Needs Source Audit

日期：2026-09-08
基线：`main@aa156aa56e2bc509f31bf6c8bc5234bc1c157928`
用途：为 `ADR-M3-001` 保留每个 Needs 定义来源的原始证据，不把 4、6、7 三种历史集合未经裁决地合并。

## 审计范围与方法

本审计重新搜索了主仓、M3/M4/M6/M2-OSS 研究工作树，以及正式文档库中的以下词及中文等价词：`Need`、`Needs`、`hunger`、`energy`、`sleepPressure`、`socialNeed`、`moneyPressure`、`safety`、`belonging`、`condition`、`physiological`、`resident state`、`life engine`、需求、饥饿、能量、睡眠、社交、金钱、安全、归属。

主仓当前没有 Needs runtime、Needs 表、Life Engine 包或 resident state 表。唯一与 Need 直接相关的实现痕迹是 World Kernel 的 `NEED_CHANGED` 事件注册和 replay no-op 分支：

- `packages/world-kernel/src/world-events-store.ts:4-19`：事件注册表包含 `NEED_CHANGED`，但没有 Need 字段、公式或 evaluator。
- `packages/world-kernel/src/world-replay.ts:191-223`：`NEED_CHANGED` 当前只进入已校验事件历史，不改变 replay state；这不是 Needs runtime。
- `docs/verification/M3-T01-report.md:42-48`：T01 明确没有创建任何 evolving Needs state，4/6/7 冲突仍待 ADR。

DOCX 来源的“行”无法像 Markdown 一样由 Git 稳定编号，因此使用 DOCX 内的章节号、表名和表行作为证据定位；Markdown 来源使用仓库相对路径和行号。研究工作树均为只读输入，没有把其修改带入 `main`。

## 文档权威与审计裁决规则

现有正式文档没有找到一条完整的“冲突来源总排序”条款。可以确认的规则是：母文档要求只执行当前里程碑、发现冲突必须写 ADR；Codex 执行手册要求以当前里程碑和 DoD 为入口；研究路线要求研究结论只有在形成 ADR 后才能升级为产品规格。因此本审计采用以下可解释的工作排序：

1. 项目不可破坏边界、已 Accepted ADR 与当前 Gate 的事实边界。
2. 当前 M3 执行任务和实施矩阵的可执行范围与 DoD。
3. 正式领域规格和全量母文档的架构意图。
4. verification 报告作为“已经实现了什么”的事实证据，而不是新设计授权。
5. RES-\* 研究作为评审输入；研究建议不能未经 ADR 覆盖正式任务。

这不是仓库已经明确写出的总法则，而是本 ADR 对现有治理规则的最小解释。`ADR-M3-001` 接受后，对 Needs 数量、语义和 T02 范围的冲突部分形成新的正式决策；未被本 ADR 覆盖的既有 M2/M3 边界继续有效。

## 逐来源记录

### 研究来源：4 Needs

#### SOURCE-R01

| 字段                | 记录                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 文件                | `/Users/alin/AI项目/mirror-world-life-research/docs/research/RES-M3-001/02-minimal-resident-state.md`                  |
| 章节/行证据         | “状态表” `:20-24`；拟议结构 `:37-49`；权威与派生 `:52-67`                                                              |
| 权威级别            | RES-M3-001 研究输入；非正式产品规格                                                                                    |
| Need 数量           | 4                                                                                                                      |
| Need 名称           | `energy`、`hunger`、`sleepPressure`、`socialNeed`                                                                      |
| 定义                | `energy` 是精力/清醒能力，`hunger` 是饥饿缺口，`sleepPressure` 是睡眠压力，`socialNeed` 是社交缺口                     |
| 值域                | 四项均 `0..100`；`energy` 高值较好，其余三项高值较差                                                                   |
| Authority / derived | `residentId`、位置、工作、现金、食物是输入事实；四个 Need 明确是由时间和事件派生；`conditionBand` 由 Needs 派生        |
| 公式                | 没有给出数值公式；说明由上次计算点、世界时间和事件派生                                                                 |
| Threshold           | 没有在本文件冻结阈值                                                                                                   |
| Goal 参与           | `energy` 休息评分、`hunger` 食物目标、`sleepPressure` 睡眠目标、`socialNeed` 基础社交目标                              |
| 冲突                | 与正式任务/矩阵缺少 `sleepPressure`、多出 `socialNeed`；与正式七项缺少 `stress`、`safety`、`money_pressure`、`purpose` |

#### SOURCE-R02

| 字段                | 记录                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 文件                | `/Users/alin/AI项目/mirror-world-life-research/docs/research/RES-M3-001/03-needs-goals-actions.md`                                                                                                                  |
| 章节/行证据         | “Needs v1” `:13-26`；condition `:28-36`；Need/Goal/Action `:3-11`                                                                                                                                                   |
| 权威级别            | RES-M3-001 研究输入；比 R01 更具体，但仍非正式任务规格                                                                                                                                                              |
| Need 数量           | 4                                                                                                                                                                                                                   |
| Need 名称           | `hunger`、`energy`、`sleepPressure`、`socialNeed`                                                                                                                                                                   |
| 定义                | Need 是当前缺口或压力；Goal 是改善缺口/履行义务；Action 是可被 Kernel 拒绝的请求                                                                                                                                    |
| 值域                | `0..100`；`hunger`、`sleepPressure`、`socialNeed` 高值为坏方向，`energy` 高值为好方向                                                                                                                               |
| Authority / derived | 四项由时间、活动和 accepted event 派生；工作义务是时间表派生的 obligation，不是 Need；现金压力在 M3 不建立独立 Need                                                                                                 |
| 公式                | 给出研究起始速率：`hunger` 清醒约 `+0.45/小时`、睡眠约 `+0.15/小时`；`energy` 清醒约 `-1.2/小时`、睡眠约 `+8/小时`；`sleepPressure` 清醒约 `+4/小时`、睡眠约 `-12/小时`；`socialNeed` 约 `+0.35/小时`；均要求 clamp |
| Threshold           | 给出研究起始迟滞：`hunger >=80 / <=60`、`energy <=20 / >=40`、`sleepPressure >=80 / <=55`、`socialNeed >=70 / <=45`；文件明确这些不是生产承诺，须由 T02 fixture 校准                                                |
| Goal 参与           | 分别产生 `AcquireFood/SatisfyHunger`、`RecoverEnergy`、`Sleep`、`SocialContact`；工作义务产生 `AttendWork`                                                                                                          |
| 冲突                | “energy + sleepPressure”在睡眠动机上有重叠；值方向不统一；`safety` 只在另一个研究流程的 critical 排序中出现，不是本文件 Need                                                                                        |

#### SOURCE-R03

| 字段                | 记录                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 文件                | `/Users/alin/AI项目/mirror-world-life-research/docs/research/RES-M3-001/04-action-selection-pipeline.md`                    |
| 章节/行证据         | 推进派生 Needs `:9-11`；Goal 顺序 `:13-23`；评分公式 `:33-48`                                                               |
| 权威级别            | RES-M3-001 研究流程输入                                                                                                     |
| Need 数量           | 4（文件称“计算四个需求”，但没有再次列名；与 R01/R02 对齐）                                                                  |
| Need 名称           | `energy`、`hunger`、`sleepPressure`、`socialNeed`；另有 `safety` 作为 critical 排序用词，未定义为独立 Need                  |
| 定义                | Needs 由 `lastNeedsAtWorldTime` 到当前 `worldTime` 一次性推进；Goal 优先级再结合 obligation、routine、约束和评分            |
| 值域                | 评分项归一化到 `0..100`；未为各 Need 重新定义方向                                                                           |
| Authority / derived | 明确是派生值；暂停时不推进；Life Engine 只能读快照、计算、提交 ActionRequest                                                |
| 公式                | `score = 0.35*needUrgency + 0.30*obligationUrgency + ... - 0.05*travelCost + deterministicTieBreak`；不是单项 Need 衰减公式 |
| Threshold           | `CRITICAL`、urgent 和 routine 有顺序，但数值阈值未在本文件冻结                                                              |
| Goal 参与           | Needs 参与 Goal 顺序和 `needUrgency`；M4 relationship/memory、future emotion 默认不参与或为零                               |
| 冲突                | `safety` 出现在排序文案但不在四项定义；与正式 tick 任务的 6 项字段不同                                                      |

#### SOURCE-R04

| 字段                | 记录                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------- |
| 文件                | `/Users/alin/AI项目/mirror-world-life-research/docs/research/RES-M3-001/06-invariants.md` |
| 章节/行证据         | `LE-INV-04`、`LE-INV-05` `:10-12`                                                         |
| 权威级别            | 研究不变量输入                                                                            |
| Need 数量           | 4                                                                                         |
| Need 名称           | `energy`、`hunger`、`sleepPressure`、`socialNeed`                                         |
| 定义                | 有界、按世界时间演化、同一 world time 不重复计时                                          |
| 值域                | 四项 `0..100`                                                                             |
| Authority / derived | 研究明确是 Life 派生状态，不是 World Kernel 事实                                          |
| 公式                | 无                                                                                        |
| Threshold           | 无；仅提到边界属性测试                                                                    |
| Goal 参与           | 间接支持睡眠、进食、社交和工作行为不变量                                                  |
| 冲突                | 与正式 6/7 项字段集合不一致；没有解决 `energy` 与 `sleepPressure` 重叠                    |

#### SOURCE-R05

| 字段                | 记录                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------- |
| 文件                | `/Users/alin/AI项目/mirror-world-life-research/docs/research/RES-M3-001/RESULT.md`      |
| 章节/行证据         | 核心结论 `:9-24`                                                                        |
| 权威级别            | RES-M3-001 综合研究结论；非正式实现授权                                                 |
| Need 数量           | 4                                                                                       |
| Need 名称           | “四类核心 Needs”，由 R01/R02 具体化为 `energy`、`hunger`、`sleepPressure`、`socialNeed` |
| 定义                | 四类核心 Needs + 工作义务 → Goals → 六类 Action Candidates；Life Engine 只有建议权      |
| 值域                | 本文件未重复给出；引用四项研究定义                                                      |
| Authority / derived | 明确位置、现金、食物、活动结果和时间由 Kernel/Economy/事件账本拥有；Needs 属于决策输入  |
| 公式                | 无新增公式                                                                              |
| Threshold           | 无新增阈值                                                                              |
| Goal 参与           | 四类 Needs 与工作义务共同参与最小 Goals                                                 |
| 冲突                | 研究自身与正式 M3-T02 六项冲突；不能单独覆盖正式任务                                    |

### 正式来源：6 Needs

#### SOURCE-F01

| 字段                | 记录                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| 文件                | `文档/镜界_完整开发文档库_v1.2/00_顶层与索引/镜界_Codex里程碑任务书_v1.0.docx`                        |
| 章节/行证据         | M3 `Life Engine v1` 任务表；`M3-T02 Needs 模型` 行                                                    |
| 权威级别            | 正式 Codex 里程碑任务书；当前 M3-T02 可执行任务入口                                                   |
| Need 数量           | 6                                                                                                     |
| Need 名称           | `energy`、`hunger`、`social`、`stress`、`money_pressure`、`purpose`                                   |
| 定义                | 六项随时间变化并形成行动压力；任务书未给出各项独立语义、所有权或公式                                  |
| 值域                | T02 通过门槛要求 `0-100`；未说明方向统一方式                                                          |
| Authority / derived | 作为待实现模型的执行范围出现，不声明其为 World Fact；没有说明输入快照和派生规则                       |
| 公式                | 无                                                                                                    |
| Threshold           | 无；仅写 tick 稳定                                                                                    |
| Goal 参与           | 仅通过“形成行动压力”概括，没有 Need→Goal 映射                                                         |
| 冲突                | 缺 `sleepPressure`，多 `stress`、`money_pressure`、`purpose`；`social` 与研究的 `socialNeed` 命名不同 |

#### SOURCE-F02

| 字段                | 记录                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------- |
| 文件                | `文档/镜界_完整开发文档库_v1.2/07_实施与Codex/镜界_M0-M13实施规格与依赖矩阵_v1.0.docx` |
| 章节/行证据         | §4.4 `M3 · Life Engine v1`；`M3-T02 Needs 模型` 任务表行                               |
| 权威级别            | 正式实施规格与依赖矩阵；与 F01 同级的 M3 执行范围记录                                  |
| Need 数量           | 6                                                                                      |
| Need 名称           | `energy`、`hunger`、`social`、`stress`、`money_pressure`、`purpose`                    |
| 定义                | 六项随时间变化；T02 门槛为边界 `0-100` 与 tick 稳定                                    |
| 值域                | `0-100`；方向未定义                                                                    |
| Authority / derived | 执行矩阵层面的待交付字段集合；没有定义 durable authority                               |
| 公式                | 无                                                                                     |
| Threshold           | 无                                                                                     |
| Goal 参与           | 未定义；矩阵把 Goals/Routines/Decision 放在 M3 总交付中，但未拆分到 Need               |
| 冲突                | 与 F01 同样 6 项，和 LifeEngine 专项七项、研究四项冲突                                 |

### 正式来源：7 Needs

#### SOURCE-F03

| 字段                | 记录                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 文件                | `文档/镜界_完整开发文档库_v1.2/03_数字生命与AI/镜界_LifeEngine详细规格_v1.0.docx`                                                                          |
| 章节/行证据         | §3 `Needs v1` 表；§4-§8 的 urgency、score、Goal 说明                                                                                                       |
| 权威级别            | 正式 Life Engine 专项领域规格；比通用任务表更具体，但仍需服从当前 ADR 决策                                                                                 |
| Need 数量           | 7                                                                                                                                                          |
| Need 名称           | `energy`、`hunger`、`social`、`stress`、`safety`、`money_pressure`、`purpose`                                                                              |
| 定义                | `energy` 精力；`hunger` 饥饿；`social` 社交缺口；`stress` 工作冲突/经济压力/睡眠不足形成的压力；`safety` 安全；`money_pressure` 经济压力；`purpose` 目标感 |
| 值域                | 所有项 `0-100`；`hunger`/`social`/`stress`/`money_pressure`/`purpose` 的方向由表格文字部分说明；`safety` 明确高值为安全；`energy` 未明确与压力方向统一     |
| Authority / derived | 规格把 Needs 放在 Life Engine，Resources 单独列为事件驱动；没有给出主权事实和可重建规则                                                                    |
| 公式                | 未给出单项衰减公式；总分包含 `needUrgency`、`goalAlignment`、`relationshipPull`、`stressCost` 等项                                                         |
| Threshold           | 只写达到阈值产生候选，没有数值阈值                                                                                                                         |
| Goal 参与           | urgency 形成候选；Routine 另行产生工作、回家、睡眠、吃饭候选；Relationship pull 也能产生社交候选                                                           |
| 冲突                | 与 F01/F02 少 `safety` 的 6 项不同；与研究 4 项的 `sleepPressure/socialNeed` 不同；`stress` 同时被列作 Need 与短期 Emotion 调制                            |

#### SOURCE-F04

| 字段                | 记录                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 文件                | `文档/镜界_完整开发文档库_v1.2/00_顶层与索引/镜界_全量开发母文档_v1.0.docx`                                                 |
| 章节/行证据         | §6 Life Engine；“基础需求”表；数据模型总表                                                                                  |
| 权威级别            | 顶层正式产品/架构模型；范围最广，不是 T02 的字段级 DoD                                                                      |
| Need 数量           | 7                                                                                                                           |
| Need 名称           | `energy`、`hunger`、`social`、`stress`、`safety`、`money_pressure`、`purpose`                                               |
| 定义                | 基础需求形成行动压力；同节把习惯、情绪、资源分列为不同输入层                                                                |
| 值域                | 数据模型总表中的 `needs` 为 `0-100` 归一化；方向未对七项统一定义                                                            |
| Authority / derived | 架构图把 Life Engine 与 World Kernel、Memory、Economy、Relationship 分开；Needs 是 Life 输入/派生层，不是 Kernel 事实写入口 |
| 公式                | 只有总 score 结构，没有单项 Need 公式                                                                                       |
| Threshold           | 未冻结；母文档要求“urgent needs”进入 tick 流程                                                                              |
| Goal 参与           | Needs、Goal、Routine、Candidate Action 分层；行动必须经过 Kernel                                                            |
| 冲突                | 与 T02 六项和研究四项存在同样的集合、命名、方向冲突                                                                         |

### 其他正式/实现来源：边界证据而非独立 Need 集合

#### SOURCE-F05

| 文件/证据 | `文档/.../镜界_数据库设计与数据字典_v1.0.docx`，数据表总表中的 `resident_states` 与 `needs` 行 |
| 权威级别 | 正式数据规格 |
| Need 数量/名称 | 未规定集合；`resident_states` 列出 `energy`、`hunger`、`stress`，`needs` 表使用开放 `need_type`、`value`、`trend`、`last_updated_at` |
| 值域/公式/阈值 | `needs.value` 为 `0-100` 归一化；没有公式和阈值 |
| Authority / derived | 数据表形状暗示持久化，但没有解决当前值是否事实、如何重放；与本 ADR 的“Needs 为派生状态”存在设计张力 |
| Goal 参与/冲突 | 无；缺少 `sleepPressure`、`socialNeed`、`purpose` 等完整集合定义 |

#### SOURCE-F06

| 文件/证据 | `文档/.../镜界_时间模拟事件与重放规格_v1.0.docx` §2、§6、§8；“更新低成本 needs/cooldown/schedule”与 `NEED_CHANGED` 事件表行 |
| 权威级别 | 正式模拟/事件规格 |
| Need 数量/名称 | 未列集合，只要求低成本 needs 和 `NEED_CHANGED(residentId, needType, before, after)` |
| 值域/公式/阈值 | 无；未说明每秒、每分钟或事件时钟策略 |
| Authority / derived | 事件是 durable truth，但该文档没有区分连续 Need 派生值与离散 Need 变化事件 |
| Goal 参与/冲突 | 需与本 ADR 的 lazy evaluation 对齐；不能按每秒/每分钟连续值污染 Event Ledger |

#### SOURCE-F07

| 文件/证据 | `文档/.../镜界_WorldKernel详细规格_v1.0.docx` §3-§6：EAT/SLEEP 结果包含 `NEED_CHANGED`，`ActionResult` 负责结果引用 |
| 权威级别 | 正式 Kernel 事实提交规格 |
| Need 数量/名称 | 未定义集合；只规定动作结果可能改变需求 |
| 值域/公式/阈值 | 无 |
| Authority / derived | Kernel 拥有 accepted action/event 事实；Life Engine 不能直接改 Need 或推断动作已成功 |
| Goal 参与/冲突 | 支持 Need→Goal→Action 分层；不裁决 4/6/7 数量 |

#### SOURCE-F08

| 文件/证据 | `docs/verification/M3-T01-report.md:42-48`、`:79-93` |
| 权威级别 | 已通过 T01 的实现范围与验证事实 |
| Need 数量/名称 | 0 个已实现；报告列举未创建 `energy`、`hunger`、`social`、`stress`、`money_pressure`、`purpose`、`safety`、`sleepPressure` 等 evolving state |
| 值域/公式/阈值 | 不适用 |
| Authority / derived | T01 没有创建 Needs authority；冲突明确留给 pre-T02 ADR |
| Goal 参与/冲突 | 不适用；证明本 ADR 可以只做文档决策，不需要回滚 T01 |

#### SOURCE-C01

| 文件/证据 | `packages/world-kernel/src/world-events-store.ts:4-19`、`packages/world-kernel/src/world-replay.ts:191-223` |
| 权威级别 | 当前实现能力事实，不是 Needs 设计授权 |
| Need 数量/名称 | 0 个运行时 Need；只有 `NEED_CHANGED` 事件名 |
| 值域/公式/阈值 | 无 |
| Authority / derived | 事件只能由 Kernel 提交；当前 replay 对该事件做结构化 no-op，不能作为 Need state source |
| Goal 参与/冲突 | 无；提醒未来领域事件必须先定义 payload/reducer，再决定是否记录离散摘要 |

### 跨里程碑边界来源

#### SOURCE-B01：M4 Relationship / Memory

`/Users/alin/AI项目/mirror-world-m4-research/docs/research/RES-M4-001/05-relationship-model.md:175-185` 将关系投影作为 M3 决策的后续确定性 signal，并以 `affinity`、`conflict`、`trust` 调制 TALK 和压力；它不是 M3 内部 Social Need。`.../10-identity-institution-boundary.md` 也把实时硬状态、关系和个人记忆分层。结论：M3 只允许基于自身的 `SocialPressure` 和最小 `lastSocialContactWorldTime`，不得提前实现关系、信任、好感、冲突或记忆主权。

#### SOURCE-B02：M6 Economy / resource bridge

`/Users/alin/AI项目/mirror-world-economy-research/docs/research/RES-M6-001/09-m3-resource-bridge.md:18-47`、`:51-73`、`:79-90` 明确 `cashCents` 和 `foodUnits` 是 Kernel-owned 只读资源快照；M3 使用 seed adapter，M6 再切换真实 accounts/inventory。`.../02-money-authority.md:52-72` 将钱定义为 Kernel/Economy 账户转移事实。结论：`foodUnits` 不是 `HungerPressure`，`cashCents` 不是 `MoneyPressure`；M3 不得创建假的经济真相。

#### SOURCE-B03：Hybrid Tick/Event / Lazy Decay

`/Users/alin/AI项目/mirror-world-m2-oss-research/docs/research/RES-M2-OSS-001/09-tick-event-model.md:26-55` 推荐连续空间与高频交互使用局部 Tick，离散事实使用 Event，生理需求使用 world-time anchor lazy evaluation；闲置居民 8 小时不产生逐秒写入。`DECISION.md:84-91` 将该 Hybrid + lazy 方向列为镜界采用建议。结论：本 ADR 采用 lazy evaluator 作为计算原语，以 scheduled wake/event reaction 作为未来触发方式。

## 未找到的候选名称

`belonging`、`status`、`purpose` 以外的独立“归属/地位” Need 没有在 4/6/7 定义表中出现；`emotion` 在正式 Life 文档中作为独立 Emotion 层出现，而非 4/6/7 Need 集合。它们不会因为搜索命中就被偷偷加入 M3 v1；若未来要成为 Need，必须另行形成来源、事实输入、行为响应和 ADR。

## 冲突摘要

| 冲突           | 4 Needs 研究               | 6 Needs 正式任务    | 7 Needs 正式领域/母文档 | 本审计保留的事实                                         |
| -------------- | -------------------------- | ------------------- | ----------------------- | -------------------------------------------------------- |
| 睡眠语义       | `sleepPressure`            | 没有单独字段        | 没有单独字段            | `sleepPressure` 是睡眠缺口，不能被 `energy` 静默替代     |
| 精力语义       | `energy` 高值好            | `energy` 未定义方向 | `energy` 未定义方向     | `EnergyLevel` 是能力/投影，不独立计为压力 Need           |
| 社交命名       | `socialNeed`               | `social`            | `social`                | 收敛为同一 `SocialPressure`，不是两个 Need               |
| stress         | 没有独立 Need              | 有                  | 有且也参与 Emotion      | M3 不具备稳定事实输入，延后                              |
| safety         | 只在 R03 critical 文案出现 | 没有                | 有                      | 作为环境/Kernel 约束信号，延后，不扩为 M3 Need           |
| money_pressure | M3 明确不建立              | 有                  | 有                      | 现金/食物先作为只读资源，正式压力等 M6                   |
| purpose        | 没有                       | 有                  | 有                      | 缺乏可测试事实输入和当前行为闭环，延后                   |
| 持久化         | 可缓存、可重算             | 未说明              | `needs` 表暗示保存      | anchor/event/policy 可重建；当前值不作为第二真相逐次写入 |

本审计的最终分类和正式决策见 `docs/adr/ADR-0007-m3-life-engine-needs-model-v1.md`。
