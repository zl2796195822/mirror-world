# OBSERVATION-PERSISTENCE

## 1. 三种方案

| 方案 | 内容                                                                           |
| ---- | ------------------------------------------------------------------------------ |
| A    | 所有 Perception Observation durable persist                                    |
| B    | 仅最终 Memory durable                                                          |
| C    | 重要 observation lineage / compact envelope durable；普通 perception ephemeral |

## 2. 比较

| 维度              | A 全持久化 | B 仅 Memory | C 混合 |
| ----------------- | ---------- | ----------- | ------ |
| Historical replay | 最强       | 弱          | 中强   |
| Storage growth    | 极高       | 低          | 可控   |
| Debug / audit     | 最好       | 差          | 好     |
| Privacy surface   | 大         | 小          | 中     |
| Complexity        | 高         | 低          | 中     |

## 3. 推荐

**M4 v1 推荐方案 C。**

理由：

1. 30 居民社会模拟首先需要“记得关键互动”，不是保存每一次眨眼。
2. 现有 Event Ledger 已提供客观源；再全量保存所有 perception 会重复爆炸。
3. 成功编码的记忆必须带 compact source/perception lineage，否则无法审计。
4. 丢弃噪音的 ephemeral 不损害 World Truth。

## 4. C 的最小 durable envelope

当且仅当 memory encoding 发生时，保留：

- eventId / seq / type
- observerResidentId
- channel / role / confidence / salience
- locationId
- perceivedAtWorldTime
- policy versions

未过 attention gate 的 observation：不入 durable store。

## 5. 禁止

- 把 Observation 伪装成 World Event
- 把 ephemeral retrieval scores 写入 durable cognitive tables
- 让 Decision Observation snapshot 持久化成“居民记忆”
