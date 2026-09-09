# Port Plan

研究成果只能按以下顺序转入 future formal work，不能整目录或整分支直接合并。

```text
then-current main audit
  → M3/M4/M5/M6/M8 compatibility review
  → M9 ADR (identity + authority + privacy)
  → formal contracts / ports
  → TDD for one bounded task
  → migrations only where approved
  → runtime implementation
  → real integration/security/privacy/CI Gate
```

## Candidate ports

| Port                    | Owner                                 | Consumer                    | Current provider         |
| ----------------------- | ------------------------------------- | --------------------------- | ------------------------ |
| `AuthPrincipalPort`     | Auth boundary                         | identity link               | M1 dev adapter only      |
| `ResidentIdentityPort`  | M9 identity                           | Kernel/M4/M5/M7/M8 adapters | absent                   |
| `ResidentActorResolver` | world/kernel seam                     | observation/action          | M3 deterministic fixture |
| `AuthorityDecisionPort` | M9 authority + Kernel validation seam | action path                 | absent                   |
| `IdentityAuditPort`     | security boundary                     | audit/ops                   | absent                   |
| `EmbodimentProvider`    | M7                                    | renderer                    | experiment only          |
| `Capture/ProofProvider` | future privacy boundary               | consented setup             | absent/formal defer      |
| `ResourceReadPort`      | M6/economy seam                       | observation/life            | M3 read-only fixture     |

## Cutover invariants

- ResidentId remains stable when M3 seed → durable resident source is migrated。
- ActorRef remains world-scoped and does not absorb permissions。
- `requestedBy=PROXY` is not silently treated as a valid charter proof。
- M5/M7/M8 adapters work when M9 optional capabilities are unavailable, with honest unavailable/degraded status。
- M6 resource revision remains distinct from charter version, actor/runtime version and worldSeq。
- World Event replay remains independent from identity audit replay and LLM cognition。
