# Identity and Control Audit

## Separate ledgers

1. **World History**：Kernel committed facts、world-local seq、World Event refs；用于世界 replay。
2. **Identity/Security Audit**：link、origin、control、charter、consent、proof、operation 和 decision trace；用于安全/治理审查。

Identity audit 不等于把所有 private details 塞进 World Event，也不能成为第二个事实 commit authority。

## Minimum action attribution fields

未来重要 action 的 audit projection 至少能回答：

```text
worldId / residentId / ActorRef
controlMode / principalRef (if applicable)
delegationRef / charterVersion (if applicable)
AgentOperationId (if applicable)
ActionRequestId / KernelOutcome / eventRefs
authorization decision / policy versions / recordedAt
```

不要记录 hidden chain-of-thought、完整 private prompt、biometric raw data 或未脱敏其他居民 private content。短 rationale 也要经过 redaction/retention policy。

## Audit invariants

- committed action 不能被 revoke 伪造消失；
- denied/stale action 不产生 World Event；
- audit identity 不得跨 world/resident 混淆；
- audit trace 不能反向改 World Truth；
- operator/admin action 与 resident action 必须可区分。

当前 main 只有 generic event `actorId/targetId`、correlationId 和 request/outcome refs，尚无该完整 audit authority。
