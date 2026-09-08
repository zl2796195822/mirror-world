## 定义

30×30 = 30 个固定 seed 居民 × 30 个 world days = 43,200 个 world-minute 逻辑步。它不是 M2 已通过的测试，也不应绑定 M4/M6/M7/M10 的未来能力。

| 场景                    | 当前 M2                                                  | M3 后可验证                            | 后续依赖                          |
| ----------------------- | -------------------------------------------------------- | -------------------------------------- | --------------------------------- |
| 连续 30 天无崩溃        | NOT AVAILABLE；无 resident/simulator                     | M3 Gate                                | scheduler/lease/driver            |
| 睡眠、饥饿、工作、回家  | NOT AVAILABLE 或仅 validator 内存 snapshot               | M3                                     | ActionResult + fixture read model |
| 商店关闭/余额不足       | reason code 局部 AVAILABLE                               | reject + bounded replan                | M6 真实资源 owner                 |
| 移动与位置              | world seq/isolation AVAILABLE；无 resident location fact | only-after-event                       | MOVE completion semantics         |
| TALK                    | validator 局部同地点判断                                 | basic TALK                             | M4 relationship/memory            |
| 资源守恒                | M2 无资源事实                                            | Life 不写、Kernel outcome/event 可核验 | M6 accounts/inventory/ledger      |
| 时间/deadline           | world clock/future time rejection AVAILABLE              | due/travel slack                       | 复杂 catch-up/DST                 |
| pause/resume            | clock AVAILABLE                                          | needs/request/scheduler pause          | lease recovery                    |
| replay hash             | M2 state/history hash AVAILABLE；domain event no-op      | full decision/action/event hash        | domain reducers                   |
| 差异分布                | M2 无 resident fixture                                   | T01 snapshot + 30×30 stats             | M4/M6 因果差异                    |
| conflict/retry/长期失败 | duplicate/conflict AVAILABLE；无 execution feedback      | outcome query + bounded replan         | executor/scheduler                |

## 不属于 M3 Gate

Relationship/Memory 是 M4；工资、租金、库存、双分录和正式就业变化是 M6；Web 3D 每帧位姿/AOI 是 M7；300/1000 人 LOD benchmark 是 M10。M3 只能验证只读资源和无越权写，不伪造这些 authority。

## 证据要求

M3 必须留存 seed/config、initial snapshot hash、decision trace、ActionRequest、outcome、event seq、最终 summary hash、invariant violations 和 pause/fault injection 结果。mock/fixture 通过不能升级为真实 PostgreSQL/action acceptance。
