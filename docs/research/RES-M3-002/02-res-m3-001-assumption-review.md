## 假设逐项复核

| RES-M3-001 旧假设                   | 最终 M2 事实                                                   | 兼容性         | 调整与时机                                                         |
| ----------------------------------- | -------------------------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| Life Engine 只产生 ActionRequest    | World Kernel 仍是唯一事实写入口；M2 只存请求 metadata          | YES            | 明确 persisted request 不等于 executed action；Action Loop 前冻结  |
| 固定 seed 支撑差异/replay           | worlds.seed、显式 clock、ordered events、canonical hash 已有   | YES（M2 范围） | Life seed/config/request identity 纳入 deterministic contract；T01 |
| Needs lazy evolution                | clock 可按显式 now 推进，暂停不推进；没有 needs store          | PARTIAL        | world-time anchor lazy compute；T02                                |
| 每 cycle 最多一个 request           | DB unique + concurrent duplicate 已有；无 Life scheduler/epoch | PARTIAL        | Life 串行 epoch；Kernel 最终幂等；T03/T04                          |
| Kernel rejection 后 replan          | validator reason code 有；无 ActionResult/result query         | PARTIAL        | ActionOutcome + retryability + fresh snapshot；Action Loop 前      |
| money/food readonly                 | validator 可消费内存 balance/inventory；正式事实不存在         | PARTIAL        | 只读 fixture/query adapter；正式 owner 留给 M6                     |
| MOVE 是合法 edge 下一步             | contract 只有 destinationId；validator 只查 reachable          | PARTIAL        | 冻结 travelMinutes/busy/arrival event；Action Loop 前              |
| 30×30 replay hash 直接可用          | M2 hash 可用，但非时间 event no-op、不重放 request             | PARTIAL        | 保存 outcomes/events 并增加 domain reducers；M3 Gate               |
| 失败是可重规划状态                  | reason code 有；无 durable result/status                       | PARTIAL        | timeout 查询原 request；bounded retry/backoff；Action Loop 前      |
| currentActivity 来自 accepted event | 无 resident state/execution/projection                         | NOT AVAILABLE  | 只能由 committed event/observation 派生；T03/T04                   |
| Actor 可直接等于 Resident           | actor 只是 validator snapshot 的 id/version/capability         | ADJUST         | Resident Entity → ActorRef/Capability；T01 boundary                |

RES-M3-001 当时基于 M2-T02，关于 M2-T03/T04/T05 未完成的状态描述已过时；关于 ActionResult、资源读边界、MOVE、暂停/replay 的风险仍有效。

总判定：架构边界可保留；必须把“请求进入 Kernel 后一定有结果和事件”的隐含假设改为显式前置契约。T01 可保持纯 fixture，T02+ 和 30×30 Gate 不得跳过 outcome、observation 和 MOVE 完成语义。
