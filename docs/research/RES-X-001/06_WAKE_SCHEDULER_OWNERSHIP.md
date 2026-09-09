# 06 Wake / Scheduler Ownership Reconciliation

## Result

`PARTIALLY_ALIGNED` · `PENDING_FORMAL_EXTENSION`。冻结研究当时把 driver/order 标成 `PENDING_PRE_AL_07`；当前 `origin/main@2e526d3`（实现父提交 `a3581a5`）已正式建立一个 M3 v1 deterministic serial driver 与 due/wake boundary。尚未形成的是跨 M5/M6/M8/M10 的完整 owner contract（尤其 lease/fence、decision acknowledgement、经济 due item 与未来 cognition wake）。不得把各研究的消费者模型实现成互相竞争的 scheduler。

## Ownership matrix

| Concern                         | Owner proposed                                                  | Consumer                                          | Must not own                           | Status                                       |
| ------------------------------- | --------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------- | -------------------------------------------- |
| due-work persistence/read model | current PRE-AL-07: runtime due + `scheduled_wake_registrations` | driver, M8 catch-up, future cognition boundary    | Redis queue, M5 worker                 | SATISFIED for M3 v1; extension pending       |
| wake ordering                   | PRE-AL-07 driver                                                | M8, M10, M5, M6                                   | wall-clock completion order            | exact key pending                            |
| wake discovery/rebuild          | M8-compatible driver adapter from durable facts                 | driver                                            | client, Provider, AgentQueue           | pending                                      |
| wake execution                  | PRE-AL-07 driver calls Kernel/ports                             | M3 Life, M5 bounded operation, M6 process         | wake index itself                      | pending                                      |
| resident loop                   | M3 action-loop/driver                                           | Life Engine                                       | M5 Agent Runtime                       | PENDING_M3; PRE-AL-07 does not implement T04 |
| cognition promotion/demotion    | M10 policy                                                      | M5 executor, future decision boundary             | M5 provider, client attention          | PENDING_M10                                  |
| economic due item semantics     | M6                                                              | driver via bounded command                        | M8 account/journal                     | PENDING_M6                                   |
| catch-up planning               | M8 policy/driver mode                                           | Kernel action/time ports, current driver boundary | a second simulator                     | PENDING_M8 / formal catch-up contract        |
| queue acceleration              | Redis/queue adapter                                             | driver/worker                                     | durable truth                          | derived/cache only                           |
| retry/reconciliation            | PRE-AL-06 policy consumed by driver                             | all action/cognition callers                      | infinite queue retry                   | current policy, integration pending          |
| failure isolation               | driver + Kernel boundary; resident-scoped where possible        | M8/M10/M5/M6                                      | one poison resident halting all worlds | pending driver contract                      |

## Candidate order key

M8 and M3-003 proposed `(wakeWorldTime, priorityClass, residentId, wakeReason, decisionEpoch)`; current PRE-AL-07 formalizes the M3 v1 order as `(dueWorldTime, residentId UUID bytes, wakeReason, decisionEpoch)` with explicit work-type/identity tie-break. `priorityClass` is not part of the current scheduler contract. M10 may consume the current wake output, but its cognition priority/budget policy remains separate and pending.

## Anti-competition rule

One future driver should discover durable due work, choose deterministic order, invoke the correct consumer, and commit only through Kernel. M5 may have an AgentQueue for bounded cognition execution; that queue must not own World Time, due truth, resident completion, or worldSeq. M8 catch-up is a driver mode (`runUntil(target)`), not a second Life Engine.

## Key semantic gap

`wakeReason` is not consistently scoped across activity due, need threshold, work boundary, replan defer, cognition wake, human interaction, and institution due. `decisionEpoch` is an ordering/fencing input in research, not a committed current-main field. Formal PRE-AL-07 must decide whether these are one typed wake record or layered records.
