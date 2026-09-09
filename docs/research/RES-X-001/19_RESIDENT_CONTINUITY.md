# 19 Resident Continuity Reconciliation

## Invariant under review

`ResidentId` 是连续人格/居民主键，不是 Avatar、Voice、LLM、Provider、Memory 或控制会话的主键。M9 的 fork/clone 规则是唯一明确的新 ResidentId 入口；下表检查其他研究是否尊重这一点。

| Change or event                              | New ResidentId? | Required audit / evidence                                     |
| -------------------------------------------- | --------------- | ------------------------------------------------------------- |
| Avatar replacement                           | No              | new Embodiment/appearance lineage                             |
| LLM replacement                              | No              | Provider/config change; cognition envelope remains historical |
| Provider change                              | No              | policy/config audit；不得重写历史                             |
| Visual LOD change                            | No              | presentation state only                                       |
| World Execution LOD change                   | No              | execution policy only                                         |
| Intelligence LOD promotion/demotion          | No              | M10 decision evidence; no identity mutation                   |
| Offline / catch-up                           | No              | world time and catch-up audit                                 |
| Proxy takeover                               | No              | `delegationRef`、`charterVersion`、control transition audit   |
| Human takeover                               | No              | stop new Proxy cognition; direct human priority               |
| Fork / clone with independent future history | Yes             | new genesis, lineage reference, explicit authorization        |

## Findings

M7 的 `Avatar ≠ Identity`、M8 的 offline continuity 和 M10 的 LOD transition 与 M9 连续性原则对齐。未闭合点是：旧 `HUMAN/PROXY/NATIVE` 字段迁移、历史 ActorRef/identity projection 的兼容格式，以及 fork 之后 memory/relationship/economic state 的复制策略。若把 Proxy 当成 Resident 类型，属于 `X-C007`；若把 Avatar/LOD 变更当成新居民，属于 `C4` truth/continuity 风险。

## Recommendation

未来所有 ActionRequest、Outcome、Projection 和 Audit payload 应显式区分 `residentId`、`actorRef`、`embodimentId`、`delegationRef` 与 cognition evidence；不得用 `avatarId` 或 `providerId` 作为连续性主键。
