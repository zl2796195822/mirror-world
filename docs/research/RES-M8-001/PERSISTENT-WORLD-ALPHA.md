# PERSISTENT-WORLD-ALPHA

Product-level acceptance candidate for “the world lived while you were away.”

## Story

真人居民离开镜界 **7 天**。

期间：

- 世界继续（status RUNNING under policy）
- World Time 前进
- 其他居民完成真实生活活动（MOVE/SLEEP 等 Kernel 事实）
- 发生 committed World Events

回来后：

- 居民状态已变化
- 可查看 **What Happened While I Was Away?**
- 历史可查询、可验证、可 Replay
- **不是**现场生成故事

## Acceptance Checklist

| # | Check |
| - | ----- |
| A1 | User offline 7 days does not pause world |
| A2 | On return, worldTime advanced by policy-mapped elapsed |
| A3 | Resident runtime shows real changes (location/activity/sleep completed) |
| A4 | Event Ledger contains corresponding events with contiguous seq |
| A5 | Return digest lists structured items from those events |
| A6 | Digest deletion does not alter world |
| A7 | Replay/equivalence can verify history (as capabilities allow) |
| A8 | No LLM was required during the 7 days |
| A9 | Catch-up (if process down) finishes without user waiting for full sim on login |
| A10 | Honesty: if lag remains, UI shows CATCHING_UP not fake current |

## Out of Alpha Scope

- Global newspaper
- Full economy realism
- High-fidelity social AI between dormant residents
- Multi-city sharding
- Real-world market feeds

## Relationship to M3 30×30

30×30 proves continuous simulated life determinism.  
Persistent World Alpha proves **offline continuity + return experience** on the same foundation.

They are complementary Gates.
