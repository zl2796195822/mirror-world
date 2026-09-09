# DECISION

## 最终裁决

$$\mathbf{RES\text{-}M4\text{-}002 = READY\_WITH\_RISKS}$$

含义：

- M4 架构 **整体方向仍成立**
- 必须按当前真实 main 做明确适配
- **不意味着** M4 已实现或可以立刻开工
- 当前仍应完成 M3 / PRE-AL-06 / PRE-AL-07 / full replay 链路

---

## 1. Event ≠ Observation ≠ Memory

**继续成立。**

- World Event：权威已发生事实（Event Ledger）
- Observation：居民有机会感知的输入
- Memory：居民最终编码保留的主观内容

禁止：Event 全局广播后直接变 Memory。

---

## 2. Decision Observation vs M4 Perception

**必须分层。**

|           | Decision Observation            | Perception Observation  |
| --------- | ------------------------------- | ----------------------- |
| 现有/未来 | 已有 `WorldObservationSnapshot` | 未来 M4                 |
| 用途      | Life Engine 当前决策            | Event→Memory 管线       |
| 版本      | `m3-observation-v1`             | 建议 `m4-perception-v1` |

禁止合并成巨大 Observation object。

---

## 3–6. KEEP / ADAPT / REJECT / DEFER

### KEEP

- Event append-only、world_seq、0/1/N outcome
- 反全局广播
- 有向关系、Facts→Projection→State
- Zero-LLM baseline
- Vector ≠ Truth
- Forgetting 不删事件
- Memory 属 Resident
- SocialPressure ≠ Relationship

### ADAPT

- ObservationEnvelope → PerceptionObservation
- 物理视听信道 → semantic location co-presence
- 阈值/权重 → policy CALIBRATION
- identity decay=0 → high-retention policy
- memory replay → dual-mode
- 关系变化来源 → observed interactions，不是 Kernel 主观写 trust

### REJECT

- `RELATIONSHIP_CHANGED` 作为 v1 Kernel 权威主观事实
- `MEMORY_CREATED` 作为 v1 World Event
- 一次建 7 类记忆表
- embedding 768 进 domain contract
- “world_events only → identical memories” 无条件声明
- 3D raycast 作为 M4 前提

### DEFER

- Institutional / Collective / Culture memory
- Procedural learning
- Full emotion simulation
- Complex rumor networks beyond minimal second-hand
- Performance SLA freeze
- Digital Twin memory import

---

## 7. Memory taxonomy v1

1. **Episodic**（CORE）
2. **Semantic**（minimal consolidation）
3. **Relationship**（directional projection state）
4. Emotional / Identity milestone = attributes/policy，不独立铺表

---

## 8–9. Relationship

- Dimensions v1 candidate：familiarity, trust, affinity, conflict, obligation  
  （dependency 可 defer）
- Directional：`worldId + from + to`
- 不得单行双向共享

---

## 10–11. Perception rule / No global broadcast

- subject set = participants + semantic co-presence（按 type eligibility）
- A 在咖啡店的事件，Z 在家不得自动形成记忆
- Hard invariant

---

## 12–15. Lineage / persistence / replay

- MemorySourceRef 必备
- Observation persistence 推荐 **C**
- Memory replay：Historical vs Re-derived 必须拆开
- Relationship replay：需 policy versions + cursor/lineage

---

## 16–17. Forgetting / pgvector

- Forgetting 仅 resident cognitive state
- pgvector = rebuildable retrieval index

---

## 18. Zero-LLM

M4 v1 deterministic baseline 必须完整可运行；LLM 只能 enrichment。

---

## 19–21. Event gaps / causation / concurrency

- **P1 risk**：`world_events` 无 location 列；互动事件未实现
- Causation：Action 内足够；跨事件 P2，设计兼容未来
- Idempotency：source identity / projection cursor；worldSeq 顺序

---

## 22–24. Scope / prerequisites / gate

- Minimal scope 见 `M4-FORMAL-SCOPE.md`
- Prerequisite：M3 PASS + stable runtime/events envelope；不要求 M5/M6/M7
- Gate 候选见 `M4-GATE-PROPOSAL.md`

---

## 25–27. M5 / M6 / M7 boundary

- M5：bounded read + candidates；禁直写
- M6：经济事实经事件→感知→投影；禁 economy 直改 trust
- M7：可增强感知；M4 v1 不依赖 3D

---

## 28. Society Alpha

M4 PASS 后，30 居民应表现出：关键互动记忆、差异化有向关系、行为受过去影响、重启不消失、不覆写 World Truth、可验证 lineage。

---

## 29–30. Port plan / risks

见 `PORT-PLAN.md`、`RISKS.md`。

---

## 对 M3/PRE-AL 的反向要求

**无膨胀要求。**  
PRE-AL-06/07 继续按既有 Action Loop 目标执行；本研究只标记 M4 未来 prerequisite 与 P1 event envelope risk。

---

## FREEZE

```text
RES-M4-002 COMPLETE
FREEZE = ON
DO NOT implement M4-T01 / migrations / tables / pgvector production work
NEXT: wait M3 = PASS → short M4 Formal Readiness Review on then-latest main
     → ADR → Formal M4 Task → TDD → Migration
```
