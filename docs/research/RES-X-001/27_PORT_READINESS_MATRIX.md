# 27 Formal Port Readiness Matrix

`READY` 在本表只表示依赖已闭合；没有任何一项因此获得 `READY_FOR_IMPLEMENTATION`。

| Port                       | Must resolve first                                                                                                                                 | Current evidence                                                                                     | Readiness                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------- |
| M7 Projection / Realtime   | M3 Kernel Event/Outcome source；M8 freshness/catch-up order；M9 identity-safe labels；snapshot/afterSeq contract；place/asset/geometry version     | M2 Event Ledger/Outcome formal；PRE-AL-07 driver current；M7/M8/M9 remaining research contracts open | `NOT_READY / PENDING_FORMAL_CONTRACT`  |
| M8 Persistence / Offline   | PRE-AL-07 current driver；M3 full action loop/replay；downtime/world-time ADR；wake ack/defer semantics；cognition envelope; economy due owner     | PRE-AL-07 M3 v1 PASS；full replay, lease/fence, catch-up and domain boundaries remain open           | `PARTIAL / NOT_READY`                  |
| M9 Identity / Proxy        | M3 ActionRequest/ActorRef boundary；security/auth source；ResidentId genesis；charter/revocation; privacy/public projection                        | current M3 has ActorRef/ActionRequest foundations；RES-M9 is frozen research only                    | `NOT_READY / PENDING_SECURITY_PRIVACY` |
| M10 Cognition / Population | current driver wake output；M5 I namespace reconciliation；M8 offline/defer policy；M9 CognitionAuthority/Charter；budget/provider/replay envelope | PRE-AL-07 current wake boundary; all semantic joins remain pending                                   | `NOT_READY / PENDING_CONTRACTS`        |

## Gate interpretation

Current main's PRE-AL-07 PASS is a prerequisite result, not a port approval. M3-T04 remains `BLOCKED_BY_PRE_ACTION_LOOP_GATE`; no row is an implementation authorization.
