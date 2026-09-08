## 兼容性结论

RES-M2-OSS-001 的 Hybrid 结论与 RES-M3-001 兼容：连续空间表现可走本地 10–20Hz tick；离散世界事实走 event/schedule；长期 Needs 以 world-time anchor lazy compute。当前 M2 `syncWorldClock()` 仍是 pull-driven，没有 scheduler/lease/heartbeat。

## M3 v1 最小模型

```text
clock/lease owner
→ nextWake(worldTime,residentId,wakeReason)
→ observation + lazy needs
→ 每 resident/epoch 最多一个 request
→ Kernel outcome/event
→ 下一次 wake 或 event reaction
```

唤醒来源：routine/work deadline、sleep/travel completion、accepted event/rejection、resource/opening/edge change，以及低频 coarse watchdog。不要每秒扫描并写全体居民；测试可以跳到下一个 due world time，或由 deterministic driver 做逻辑分钟推进。

| 规模   | 推荐                                                | 禁止                  |
| ------ | --------------------------------------------------- | --------------------- |
| 30     | deterministic due queue + 低频 watchdog             | N×每秒 durable update |
| 1,000  | 时间桶/分区 + due queue；活跃居民更密、休眠居民懒算 | 每秒全量读取          |
| 10,000 | scheduled event + lazy state + LOD                  | 20Hz 全量 Kernel tick |

scheduler/heartbeat 不阻塞 T01，但是真实 continuous loop 和 M3 Gate 前必须存在真实 owner/lease 或明确等价的 deterministic driver。M7 的高频表现层不进入 Life/Event Ledger。
