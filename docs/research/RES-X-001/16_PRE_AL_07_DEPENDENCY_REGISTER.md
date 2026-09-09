# 16 PRE-AL-07 Dependency Register

## Baseline correction

四份冻结研究作成时把 PRE-AL-07 标成 pending。当前 `origin/main@2e526d3b22209ba949584abf4e1f9505a7469e37` 已有 `ADR-0010` 与 `PRE-AL-07-report.md`（正式实现父提交为 `a3581a5db6500bb44282b19ccc5ada03d5c4beeb`），所以本表区分 `RESOLVED_ON_CURRENT_MAIN` 与仍未闭合的扩展合同；不回写冻结研究。

| ID     | Research assumption                                | Current formal fact                                                                            | Risk if formal result differs / remains incomplete           | Affected studies | State                                            |
| ------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------- | ------------------------------------------------ |
| PA-001 | 单一 world-scoped deterministic due driver         | Driver serially orders due work；completion before decision wake；最大 30                      | 若另造 Resident/Cognition scheduler 会产生重复执行或不公平   | M3, M8, M10, M7  | `RESOLVED_ON_CURRENT_MAIN`                       |
| PA-002 | due work 可从 durable state rebuild                | runtime due rows 与 `scheduled_wake_registrations` 是 rebuildable source                       | 任意仅存 Redis/内存的 due item 会在 crash 后丢失             | M8, M10, M6      | `RESOLVED_FOR_M3_V1`; domain extension pending   |
| PA-003 | wake key 使用 world time、resident、reason、epoch  | 当前正式 order 为 due time、resident UUID bytes、reason、epoch，并有 identity tie-break        | `priorityClass` 等旧字段若被强行加入会改变公平/回放          | M8, M10, M3-003  | `RESOLVED_FOR_M3_V1`; priority extension pending |
| PA-004 | M3 driver 可代表完整 resident loop                 | PRE-AL-07 明确不实现 M3-T04、autonomous loop 或 30×30                                          | 把 scheduler PASS 升级为 Life Engine PASS 会越过 Gate        | M3, M8, M10      | `PENDING_M3`                                     |
| PA-005 | defer 后存在可重建的 cognition wake                | 当前可持久化/读取 deferred wake，但不 ack/delete，也不产生 selected Action                     | 未来 cognition boundary 可能重复消费或无限保留               | M8, M10, M5      | `PENDING_FORMAL_CONTRACT`                        |
| PA-006 | 多实例 driver 有 lease/fence                       | 当前有 resident state-version fence；没有 world driver lease/heartbeat/lost-fence contract     | 双 driver 可能重复推进或输出重复 wake                        | M8, M10, Ops     | `PENDING_PRE_AL_07_EXTENSION`                    |
| PA-007 | full replay 可证明 catch-up 等价                   | 当前仅保留 M2 event replay；typed reducers、resident projection replay、manifest/hash deferred | 无法宣称 offline/online 等价或 30×30 通过                    | M3, M8, M10, M7  | `PENDING_M3/REPLAY`                              |
| PA-008 | driver failure policy 足以覆盖 provider/poison     | 当前 scheduler failure item 覆盖 bounded work errors；provider/cognition policy 尚未接入       | provider outage 下 STOP/DEFER/DEGRADE 语义分裂               | M8, M10, M5      | `PENDING_FORMAL_CONTRACT`                        |
| PA-009 | economy/obligation due 可直接并入 wake index       | 当前 PRE-AL-07 只实现 activity 与三类 wake registration；M6 journal/economic authority 未实现  | Economy scheduler 可能抢占或重写 Kernel due semantics        | M6, M8           | `PENDING_M6`                                     |
| PA-010 | fairness 在大规模、多进程与 cognition quota 上成立 | 当前只验证 bounded serial source 与 30-resident batch                                          | 高密度/多实例/attention bonus 可能出现 starvation 或预算泄漏 | M8, M10          | `PENDING_FORMAL_CONTRACT`                        |

## Boundary

PRE-AL-07 已解决“当前 M3 v1 由谁按何时处理已存在的 activity/deferred wake”这一窄问题；它没有解决“wake 后由谁决定、何时 ack、如何调用 cognition、如何完整重放”这一跨研究问题。
