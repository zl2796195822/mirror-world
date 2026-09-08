## Must be Event

`WORLD_TIME_ADVANCED`、MOVE authoritative arrival、accepted EAT/SLEEP/WORK/TALK/BUY 的世界结果，以及任何资产/资源变化必须进入版本化 Event Ledger；经济变化还必须关联 M6 ledger。只有当 Goal 状态成为 durable/user-visible domain fact 时才写 `GOAL_CHANGED`。

## May be Trace

Need anchor/elapsed/derived value、Goal/candidate 列表、filter reason、score 分项、tie-break、decision epoch、preflight、replan 分类、snapshot hash、outcome reference、retry count。Trace 是解释和诊断，不是 replay 输入。

## Should not persist

每分钟每人的 hunger delta、每个被过滤 candidate 的大对象、客户端插值帧/速度、未参与决策的随机中间值、进程时间、线程 ID 和 M3 的 LLM chain-of-thought。`hunger=72` 通常是 world time + anchor + rate 的 derived signal；跨阈值或行动结算时才考虑 NEED_CHANGED。

## Replay

完整 M3 replay 需要固定 seed/config、initial domain snapshot、world-time inputs、committed outcomes/events 和必要外部输入。Replay 不重新执行 ActionRequest，不使用 wall clock，不用 score/trace 代替 committed event。当前 M2 非时间事件 no-op，不能直接证明居民状态可重放。
