# 17 · Observability（设计，不实现 telemetry）

## 目的

未来运维必须能回答：

1. 世界是否在无 LLM 下仍健康？
2. 谁在吃预算？谁在饿死？
3. LOD 分布是否符合设计？
4. Replay 是否一致？
5. Provider 降级是否频繁？

## 指标清单

### Cognition

| 指标 | 含义 |
| ---- | ---- |
| cognition_wakes_total | 进入 policy 评估次数 |
| cognition_wakes_by_reason | trigger 分布 |
| lod_distribution | I0–I3 占比 |
| promotion_count / demotion_count | 升降级 |
| promotion_rate_by_signal | 哪个信号在推高 |
| i3_concurrency_max | 峰值 |

### Budget & Fairness

| 指标 | 含义 |
| ---- | ---- |
| budget_utilization_resident/world | 利用率 |
| top_residents_by_i2_i3 | 吸血者 |
| starvation_wait_p95/p99 |  eligible→I2+ 等待 |
| demotion_only_streak | 连续降级居民数 |
| attention_bonus_usage | 观察者偏差 |
| poison_isolated_count | 隔离 |

### Provider / Cost

| 指标 | 含义 |
| ---- | ---- |
| provider_call_rate_by_tier | 调用率 |
| provider_error_rate | 失败 |
| fallback_rate | 降级成功率 |
| token_usage_by_lod | 成本 |
| cost_cap_throttle_events | 封顶 |

### World / Driver

| 指标 | 含义 |
| ---- | ------ |
| due_queue_depth / age | backlog |
| world_lag | 目标时间落后 |
| kernel_commits_per_world_hour | 事实吞吐 |
| zero_llm_survival_rate | 无模型时完成率 |
| w_lod_distribution | W0/W1/W2 |

### Replay / Integrity

| 指标 | 含义 |
| ---- | ---- |
| replay_mismatch_count | 必须为 0 |
| missing_cognition_envelopes | evidence 完整性 |
| decision_digest_unavailable_rate | 降级可观测性 |
| policy_version_missing | 配置错误 |

## 告警建议

| 告警 | 条件思路 |
| ---- | -------- |
| WORLD_STALLED | due 不推进且非 PAUSED |
| I3_STORM | I3 并发/配额异常 |
| STARVATION | 居民超过阈值无 I2+ |
| PROVIDER_OUTAGE | error rate |
| BUDGET_BREACH | 超 cap |
| REPLAY_DRIFT | hash mismatch（P0） |

## 实现原则（未来）

1. Telemetry 不是 World Fact。
2. 不把原始 CoT 打进日志。
3. Envelope 与 metrics 分离。
4. 指标可从可重建状态校准。
5. 不为观测而提高 LOD（观测不改变世界）。

## 与 Gate 的关系

M10 Gate 应引用这些指标作为证据源，但正式采集实现属于后续 milestone。
