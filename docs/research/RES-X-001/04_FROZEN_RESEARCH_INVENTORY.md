# 04 Frozen Research Inventory

| Research    | Status at its commit                      | Commit                                     | Files / lines | Main proposal                                                             | Pending boundary                                                |
| ----------- | ----------------------------------------- | ------------------------------------------ | ------------: | ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| RES-M7-002  | `READY_WITH_PENDING_CONTRACTS`, FREEZE ON | `2cb7c8422df2939710ffe22d074e61a7a0f168f9` |     38 / 3242 | Truth→Projection→Realtime→Client→Scene→Avatar；V LOD；snapshot/afterSeq   | PRE-AL-07, M8 freshness, M9 labels, assets/device, replay       |
| RES-M8-001  | `READY_WITH_PENDING_CONTRACTS`, FREEZE ON | `f54bd878dc299f9711b1df517ce7a8fbbbe44910` |     41 / 3820 | Persistent≠Always Computing；W LOD；event-jump；wake index；S0            | driver ordering, defer durability, downtime ADR, M3 replay      |
| RES-M9-001  | `READY_WITH_PENDING_CONTRACTS`, FREEZE ON | `bd7ba955b4f5a71e56537698abb88109a228bb79` |     42 / 1213 | Origin/control/cognition/embodiment/ActorRef orthogonality；Proxy Charter | M3 loop/replay, M4–M8 contracts, security/privacy/formal source |
| RES-M10-001 | `READY_WITH_PENDING_CONTRACTS`, FREEZE ON | `dfed3b4eb78cfa472b105be3e6b860202540a78f` |     28 / 2491 | I0–I3 cognition; budget/fairness; wake-driven; frozen envelope            | PRE-AL-07, M5 namespace/execution, M8 defer, M9 charter         |

## Shared invariants

1. Kernel-exclusive fact mutation and Event Ledger history.
2. LLM/Agent/Client/Renderer/Queue/Realtime have no World Authority.
3. Replay never calls a live Provider to rewrite history.
4. Derived state is deletable/rebuildable and world-scoped.
5. Research is not formal implementation; each package keeps a pending contract list.

## Non-unifiable terms

- M5 old I-LOD semantics conflict with M10's namespace.
- M7 `sourceWorldSeq`/afterSeq is a projection cursor; M8 persisted/target World Time and freshness are world execution state.
- M9 `ResidentOrigin` is not the same as old `ResidentType` or M10's shorthand `PROXY` kind.
- M8 wake index, M10 cognition wake and M5 AgentQueue are not one contract yet.
