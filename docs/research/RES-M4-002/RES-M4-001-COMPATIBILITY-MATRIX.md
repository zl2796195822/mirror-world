# RES-M4-001-COMPATIBILITY-MATRIX

以 baseline main `1359cd9…` 的 production reality 覆盖 RES-M4-001 假设。  
分类：**KEEP / ADAPT / REJECT / DEFER**。

## 1. 总判

| RES-M4-001 主张                                  | 现状对照                                            | 裁决                               |
| ------------------------------------------------ | --------------------------------------------------- | ---------------------------------- |
| Event ≠ Memory 第一性原则                        | 与 main 一致；Event Ledger append-only 已落地       | **KEEP**                           |
| 严禁全城全局广播                                 | main 尚无 Perception；该规则仍是未来 hard invariant | **KEEP**                           |
| Facts → Projection → State 关系架构              | 与 Kernel 权威 + 可重算投影方向一致                 | **KEEP**                           |
| A→B ≠ B→A 有向关系                               | main 无关系表；方向性仍正确                         | **KEEP**                           |
| Zero-LLM deterministic baseline                  | 与 LLM Zero Fact Authority 一致                     | **KEEP**                           |
| Vector Index ≠ Memory Truth                      | 仍正确                                              | **KEEP**                           |
| Forgetting 不删 World Event                      | 与 append-only Event Ledger 一致                    | **KEEP**                           |
| Memory ownership = resident_id                   | 与 ActorRef/Resident 分离一致                       | **KEEP**                           |
| Relationship ≠ SocialPressure                    | ADR-0007 已正式分离                                 | **KEEP**                           |
| 视觉/听觉物理信道（raycast/声学衰减）            | main 只有 semantic location；M7 未开                | **ADAPT → semantic perception v1** |
| ObservationEnvelope 六信道                       | v1 收缩为最小 channel set                           | **ADAPT**                          |
| AFS threshold 0.20                               | 可作 CALIBRATION，不得写成世界物理常数              | **ADAPT（标定）**                  |
| retrieval weights 20/25/25/15/15                 | 不得在正式 M4 首日冻结                              | **DEFER**                          |
| identity milestone decay=0 数学常数              | 改为 high-retention policy                          | **ADAPT**                          |
| embedding dim 768 进 domain contract             | 不得进入领域契约                                    | **REJECT**                         |
| `<3ms` 性能承诺                                  | 无真实 benchmark                                    | **DEFER / UNPROVEN TARGET**        |
| world_events only → identical memories           | 缺 policy versions / encoding decisions 时不可能    | **ADAPT**                          |
| RELATIONSHIP_CHANGED 作为 Kernel 权威 World Fact | 关系是居民主观投影；Kernel 只应写客观互动事实       | **REJECT（v1）/ 重定义**           |
| MEMORY_CREATED 作为 World Event                  | 记忆创建是认知态，不是世界事实                      | **REJECT（v1）**                   |
| 一次建 7 张 memory table                         | 与精益 M4 v1 冲突                                   | **REJECT**                         |
| pgvector 唯一向量方案                            | 可用，但是 retrieval index 而非 truth               | **KEEP（边界）**                   |
| Mem0/Letta 不作生产核心                          | 仍正确                                              | **KEEP**                           |
| 夜间 SLEEP 驱动巩固                              | 可作未来 trigger 候选，但 v1 不强制依赖 scheduler   | **ADAPT**                          |
| Institutional / Collective Memory                | 范围失控风险                                        | **DEFER**                          |
| Procedural learning                              | 属后续                                              | **DEFER**                          |
| Full emotional simulation                        | 情绪作 attributes 即可                              | **DEFER**                          |

## 2. 结构层兼容性

| RES-M4-001 组件         | 当前 main 可对接点                                     | 裁决      | 必要适配                                                                          |
| ----------------------- | ------------------------------------------------------ | --------- | --------------------------------------------------------------------------------- |
| World Event 源          | `world_events` + `WORLD_EVENT_TYPES`                   | KEEP      | 需补齐 location/causation 等 P1 字段（见 EVENT-REQUIREMENTS）                     |
| ObservationEnvelope     | 无正式实现；与 `WorldObservationSnapshot` **不可合并** | ADAPT     | 新建 Perception Observation contract，复用 worldId/residentId/sourceWorldSeq 概念 |
| Attention / AFS         | 无                                                     | KEEP 概念 | 权重与阈值全部 policy-versioned / CALIBRATION                                     |
| Episodic Memory         | 无表                                                   | KEEP 概念 | structured core + optional narrative；source lineage 必填                         |
| Semantic Memory         | 无表                                                   | KEEP 概念 | 从 episodic consolidate；belief ≠ world truth                                     |
| Relationship projection | 无表                                                   | KEEP 概念 | 来源必须是 **observed interaction**，不是 Kernel 直接写 trust                     |
| Replay 重建 Memory      | M2 replay 只重建 world history                         | ADAPT     | 拆 Historical Cognitive Replay vs Re-derived Projection                           |

## 3. 事件语义层

| RES-M4-001 假设事件       | main reality    | M4 处理                                                               |
| ------------------------- | --------------- | --------------------------------------------------------------------- |
| RESIDENT_MOVED            | 类型预留，未写  | 以 `RESIDENT_MOVE_STARTED/COMPLETED` 为准                             |
| TALK / CONFLICT / LOAN 等 | 未实现 executor | M4 v1 不得伪造；先用 MOVE/SLEEP + 未来 TALK world interaction         |
| RELATIONSHIP_CHANGED      | 仅类型名预留    | **不要**当权威关系事实；改为 interaction events + resident projection |
| MEMORY_CREATED            | 仅类型名预留    | v1 不写 Event Ledger                                                  |
| PURCHASE / WAGE / RENT    | 未实现          | DEFER 到 M6；可作未来 perception source                               |

## 4. 与 Decision Observation 的强制分层

|        | Decision Observation       | M4 Perception Observation                 |
| ------ | -------------------------- | ----------------------------------------- |
| 现名   | `WorldObservationSnapshot` | 建议 `PerceptionObservation` / envelope   |
| policy | `m3-observation-v1`        | 未来 `m4-perception-v1`                   |
| 用途   | Life Engine 当前决策       | Event → Attention → Memory                |
| 输入   | 当前世界/居民状态快照      | committed world events + location/context |
| 输出   | Need/Goal 决策输入         | Memory candidates / encoded memories      |
| 持久化 | 否（读模型）               | 见 OBSERVATION-PERSISTENCE 推荐           |

**裁决：KEEP 两层分离。禁止合并成巨型 Observation object。**

## 5. 与 PRE-AL-05 生命周期对齐

- MOVE/SLEEP 的 STARTED/COMPLETED 事件已具备：actor、source/destination location、world times、policyVersion、actionRequestId。
- 这使 **同地点居民可被判定为 perception candidates**，无需 3D。
- SLEEP 事件更偏 private/household；不得自动成为全街可见事实。
- 详细矩阵见 `EVENT-PERCEPTION-ELIGIBILITY.md`。

## 6. 最终兼容性结论

RES-M4-001 的 **哲学骨架与边界纪律整体仍然成立**，因此不是 `NEEDS_REDESIGN`。  
但它在“物理视听路由”“Kernel 写关系事实”“world_events-only 记忆重放”“阈值常数固化”“向量维度进契约”等点上，**必须按当前 main 做系统性适配**。

**总状态方向：`READY_WITH_RISKS`**（正式确认见 `DECISION.md`）。
