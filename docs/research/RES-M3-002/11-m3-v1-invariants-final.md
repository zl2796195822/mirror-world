## MUST

| ID         | 断言                                                                                      | 责任层                     |
| ---------- | ----------------------------------------------------------------------------------------- | -------------------------- |
| LE-MUST-01 | Life 外部副作用只有读 observation、写 trace、提交 ActionRequest                           | Life boundary/static audit |
| LE-MUST-02 | 相同 seed/snapshot/worldTime/resident state/epoch 得到相同 semantic request               | Life + Replay              |
| LE-MUST-03 | PAUSED/MAINTENANCE 不推进 needs、routine、backoff 或新 request                            | Clock/Simulator + Life     |
| LE-MUST-04 | 每 resident/epoch 最多一个 in-flight request；retry 遵守 idempotency                      | Life + Kernel              |
| LE-MUST-05 | 没有 committed/rejected/conflict/duplicate outcome 不改变 location/resource/activity/need | Kernel ActionResult + Life |
| LE-MUST-06 | 事实变化必须有 Kernel committed result/event；拒绝不得部分变化                            | Kernel + DB + Ledger       |
| LE-MUST-07 | 候选、尝试、backoff 和终止状态有界，禁止 busy loop                                        | Life                       |
| LE-MUST-08 | observation/request 带 worldId；resident actor 不跨 world                                 | Kernel + DB                |
| LE-MUST-09 | Need signal 在 0..100，同一 world time 不重复计算                                         | Life + Clock               |
| LE-MUST-10 | 30×30 保存输入、outcome、events、summary hash 和 violation report                         | Harness + Replay           |

## SHOULD

- T01 profile、routine phase、工作/失业和资源 fixture 有稳定 hash。
- trace 记录 goal、candidate、filter、score、epoch、outcome reference，但不保存 chain-of-thought。
- rejection 有 retryable/terminal 分类和 next wake condition。
- 领域 event 使用版本化 payload 和 replay handler。

## DEFER

复杂 Relationship、Memory、Emotion/Persona；现金/库存/工资/租金/双分录守恒；10k LOD/CPU benchmark。它们分别归 M4/M5、M6、M10。Life 不重复实现 Kernel 的 append-only、seq、权限和事务不变量。
