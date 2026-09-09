# RESULT

## 1. 任务状态

- **任务编号**: RES-M4-002
- **状态**: `COMPLETED / RESEARCH_ONLY`
- **最终裁决**: `READY_WITH_RISKS`
- **Baseline main**: `1359cd91317352ac8268cd7220a3abc9aa8e832f`
- **Branch**: `research/m4-memory-relationship-compatibility-v2`
- **Worktree**: `/Users/alin/AI项目/mirror-world-m4-compat-res-m4-002`
- **PRE-AL-06**: `PENDING_PRE_AL_06`（report 不存在；本研究未等待）

## 2. 一句话结论

RES-M4-001 的哲学与边界纪律仍然成立；在当前 main 上必须完成系统性适配后，未来 M4 才可开工。  
**不批准现在实现 M4。**

## 3. Compatibility summary

| 域                                   | 结论                                                  |
| ------------------------------------ | ----------------------------------------------------- |
| Event ≠ Observation ≠ Memory         | KEEP                                                  |
| Decision Observation vs Perception   | KEEP 分层，禁止合并                                   |
| No global broadcast                  | KEEP hard invariant                                   |
| Memory taxonomy                      | Episodic + minimal Semantic + Relationship projection |
| Relationship model                   | Directional projection from observed interactions     |
| RELATIONSHIP_CHANGED as Kernel truth | REJECT v1                                             |
| MEMORY_CREATED as world event        | REJECT v1                                             |
| Physical visual/audio channels       | ADAPT → semantic location v1                          |
| AFS/retrieval numeric constants      | CALIBRATION / DEFER freeze                            |
| pgvector                             | index only                                            |
| world-events-only memory replay      | REJECT as unconditional claim                         |
| Zero-LLM baseline                    | KEEP required                                         |

## 4. 对 30 个最终问题的简答

1. Event ≠ Observation ≠ Memory 成立吗？**是，继续成立。**
2. Decision Observation 与 Perception 如何分层？**两套契约；共享 worldId/residentId/sourceWorldSeq 概念，不合并对象。**
3. KEEP？**事件源、反广播、有向投影、零 LLM、遗忘不删事件、resident ownership、vector≠truth、SocialPressure 分离。**
4. ADAPT？**感知信道、Observation 命名与范围、阈值/权重标定、identity retention、memory replay 模式、关系事实来源。**
5. REJECT？**Kernel 写主观关系真相、MEMORY_CREATED 入账 v1、7 表一次铺开、768 进 domain、无条件 world-events-only 复原记忆。**
6. DEFER？**机构/集体记忆、程序学习、完整情绪模拟、复杂传播网络、性能 SLA 冻结、Digital Twin 记忆导入。**
7. Memory 类型？**Episodic + minimal Semantic；Relationship 作 projection；Emotional/Identity 作 attributes/policy。**
8. Relationship dimensions？**v1 候选 familiarity/trust/affinity/conflict/obligation；dependency 可 defer/merge。**
9. Directional model？**UNIQUE(world, from, to)，A→B ≠ B→A。**
10. Event perception rule？**participants + semantic co-presence + type eligibility；禁止全城广播。**
11. No-global-broadcast？**Hard invariant。**
12. Memory lineage？**MemorySourceRef 至少 worldId/eventId/seq/type/channel/role/policies。**
13. Observation persistence？**方案 C：成功编码保留 compact lineage，噪音 ephemeral。**
14. Memory replay？**拆 Historical Cognitive Replay 与 Re-derived Projection；v1 至少后者 + restart persistence。**
15. Relationship replay？**需 eligibility+projection policy+cursor；不可只靠 world_events 一句话。**
16. Forgetting？**只影响 resident memory；policy-versioned；identity 用 high-retention 而非 decay=0 常数。**
17. pgvector？**retrieval index only；可删除。**
18. Zero-LLM baseline？**M4 v1 必须。**
19. Event P1 gaps？**缺稳定 location envelope；互动事件未实现；类型名预留不可当真。**
20. Causation decision？**Action 内 correlation/outcome 足够；跨事件因果 P2，设计须兼容未来 causation。**
21. Concurrency/idempotency？**source identity / cursor；resident-scoped worldSeq 顺序。**
22. M4 minimal scope？**见 M4-FORMAL-SCOPE 九项。**
23. Prerequisites？**M3 PASS + stable residents/runtime/events envelope；不要求 M5/M6/M7。**
24. Gate proposal？**见 M4-GATE-PROPOSAL。**
25. M5 boundary？**可读 bounded memory、提交 candidates；不可直写表/改 trust/写 World Fact。**
26. M6 boundary？**经济事件经 perception/projection 进入认知；Economy 不直改 trust。**
27. M7 boundary？**可增强感知；M4 v1 不得依赖 raycast/avatar gaze/3D hearing。**
28. Society Alpha criteria？**记得关键互动、差异化关系、行为受过去影响、重启不丢、不覆写真相、可验证。**
29. Port plan？**见 PORT-PLAN。**
30. Risks？**见 RISKS。**

## 5. 交付物

本目录 35 份研究文档；零 runtime/migration/dependency 变更。

## 6. FREEZE

`FREEZE = ON`。等待 M3 PASS 后对当时最新 main 做 M4 Formal Readiness Review。
