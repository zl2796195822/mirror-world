# ADR-0007 Life Engine Needs Model v1

Status: Accepted
Date: 2026-09-08
Milestone: M3 pre-M3-T02 gate
Decision ID: `ADR-M3-001`

## Context

M3-T01 已在 `main@aa156aa56e2bc509f31bf6c8bc5234bc1c157928` 通过。T01 只生成 30 个固定 seed 居民 fixture，没有创建 Needs runtime、表、migration 或 Life Engine。进入 M3-T02 前，正式文档与研究文档出现了 4 → 6 → 7 的 Needs 范围漂移：

- RES-M3-001 的最小居民状态和 Life Engine 研究使用 `energy/hunger/sleepPressure/socialNeed` 四项，并把工作义务单独处理。
- 正式 Codex 任务书和 M0-M13 实施矩阵将 T02 写成 `energy/hunger/social/stress/money_pressure/purpose` 六项。
- 正式 Life Engine 专项规格和全量母文档列出 `energy/hunger/social/stress/safety/money_pressure/purpose` 七项。

逐来源证据在 `docs/architecture/m3-needs-source-audit.md`。本 ADR 是职责裁决，不是 M3-T02 实现授权。

## Problem and non goals

如果机械选择四、六或七项中的一个数字，会把睡眠、能力、资源、关系、经济和长期价值混成同一层，并迫使 M3 伪造缺失事实。M3 需要在无 LLM、固定 seed、可 replay 的条件下支持 30 个居民 × 30 个世界日的基础生活闭环，但不应提前实现 M4 Relationship/Memory 或 M6 Economy。

本 ADR 不实现：Needs evaluator/runtime、Goal Engine、candidate scoring、Action Loop、scheduler/timer/worker、migration、新表、resident seed 修改、ActionResult/Observation runtime、ActorRef integration、MOVE/SLEEP runtime、Memory、Relationship、Economy、AI/LLM 或 3D。

## Decision drivers

1. World Kernel 仍是唯一事实写入口；LLM 不能写世界事实。
2. Need 必须可以在无 LLM、无 wall clock、无不稳定遍历顺序下确定性计算。
3. `0..100` 的语义必须统一，不能让同一个阈值同时表示“更健康”和“更危险”。
4. 30×30 必须有可解释的吃饭、睡觉、社交、工作和资源约束，而不是只让数字变化。
5. M3 不能拥有 M4 的关系真相或 M6 的经济真相。
6. 长时间不活跃的居民不能产生 N×每秒的数据库扫描和写入。
7. Need state 必须可以从 seed、世界时间和事件/结果历史重建，兼容 M2 Replay。

## Authority resolution

现有文档没有显式的完整冲突优先级条款。本 ADR 采用项目已有治理规则推导出的最小排序：项目不可破坏边界与已 Accepted ADR > 当前里程碑任务/DoD 的执行范围 > 正式领域规格与母文档的架构意图 > verification 的已实现事实 > RES-\* 研究建议。研究不能未经 ADR 升级为正式执行范围。

这意味着任务书的六项是原始 T02 输入，不是不可修改的 Need 数量；Life Engine 七项是完整领域意图，不是必须在 M3 v1 一次实现的独立事实；研究四项是最小可运行行为闭环，不是对正式任务的自动覆盖。以下职责裁决从本 ADR Accepted 起成为 M3-T02 的 Needs 口径。

## Considered models

### Model A 保留最小 4 Need

保留 `energy/hunger/sleepPressure/socialNeed` 可以直接承接 RES-M3-001，并覆盖 EAT、SLEEP、TALK 和基础差异。但 `energy` 与 `sleepPressure` 都在驱动休息，且值方向相反；模型仍缺少对正式任务中 stress、money_pressure、purpose 的解释。它是可用的研究基线，但不是职责最清晰的正式模型。

### Model B 采用正式 6 Need

采用 `energy/hunger/social/stress/money_pressure/purpose` 能逐字贴合任务书和实施矩阵，但会丢失研究中可解释的 `sleepPressure`，并在 M3 尚无账户、工资、租金、债务、关系或价值观事实时制造伪输入。它把任务表字段数误当成领域边界，拒绝。

### Model C 采用正式 7 Need

采用 Life Engine/母文档的七项可以覆盖最宽的愿景，但 `safety`、`money_pressure`、`purpose` 当前没有成熟输入和对应行动闭环，`stress` 又横跨 Emotion、Relationship、Economy。它会把 M4/M6/Identity 的职责提前塞进 M3，拒绝作为 M3 v1。

### Model D 按职责收敛 CORE / DERIVED / DEFER

把可直接驱动 M3 生活闭环的缺口保留为核心 Need，把能力、条件、义务和状态带做派生值，把没有事实输入或需要后续领域 owner 的候选延后。采用 Model D。

## Candidate Need matrix

“驱动排序”表示可影响候选优先级或硬约束前的 advisory signal，不表示 Need 可以直接调用 Action。`M4/M6` 列表示正确计算是否依赖相应里程碑的正式 authority；M3 可以读取明确的只读 fixture/resource adapter，但不能伪造其 owner。

| Candidate                        | Decision     | Owner / source                               | 直接行为与候选排序                                                                       | 无 LLM 确定性                                              | Life Engine 归属与事实输入                                                              | 重叠 / M4-M6                                                                              | 删除对 30×30 的影响                                                           | Lazy / persistence                                                      |
| -------------------------------- | ------------ | -------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `hunger` → `HungerPressure`      | `CORE_M3_V1` | Life；R01-R05                                | 饥饿缺口驱动 `EAT`；无食物时提高 `BUY`、去商店 `MOVE` 的优先级                           | 是；world time、activity、accepted EAT 与 seed policy      | 属于 Life；输入为世界时间、活动/进食结果、seed/profile policy；`foodUnits` 只决定可行性 | 与 `foodUnits` 不同；不依赖 M4/M6 计算，BUY 的真实资源由 M3 只读桥接、M6 接管             | 会直接破坏正常进食、资源替代路径与饥饿断言                                    | world-time lazy；current value 不逐次持久化，anchor/事件/政策版本可重建 |
| `sleepPressure` → `RestPressure` | `CORE_M3_V1` | Life；R01-R05                                | 睡眠缺口驱动 `SLEEP`；需要回家/休息地点时先排 `MOVE`；可压过低优先级 routine             | 是；世界时间、活动、睡眠结果和 seed policy                 | 属于 Life；输入为 world time、activity、accepted SLEEP/休息结果                         | 与 `energy` 高度重叠，故 `energy` 不再是第二个独立 Need；不依赖 M4/M6                     | 会破坏最长清醒、正常睡眠和暂停断言                                            | world-time lazy；anchor 可作为可重建 cache，不把每次数值写入 ledger     |
| `socialNeed` → `SocialPressure`  | `CORE_M3_V1` | Life；R01-R05                                | 社交缺口驱动 `TALK`；需要到场时排 `MOVE`，只在可通信/同地点约束通过后提交                | 是；last accepted TALK、世界时间、routine/profile          | 属于 Life 的自身 contact pressure；不读取关系好感/信任作为真相                          | 与 `social` 只是命名差异，合并为一个维度；M4 relationship signal 在 M3 默认缺省           | 会让 TALK 长期消失，30×30 社交覆盖失真                                        | world-time lazy；lastSocialContact/event history 可重建                 |
| `energy` → `EnergyLevel`         | `DERIVED`    | Life projection；R01/F01-F04                 | 作为能力/可行性 signal 影响 `MOVE`、`WORK`、`EAT`、`SLEEP` 的成本或过滤；不单独生成 Goal | 是；由同一 RestPolicy、activity 和事件输入派生             | 不是压力 Need；M3 输出可观察能力值，输入不新增事实 owner                                | 与 `RestPressure` 同源；当前 v1 不允许独立 decay；不需要 M4/M6                            | 删除独立字段不损害行为，只要 RestPressure 与活动约束仍在                      | 不单独持久化；可从 RestPressure/事件重建，避免第二锚点                  |
| `social`                         | `CORE_M3_V1` | Life；F01-F04                                | 与 `socialNeed` 同义，影响 `TALK`/`MOVE` 的排序                                          | 是                                                         | 归并为 `SocialPressure`，不建立第二列                                                   | 与 `socialNeed` 重叠 100%；不依赖 M4                                                      | 不单独删除，删除别名不会损害行为                                              | 与 `SocialPressure` 相同                                                |
| `hunger` 的 `food` 资源输入      | `DERIVED`    | Kernel/Economy read model；F05/B02           | `foodUnits` 过滤 `EAT`，缺货时支持 `BUY` 或 blocked；不改变 HungerPressure 语义          | 只要 snapshot 有版本即是                                   | 是事实资源，不是 Need；M3 只读 seed adapter，M6 是正式 owner                            | `foodUnits != HungerPressure`；依赖 M6 正式账户/库存仅在真实经济验收时                    | 没有资源边界会使 EAT/BUY 因果失真，但不应通过新增 Need 修复                   | 资源按 Kernel/event 语义持久化；Life 不持有写句柄                       |
| `stress`                         | `DEFER`      | Future Emotion/Relationship/Economy；F01-F04 | 未来可调制 WORK、TALK、MOVE、SLEEP；当前不参与独立排序                                   | 不能可靠确定；缺少统一事件输入和 owner                     | 不是当前可归属的单一 Life Need；工作冲突、经济压力、睡眠不足、关系事件来源不同          | 与 Emotion、Relationship、M6 money pressure 高度重叠；需后续领域事实                      | 不影响当前最小闭环，Rest/Social/Hunger + obligation 足够覆盖 M3               | 不在 M3 v1 计算或持久化；未来按事件/投影定义                            |
| `safety`                         | `DEFER`      | World/Kernel environment signal；F03-F04     | 未来作为硬约束或安全目标输入；当前不产生可执行独立 Goal                                  | 不能；危险、住所和冲突事实尚未建立                         | 不是当前 Life 自有事实；由环境/Kernel 提供的可行性信号更合适                            | 与环境硬约束、Relationship conflict、住所事实重叠；不提前进入 M3                          | 30×30 基础行为不应依赖未实现的安全系统；删除不损害当前 DoD                    | 不在 M3 v1 持久化；离散危险事件未来由 Kernel 记录                       |
| `money_pressure`                 | `DEFER`      | Economy/Kernel；F01-F04/B02                  | 未来提高 `WORK`、减少消费或促成换工作；当前只能用 `cashCents` 过滤 `BUY`                 | 不能；余额之外还需要工资、租金、欠薪、债务/义务            | 正式 owner 是 Economy；M3 只读现金资源，不能自己更新压力                                | `cashCents != MoneyPressure`；正确语义需要 M6 accounts/wages/rent/obligations             | 当前以现金/食物 fixture + WORK obligation 足以测试资源拒绝；不需伪造经济 Need | M3 不计算/不持久化；M6 事件/投影后再定                                  |
| `purpose`                        | `DEFER`      | Identity/Values/long-horizon Life；F01-F04   | 未来影响长期 Goal 选择、WORK/TALK 等；当前没有可审计的价值/进展事实                      | 不能在当前边界可靠确定                                     | 不是 30×30 基础生理/作息闭环的必要输入                                                  | 与 Goal、Identity、Persona/AI 决策重叠；不要求 M4/M6，但至少需要后续 Identity/Values 规格 | 删除不损害吃饭、睡觉、工作义务和基础社交验证                                  | M3 不计算/不持久化                                                      |
| `conditionBand`                  | `DERIVED`    | Life projection；R01-R02                     | 只做安全降级、报告和候选预算，不直接产生 Action                                          | 是；由核心压力和 policy thresholds 计算                    | 不是 Need；例如 physical condition 从 `HungerPressure`/`RestPressure` 投影              | 与 Need values 重叠但无独立输入；不依赖 M4/M6                                             | 删除只影响报告/降级，不损害核心闭环                                           | lazy 计算，不持久化                                                     |
| 工作义务 `work obligation`       | `DERIVED`    | Routine/Employment/World Clock；R02-R05      | 直接驱动 `WORK` 与去工作地点的 `MOVE`；可压过普通 routine，但不是 Need                   | 是；employment fixture、schedule、world time、travel slack | 是 Goal selection 的独立输入，不是 Life Need；M3 读取 fixture，M6 后再接正式就业        | 删除会破坏 WORK，但把它伪造成 `WorkNeed` 更糟                                             | 由 schedule/world time 计算；accepted WORK/outcome 由 Kernel 事实决定         |
| `cashCents`                      | `DERIVED`    | Kernel/Economy resource snapshot；T01/B02    | 只过滤 `BUY`、支持 blocked/替代候选；不直接产生 money pressure                           | 对给定版本 snapshot 是                                     | 资源事实，不属于 Life Need                                                              | 与 money_pressure 不同；正式 owner M6                                                     | 删除会破坏 BUY 约束，但不能用 MoneyPressure 假替代                            | 持久化属于 Kernel/Economy；Life 只读                                    |

### Candidate matrix interpretation

最终 M3 v1 的独立 Need 只有三个：`HungerPressure`、`RestPressure`、`SocialPressure`。`EnergyLevel` 为能力投影，`conditionBand` 与工作义务为派生输入，资源是事实快照；`stress`、`safety`、`money_pressure`、`purpose` 不进入 M3 v1。

因此，历史 4/6/7 集合都被逐项覆盖，但没有保留同义或无输入字段作为“为了数量完整而波动的数字”。

## Core M3 v1

### Canonical names and semantics

| Canonical signal | Historical aliases                          | Meaning                      | Direction                                  |
| ---------------- | ------------------------------------------- | ---------------------------- | ------------------------------------------ |
| `HungerPressure` | `hunger`                                    | 食物/营养缺口                | `0 = satisfied`, `100 = critical`          |
| `RestPressure`   | `sleepPressure`；部分 `energy` 语义的需求侧 | 清醒与休息累积的恢复缺口     | `0 = rested`, `100 = critical`             |
| `SocialPressure` | `social`、`socialNeed`                      | 缺少有意义接触的自身社交缺口 | `0 = socially satisfied`, `100 = critical` |

所有 CORE Need 统一为 pressure/deficit 方向：低值表示满足，高值表示紧迫。`EnergyLevel` 采用自然能力语义（`0 = exhausted`, `100 = fully recovered`），但因为它是 `RestPressure` 的派生投影，不能与 Core Need 使用同一阈值，也不能独立持久化或独立衰减。

### Formula boundary

T02 允许实现满足以下性质的闭式/分段确定性 evaluator，而不在本 ADR 永久冻结系数：

```text
elapsed = max(0, currentWorldTime - lastNeedAnchorWorldTime)
currentNeed = clamp(
  anchorValue
  + policy.rate(activity, residentProfile, elapsed)
  - policy.relief(acceptedEvents, elapsed),
  0,
  100
)
```

`HungerPressure` 的 relief 来自 accepted EAT/营养结果；`RestPressure` 的 relief 来自 accepted SLEEP/休息结果；`SocialPressure` 的 relief 来自 accepted meaningful TALK。具体 rate、营养 relief、睡眠时长、社交有效性和个体微差属于 `NeedPolicy v1` calibration，不在本 ADR 写成不可变业务常数。

## Derived signals and condition bands

- `EnergyLevel` 是能力/成本信号，不是第二个 Rest Need；M3 v1 应由同一 RestPolicy 和事件流计算。
- `conditionBand` 是 projection。默认可表达 `STABLE`、`ELEVATED`、`HIGH`、`CRITICAL`，但具体区间是 policy 参数，不在 ADR 永久冻结。它只能改变降级与报告，不制造疾病、医疗、死亡或新的 Action。
- `work obligation` 是由 employment、schedule、world time 和 travel slack 计算的 due/late/slack；它不是 `WorkNeed`。
- `cashCents`、`foodUnits` 是 Kernel/Economy-owned facts/read model；资源不足会过滤候选，不生成新的 Need。

## Need, Goal and Action boundary

Need 不能直接变成 Action。完整例子：

```text
HungerPressure = 84
→ Goal: SatisfyHunger
→ Candidate: MOVE to an open merchant
→ ActionRequest: BUY(itemId, quantity)
→ committed result/event
→ fresh observation
→ ActionRequest: EAT(itemId, quantity)
```

如果居民已经持有可食物品，则候选可以直接是 `EAT`；如果 `BUY` 被现金、库存或营业时间硬约束拒绝，不能把 Need 当作成功，也不能由 Life Engine 扣钱、加库存或瞬移。Goal、candidate、constraint 和 score 属于后续 Life Engine 决策证据，不属于 Need 值本身。

## Need and Obligation boundary

```text
workSchedule + employment + worldTime + travelSlack
→ WorkObligation(due/late/slack)
→ Goal: FulfillWorkObligation
→ MOVE → WORK
```

“今天 09:00 必须上班”是 obligation，不是 `WorkNeed = 93`。它可以和三个 Core Need 一起进入 Goal selection；工作完成与否仍由 Kernel accepted result/event 决定。

## Authority model

Need 不是 World Fact，也不是 Life Engine 可以直接写入的事实。M3 v1 采用：

```text
World Facts / accepted domain events
+ World Time
+ Resident Seed / Profile
+ NeedPolicyVersion
→ Current Need State
```

其中：

- `World Facts` 包括 world status、location/activity outcome、已提交的离散 EAT/SLEEP/TALK 结果，以及只读 resource/obligation snapshot；事实仍由 World Kernel 或其正式 owner 提交。
- `World Time` 是唯一时间输入；wall clock 只可在 World Clock 层转换，不能直接进入 Need evaluator。
- `Resident Seed/Profile` 只提供稳定、少量、可解释的个体差异，不产生 `Math.random()`。
- `NeedPolicyVersion` 决定 rate、relief、threshold、hysteresis 与 projection 语义。

连续的 60→61→62 变化不产生连续 Event Ledger 事实。只有离散 accepted event、必要的 coarse summary 或可审计 anchor 才能进入 durable/replay 边界，并且其 payload/version/reducer 必须在真正实现前另行冻结。禁止天然产生 `HUNGER_CHANGED` 每秒事件。

## Time model and pause semantics

比较了四种策略：

| Model                            | 结果                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 每秒更新所有居民                 | 拒绝；N×每秒扫描/写入，污染 ledger，无法支持休眠居民                                                             |
| 每世界分钟更新所有居民           | 拒绝为基础架构；虽比每秒低，但仍是全量轮询，且空闲居民产生无价值计算                                             |
| Lazy Need Evaluation             | 采用为计算原语；在观察、决策或离散事件前按 world-time anchor 求值                                                |
| Scheduled Wake + Lazy Evaluation | 采用为未来运行触发形态；routine/deadline/event/rejection/资源变化唤醒，醒来后 lazy 求值；本 ADR 不实现 scheduler |

T02 只需要提供显式 `worldTime`、anchor、policy 和事件输入的纯 evaluator。scheduler/heartbeat/lease 是 Action Loop/M3 Gate 前的独立边界，不在本任务实现。

`PAUSED` 或 `MAINTENANCE` 时：

```text
world time does not advance
→ elapsed world time does not advance
→ Needs, EnergyLevel, conditionBand and obligation do not advance
→ no new Need-driven request is produced
```

现实中离开 8 小时不能使居民自动饿 8 小时；只有世界时间实际推进 8 小时才会产生对应变化。wall-clock 回拨也不能让 world time 或 Need anchor 回退。

## Hysteresis and NeedPolicyVersion

每个 Core Need 的 policy 可包含：

```text
activationThreshold
releaseThreshold
```

并满足 `releaseThreshold < activationThreshold`。阈值是 Goal activation/release 的控制参数，不是把 Need 离散成脚本。它防止 69→70→69→70 在相邻决策周期来回切换 Goal。`conditionBand` 同样是派生 projection，使用 policy 定义的区间。

M3 v1 的版本标识为 `m3-needs-v1`。它必须出现在 evaluator 配置、30×30 run manifest、decision evidence 或可重建 checkpoint 的语义输入中。修改 rate、relief、threshold、weight 或公式不得静默改变历史模拟；应创建新 policy version 或显式迁移规则。具体系数先作为 policy calibration，不由本 ADR 永久写死。

## Determinism

相同的：

```text
resident seed + authoritative inputs + world time + NeedPolicyVersion
→ identical Core Need values and derived signals
```

禁止影响 Need 结果的输入包括 `Math.random()`、未注入 wall clock、进程启动时间、机器时区、created_at、HTTP 到达顺序、LLM 输出和不稳定的 map/set 遍历。个体差异只能由 seed + stable derivation 得到，且保持少量可解释参数。

## Persistence and replay

需要进入可重建语义的内容：

- Resident seed/profile/config version；
- `NeedPolicyVersion`；
- world time 与 M2 Event Ledger 的有序离散 domain events/outcomes；
- 若 evaluator 使用 anchor，`lastNeedAnchorWorldTime`、anchor values 和 anchor event reference 必须能从上述输入重建，或作为带版本的可删除 checkpoint/cache 保存。

不需要逐分钟持久化的内容：

- `currentNeed = 71.382...` 这样的当前读时值；
- 每次 lazy evaluation 的中间浮点结果；
- `EnergyLevel`、`conditionBand`、due obligation 的可重建投影。

Replay 不能依赖“进程内每分钟更新过的变量”。同一 Resident Seed、World Event history、World Time 与 `m3-needs-v1` 必须重建相同 Need summary。若未来引入额外 anchor event，必须说明它记录的是哪个离散边界，并为其 payload、schemaVersion 和 reducer 增加测试；本 ADR 不创建 event 或 migration。

## M3 v1 behavior coverage

| Input                     | Goal                                | Existing Action coverage                                |
| ------------------------- | ----------------------------------- | ------------------------------------------------------- |
| `HungerPressure`          | `SatisfyHunger` / `AcquireFood`     | `EAT`; 缺食物时 `MOVE → BUY → EAT`                      |
| `RestPressure`            | `SatisfyRest`                       | `SLEEP`; 需要地点时 `MOVE → SLEEP`                      |
| `SocialPressure`          | `MakeSocialContact`                 | `TALK`; 需要到场时 `MOVE → TALK`                        |
| `EnergyLevel`             | 不是独立 Goal；能力/成本 projection | 影响 `MOVE`、`WORK`、`SLEEP` 的可行性或排序，不直接提交 |
| `WorkObligation`          | `FulfillWorkObligation`             | `MOVE → WORK`                                           |
| `cashCents` / `foodUnits` | 资源可行性，不是 Goal               | `BUY` / `EAT` 的 Kernel preflight input                 |

这覆盖 EAT、SLEEP、WORK、TALK、BUY、MOVE，但不把每一种行为都伪造成 Need。

## 30×30 compatibility

本 ADR 不运行正式模拟，只冻结可测试模型。未来 30×30 必须至少验证：

- 三个 Core Need 与 `EnergyLevel` 不越界；同一 world time 重复计算幂等；
- 最长连续清醒、正常进食、正常睡眠和 accepted TALK；
- WORK 由有效 obligation 驱动，4 名 unemployed 不接受有效 WORK；
- `EAT`/`SLEEP` 不全员同步，差异来自 seed/profile/policy 而非随机噪声；
- `PAUSED` 期间 world time、Need、obligation、epoch、backoff 和新请求不变化；
- 同一 seed/snapshot/event/result history/policy version 得到相同 decision/Need summary；
- cash/food 只读、无负数、失败动作无部分资源变化；这些是资源/Kernel 验证，不是 money Need 验证。

正式 M3 Gate 仍需要 ActionResult、Observation、ActorRef、MOVE/SLEEP completion、bounded replan、scheduler/driver、versioned event payload 和 full resident replay 等已有 P1/P2 前置项；本 ADR 不关闭它们。

## M3-T02 contract

M3-T02 在本 ADR Accepted 后允许实现的范围仅为：

1. `HungerPressure`、`RestPressure`、`SocialPressure` 三个 Core Need 的纯 deterministic evaluator；
2. `EnergyLevel`、`conditionBand` 等只读 derived projections；
3. 显式 World Time / anchor 输入和 `m3-needs-v1` policy；
4. 来自 Resident Seed/Profile 的稳定、有限个体差异；
5. activation/release hysteresis 与边界 clamp；
6. 无 LLM、无 wall clock、可 replay 的 evaluator/unit/contract tests。

M3-T02 明确禁止：Goals、candidate scoring、Action Loop、scheduler/timer/worker、ActionResult、Observation runtime、ActorRef integration、MOVE/SLEEP runtime、Memory、Relationship、Economy、AI/LLM、3D、schema/migration、新表、resident seed 修改以及任何事实写入。

任务书/实施矩阵中原有的六字段文字必须以本 ADR 的 CORE/DERIVED/DEFER 结果解释；不得为了逐字满足旧字段列表而实现 `stress`、`money_pressure`、`purpose` 的假 evaluator。若需要修改正式 DOCX 的任务文字，应在 M3-T02 前做独立的规格同步，不在本 ADR 偷改原始文档。

## M4 and M6 boundaries

### M4 Relationship / Memory

M3 的 `SocialPressure` 只表示居民自身的 contact deficit，可以由 world time、routine/profile 和 accepted TALK 得到。它不是 `familiarity`、`trust`、`affinity`、`conflict`、`obligation` 或 `dependency`；不写关系投影，不读取记忆作为 M3 事实。M4 signal 在 M3 默认缺省/零值，M4 另行拥有其事件和投影 authority。

### M6 Economy

`cashCents`、`foodUnits`、账户、库存、工资、租金、欠薪、价格和债务属于 Kernel/Economy boundary。M3 只读 `ResidentResourceSnapshot`，用它过滤 BUY/EAT 候选，不修改资源，不把 cash balance 改名为 `money_pressure`。正式 `MoneyPressure` 至少要等 accounts、wages、rent、arrears/obligation 的因果输入明确后再决策。

## Consequences

### Positive

- 4/6/7 冲突被按职责解决，不再以字段数量代替架构判断。
- M3 仍能用三个可解释 Core Need 覆盖吃饭、睡觉和基础社交；工作由 obligation 驱动，购买由资源约束驱动。
- 所有 Core Need 统一 pressure semantics，减少方向错误和阈值误用。
- Need state 可 lazy、可重建、可 replay，不把连续衰减污染成高频 Event Ledger 写入。
- `stress`、`safety`、`money_pressure`、`purpose` 不会在缺少事实 owner 时生成看似真实的数字。

### Costs and risks

- 与旧 T02 六字段表存在文档语义差异；M3-T02 实现前必须引用本 ADR，必要时同步正式任务文本。
- `EnergyLevel` 与 `RestPressure` 的投影公式和阈值仍需 fixture calibration，不能在没有 30×30 证据时宣称行为验收通过。
- M3 Action Loop 仍受 ActionResult、Observation、MOVE/SLEEP、scheduler 和资源 adapter 等前置项约束。

## Deferred decisions and inherited findings

- `stress`、`safety`、`money_pressure`、`purpose` 的正式 owner、公式和行为响应延后；不在 M3 v1 以独立 Need 实现。
- `ActionResult/committed event feedback`、Observation/query boundary、ActorRef、MOVE/SLEEP completion、bounded replan、scheduler/heartbeat、full resident/domain replay、versioned event payload 和 `causation_id` 仍按既有 M3 前置矩阵处理。
- `belonging`、`status`、独立 `emotion` 未被 4/6/7 来源定义；未来如需加入必须另行提供来源和 ADR。
- 本 ADR 不修改数据库、事件 registry、API、seed fixture 或任何 runtime。

## Data API Event Migration

无。没有 migration、新表、API、Event Registry 或事件 payload 变更。后续真正实现 Need evaluator 时，必须单独决定是否需要版本化 `NEED_CHANGED`/summary payload 和 replay reducer；不得把本 ADR 当作事件 schema 授权。

## Verification plan for this ADR

本轮验证只证明文档决策与主仓没有越界，不证明 Needs runtime：

- `git diff --check`；
- repository `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`；
- 依赖 security audit 沿用当前 main/M3-T01 证据：官方 npm production audit HIGH=0、CRITICAL=0；
- GitHub Actions `foundation-ci` 必须对包含本 ADR 与同步文档的 commit 真实 PASS。

## Documents to update

- `docs/architecture/m3-needs-source-audit.md`
- `docs/PROJECT_STATE.md`
- `MEMORY.md`
- 本 ADR
