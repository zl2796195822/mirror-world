# 21 · M10 Gate Proposal

每条 Gate：可自动测试或可提供明确证据。通过前不得宣称 M10 完成。

| ID | Gate | 验收方式（建议） | 证据 |
| -- | ---- | ---------------- | ---- |
| **G-01** | Zero-LLM survival | 无任何 Provider 配置下，I0 路径完成规定时长世界推进与 due 完成 | test log + event hash |
| **G-02** | Provider outage | 杀掉 mock/真实 provider，I2/I3 请求降级/defer，世界不停摆 | outage test |
| **G-03** | Fairness / no starvation | 构造 1 个高触发居民 + 低触发居民；低触发者 due 仍被处理；I2+ 等待有上界 | metrics |
| **G-04** | Budget bounded | 配额耗尽后不得再进入 I2/I3；世界预算耗尽只降级不崩溃 | quota tests |
| **G-05** | Deterministic scheduling alignment | cognition policy 不改变 due 排序键；同输入同 finalLod | property tests |
| **G-06** | Replay without LLM | 使用 envelope/events replay，全程断网；projection hash 一致 | replay test |
| **G-07** | 30→300 | 300 synthetic residents 规则推进 + 配额；无 P0；性能不劣化到不可用 | harness report |
| **G-08** | 300→1000 | wake index 可重建；高峰 due 不饿死；I0 主导 | harness report |
| **G-09** | Cross-world isolation | World A 预算/毒居民不阻塞 World B | isolation test |
| **G-10** | No world-authority leakage | 注入/超权 intent 全部无法非法 commit；I3 无特权动作 | security tests |
| **G-11** | Realtime/catch-up consistency | 同 manifest 双路径事实 hash 相等；缺 envelope 不分叉事实 | equivalence test |
| **G-12** | Policy versioning | 缺失/错误 policyVersion fail-closed 到 I0；可审计 | config tests |

## 附加建议 Gate（非硬性 v1）

| ID | Gate |
| -- | ---- |
| G-13 | Attention bonus 可关且关闭后与无观察等价（事实层） |
| G-14 | Envelope schema version 向后可读 |
| G-15 | Poison resident STOP 不删除居民 |
| G-16 | Cost cap 触发后 I0 继续 |

## 证据纪律

- 禁止把 UNVERIFIED 成本模型数字当作 G-07/G-08 通过条件
- 性能门槛应在正式任务里写成可测阈值
- 失败必须留 artifact（与 RES-M3-003 风格一致）

## Gate 与主线关系

- G-01/05/10 可较早（规则层）
- G-02/04/06 需要 M5 mock + envelope
- G-07/08 需要 PRE-AL-07
- G-11 需要 M8 语义 + M10 envelope
