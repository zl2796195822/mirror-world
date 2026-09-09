# EVENT-TO-PERCEPTION

## 1. 正式建议链（M4 v1）

```text
Committed World Event
        ↓
Perception Candidate
        ↓
Observation Policy (eligibility + channel + confidence)
        ↓
Resident-scoped Perception Observation
        ↓
Attention / Salience gate
        ↓
Memory Candidate
        ↓
Memory Encoding
        ↓
Memory Store
```

### 铁律

- 不是所有 Event 都产生 Perception。
- 不是所有 Perception 都形成 Memory。
- 不是所有 Memory 都永久保留。
- **禁止 Global Broadcast。**

## 2. 与 RES-M4-001 五级流水线对照

| RES-M4-001          | RES-M4-002 修订                              |
| ------------------- | -------------------------------------------- |
| World Event         | KEEP                                         |
| ObservationEnvelope | ADAPT → PerceptionObservation（semantic v1） |
| Memory Candidate    | KEEP                                         |
| Encoding            | KEEP（structured core first）                |
| Persistent Memory   | KEEP                                         |

## 3. M4 v1 最小 channel set

RES-M4-001 六信道对 v1 过重。建议：

| Channel v1             | 含义                            | 何时用                    |
| ---------------------- | ------------------------------- | ------------------------- |
| `DIRECT_PARTICIPATION` | actor / target                  | 自己发起或被针对          |
| `CO_PRESENCE`          | 同一 semantic location 的旁观者 | 场所内可见/可闻的公共互动 |
| `SECOND_HAND_TALK`     | 经正式 TALK 传播                | M5/TALK 后；v1 可接口预留 |
| `PUBLIC_RECORD`        | 系统公告/制度凭据               | 极少；后续                |

### 明确延后

- `DIRECT_VISUAL` raycast
- `DIRECT_AUDITORY` 声学衰减
- NavMesh / AOI / 3D gaze

这些属于 M7 realism，不是 M4 prerequisite。

## 4. Perception Candidate 生成规则（semantic v1）

对每个 committed event：

1. 读取 event 的 actor/target/location（来自列或 typed payload）。
2. 解析 **subject set**：
   - actor、target（若为 resident）
   - 当前 `resident_runtime_states.current_location_id == eventLocation` 且非 actor/target 的 residents
3. 对每个 subject 生成 candidate：
   - actor/target → `DIRECT_PARTICIPATION`，confidence baseline 1.0
   - co-presence → `CO_PRESENCE`，confidence baseline 由 policy（建议 0.6–0.9，**CALIBRATION**）
4. 过 event-type eligibility（见 eligibility matrix）。
5. 不在 subject set 的 resident：**零 Perception**。

## 5. Subjective slice

- 禁止无脑 clone 整个 `world_events.payload`。
- 只保留该 observer 可知字段：
  - participant ids
  - location kind/id
  - action phase
  - public outcome flags
- private fields（若未来存在）只给 DIRECT_PARTICIPATION。

## 6. Attention gate

```text
AFS = salience × confidence × roleWeight
```

- roleWeight：ACTOR/TARGET=1.0；CO_PRESENCE=0.5；INDIRECT=0.3（建议值，CALIBRATION）
- threshold 全部 policy-versioned；RES-M4-001 的 0.20/0.50 仅作 baseline calibration
- 低于 discard threshold：不落 Memory，不占 durable store

## 7. Encoding

M4 v1 必须 structured-first：

```text
structured core (ids, times, location, type, confidence, salience, role)
+ optional narrative projection (later / optional LLM)
```

禁止“一段 LLM prose 作为唯一 truth”。

## 8. World Time / Pause

- Perception 使用 World Time，不用 wall clock。
- `PAUSED/MAINTENANCE` 不推进新的 world events，因此不产生新的 perception stream。
- 已存在 events 的 replay/projection 仍可按显式时间输入执行。

## 9. 与 Life Engine 的关系

- Life Engine 继续只读 Decision Observation。
- Memory/Relationship 属于未来 M4 cognitive layer。
- M4 可向 Life Engine 提供 **bounded read ports**（例如“对 B 的 trust 摘要”），但不能让 Life Engine 直接 SQL memory tables。
- SocialPressure 仍不等于 Relationship。

## 10. 结论

M4 v1 采用：

`Committed Event → semantic eligibility → PerceptionObservation → attention → encoded Episodic Memory`

物理视听、第二手复杂传播网络、全局广播：全部 OUT。
