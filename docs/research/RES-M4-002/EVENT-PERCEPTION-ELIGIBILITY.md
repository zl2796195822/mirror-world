# EVENT-PERCEPTION-ELIGIBILITY

## 1. 原则

- 名称不能直接决定可见性。
- 资格由：**event nature + location authority + participant roles + privacy class** 共同决定。
- eligible ≠ remembered。

## 2. Privacy / Visibility classes

| Class                 | 含义                | 默认 subject set                                              |
| --------------------- | ------------------- | ------------------------------------------------------------- |
| `PRIVATE_SELF`        | 几乎仅当事人可知    | actor（+ 未来 household 授权）                                |
| `LOCAL_PARTICIPATORY` | 同地点可旁观        | actor/target + co-presence                                    |
| `LOCAL_TRANSIT`       | 位移起点/终点可察觉 | source location co-presence（完成时 destination co-presence） |
| `PUBLIC_RECORD`       | 可公告/制度可见     | 明确授权的 public channel（v1 极少）                          |

## 3. 当前已实现事件矩阵

| Event                      | Participants                   | Semantic location source                         | v1 Class                | Who may perceive                   | Notes                        |
| -------------------------- | ------------------------------ | ------------------------------------------------ | ----------------------- | ---------------------------------- | ---------------------------- |
| `WORLD_TIME_ADVANCED`      | none                           | n/a                                              | `PRIVATE_SELF` / system | **无居民 Perception**              | 控制事件，不应生成社交记忆   |
| `RESIDENT_MOVE_STARTED`    | actor                          | `payload.sourceLocationId`                       | `LOCAL_TRANSIT`         | source location co-presence；actor | 刚离开时在场者可能注意到出发 |
| `RESIDENT_MOVE_COMPLETED`  | actor；destination as targetId | `payload.destinationId` / final runtime location | `LOCAL_TRANSIT`         | destination co-presence；actor     | 到达可被同地点观察           |
| `RESIDENT_SLEEP_STARTED`   | actor                          | `payload.sourceLocationId`（须 HOME）            | `PRIVATE_SELF`          | actor only（v1）                   | 不得全街广播“某人睡了”       |
| `RESIDENT_SLEEP_COMPLETED` | actor                          | HOME                                             | `PRIVATE_SELF`          | actor only（v1）                   | 醒来默认非公共事件           |

## 4. 预留但未实现事件的建议资格（仅规划，不实现）

| Event                     | 建议 Class                             | 说明                                   |
| ------------------------- | -------------------------------------- | -------------------------------------- |
| `CONVERSATION_COMPLETED`  | `LOCAL_PARTICIPATORY`                  | 参与者 DIRECT；同店 CO_PRESENCE 或可闻 |
| `PURCHASE_COMPLETED`      | `LOCAL_PARTICIPATORY`                  | 店内可见；金额细节可只给参与者         |
| `WORK_SHIFT_COMPLETED`    | `LOCAL_PARTICIPATORY` / private detail | 同事可感知在岗事实                     |
| `WAGE_PAID` / `RENT_PAID` | `PRIVATE_SELF` / `PUBLIC_RECORD`       | 更像凭据；默认不给旁观者               |
| `EMPLOYMENT_CHANGED`      | `LOCAL_PARTICIPATORY`                  | 工作场所相关方可知                     |
| `RELATIONSHIP_CHANGED`    | **N/A in v1**                          | 不作为 Kernel 权威事实写入             |
| `MEMORY_CREATED`          | **N/A in v1**                          | 不写 Event Ledger                      |

## 5. Eligibility algorithm (v1)

```text
for each committed event E:
  if E is system/control event: skip residents
  resolve eventLocation L from typed envelope (column or payload contract)
  resolve participants P = actor/target residents
  class = eligibilityPolicy(E.type)
  subjects =
    P                         if class in {PRIVATE_SELF, LOCAL_*, PUBLIC_*}
    + coPresence(L)           if class in {LOCAL_TRANSIC, LOCAL_PARTICIPATORY}
  for s in subjects:
    if class == PRIVATE_SELF and s not in P: drop
    emit PerceptionCandidate(s, E, channelFor(s,E), confidenceBaseline)
```

## 6. Co-presence source of truth

- **唯一权威**：`resident_runtime_states.current_location_id`（world-time aligned）。
- 不得用 3D avatar position 作为 M4 v1 前提。
- TRAVELING 期间：仍以 current location（source）为准，直到 COMPLETED 切换。
- SLEEPING：在家，但 SLEEP 事件本身 private。

## 7. Hard invariants

1. **No Global Event Broadcast Rule**  
   A 在咖啡店的事件，Z 在家不得自动形成 Memory。
2. 非 eligible 的 resident：0 Perception，0 Memory。
3. eligibility 与 attention 分离：eligible 仍可被 AFS 丢弃。
4. future personality/relationship 可影响 **encoding/attention**，不得回头改写 World Event。
5. eligibility policy 必须版本化（建议 `m4-eligibility-v1`）。

## 8. 对 MOVE/SLEEP 的明确裁决

- MOVE：**可被局部观察**，支持“街上有人走动”的社会感。
- SLEEP：**默认不可被他人观察**，避免睡眠变成公共表演。
- 二者都不得因为系统知道事件就全城入忆。
