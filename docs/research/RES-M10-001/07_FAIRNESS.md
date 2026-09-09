# 07 · Fairness

## 目标

建立与 PRE-AL-07 / RES-M8 deterministic ordering 兼容的 **cognition fairness**，而不是另造调度器。

## 两层公平

| 层 | 内容 | 权威 |
| -- | ---- | ---- |
| **Scheduling fairness** | 谁先被 due 处理 | Driver / PRE-AL-07 / M8 |
| **Cognition fairness** | 被处理时能用多深的智能 | M10 policy |

M10 **不修改** scheduling 排序键；只在 wake 之后分配 I 层与预算。

## Scheduling（继承）

```text
order = (nextWakeWorldTime, residentId bytes, wakeReason, decisionEpoch)
```

- 同时刻稳定打破平局
- 不以「事件多」「离用户近」「会产 token」插队
- 一个 resident/epoch 一个 in-flight action（既有约束）

最终 freeze：`PENDING_PRE_AL_07`。

## Cognition Fairness 原则

1. **Every due resident is eventually processed**（调度层）
2. **Budget exhaustion lowers LOD; never freezes existence**
3. **Resident-scoped quota** 优先于 world 静默饿死
4. **Bounded burst** 允许，**unbounded monopoly** 禁止
5. **Attention bonus 有界且记账**
6. **Poison resident** 隔离自身，不拖垮他人

## 模型组件

### Resident-scoped quota

- 每居民每 world-time window 的 I2/I3 wake 上限
- 超限 → 强制 I1/I0，不删任务

### Aging

- 长时间未获得 I2+ 的合法高优先 trigger 可逐渐升权
- aging **不能**改写 due world time，也不能绕过 Kernel
- aging 结果必须确定性（函数 of wait + policy version）

### Priority classes（研究）

建议与 M5 lane 思想对齐但由 M10 配额约束：

| Class | 示例 |
| ----- | ---- |
| HUMAN_INTERACTIVE | 人类正在进行的互动 |
| CRISIS | 政策定义的稀有危机 |
| PLANNING | 长期目标/谈判 |
| ROUTINE_SOCIAL | 普通社交 |
| MAINTENANCE | 摘要/反思 |

### Bounded burst

- 允许短窗口内超过平均
- 硬顶：world I3 concurrency、resident burst cap

### Starvation prevention

指标见 `17`：

- max wait from eligible → I2+
- share of I3 by resident Gini / top-k
- demotion-only streak length

### Poison isolation

对齐 RES-M8 FAILURE-ISOLATION：

- 失败循环居民用 replan 预算 → STOP
- 可暂时降低其 I 层上限
- **禁止**删除居民或跳过其 due 来「修好世界」

### Cross-world isolation

- World A 预算/队列不得永久阻塞 World B
- 公平默认 **within-world**；跨世界只共享全局 provider cap

## 与「更聪明是否更公平」的辨析

| 说法 | 裁决 |
| ---- | ---- |
| 事件多的居民应更常 I3 | 否，除非 trigger class 与配额允许 |
| 更有戏剧性的居民应永久 I3 | 否 |
| 当前人类会话对象可短暂 I2/I3 | 是，有界 |
| 所有居民最终同样聪明 | 否，公平是**机会与无饥饿**，不是结果均等 |

## 伪代码（研究）

```text
evaluateLod(wake, resident, fairnessState, budget):
  base = policy.baseLod(wake.reason, signals)
  if attentionBonus and quota.available(resident):
    base = min(I3, base + bonusSteps)
  if not budget.worldAllows(base):
    base = budget.demote(base)
  if fairness.quotaExceeded(resident, base):
    base = fairness.demote(base)
  if aging.eligible(resident, wake) and base < I2:
    base = aging.promoteDeterministic(base)
  return base
```

## 非目标

- 不实现公平存储
- 不保证「事件数相等」
- 不保证跨人类用户的实时公平（用户不是世界时钟）
