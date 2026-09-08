## 来源对照

| 来源                                               | 定义                                                                | 权威级别     |
| -------------------------------------------------- | ------------------------------------------------------------------- | ------------ |
| RES-M3-001 `03-needs-goals-actions.md`/`RESULT.md` | `energy/hunger/sleepPressure/socialNeed` 四项，另有 work obligation | 研究输入     |
| 正式 Codex 任务书 M3-T02                           | `energy/hunger/social/stress/money_pressure/purpose` 六项           | M3 执行任务  |
| 正式 M0-M13 矩阵 M3-T02                            | 同上六项                                                            | M3 执行任务  |
| 正式 LifeEngine §2/§3                              | `energy/hunger/social/stress/safety/money_pressure/purpose` 七项    | 专项领域规格 |
| 正式全量母文档数据模型                             | 同样七项                                                            | 顶层模型规格 |

## 结论

存在 4 → 6 → 7 的范围漂移，标记 `SPEC_DECISION_REQUIRED`。不能让研究稿四项覆盖正式 T02 六项，也不能忽略 Life 专项/母文档的 safety。该问题不阻塞 T01。

## 最小兼容建议

T02 前由 ADR 明确两层：

1. 以任务书/实施矩阵的六项作为 M3-T02 executable subset：`energy`、`hunger`、`social`、`stress`、`money_pressure`、`purpose`。
2. `sleepPressure` 暂作为由 routine、world time、energy 和睡眠事件派生的内部 decision signal；`safety` 暂作为环境/Kernel 硬约束信号，不静默扩成新的 T02 durable field。若必须成为正式 Need，应更新任务和测试矩阵。

这保留正式六项 DoD，同时让“睡觉”有可解释入口，不偷渡医疗/安全系统。T01 只冻结 profile/fixture；T02 前必须 ADR；M6 前重新确认 money_pressure 与账户、工资、租金、债务的 authority。
