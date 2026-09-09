# RISKS

## 1. 架构风险

| 风险                                 | 级别        | 说明                                         |
| ------------------------------------ | ----------- | -------------------------------------------- |
| 事件缺稳定 location envelope         | P1          | 表无 location_id，仅 payload                 |
| 把预留类型名当成已实现事实           | P1 设计风险 | RELATIONSHIP_CHANGED/MEMORY_CREATED 只是名字 |
| 合并 Decision/Perception Observation | P1          | 会破坏 M3/M4 边界                            |
| Kernel 直接写主观关系                | P1          | 污染 Event Ledger                            |
| 声称 world_events-only 可复原记忆    | P1          | 忽略 policy/encoding decisions               |

## 2. 产品风险

| 风险             | 说明                       |
| ---------------- | -------------------------- |
| 记忆过少         | 过度过滤导致世界“没有过去” |
| 记忆过多         | 全量入忆导致存储与全知感   |
| 关系漂移不可解释 | 退回 score+=5              |
| 范围失控         | 一次做文化/机构/情绪/LLM   |

## 3. 工程风险

| 风险                | 说明               |
| ------------------- | ------------------ |
| projection 非幂等   | 重复事件重复加分   |
| policy 常数写死     | 后续无法标定       |
| vector 绑架真相     | 索引损坏即记忆损坏 |
| 依赖 M5 才能验证 M4 | 边界倒置           |

## 4. 项目状态风险

- M3 仍 IN_PROGRESS；M3-T04 blocked
- PRE-AL-06/07 与 full replay 未完成
- 过早实现 M4 会重蹈 M3-T04 gate 教训

## 5. 缓解

- 严格 FREEZE 本研究
- M3 PASS 后做 Formal Readiness Review
- 先 semantic perception，不做 3D
- zero-LLM + idempotent projection 先行
