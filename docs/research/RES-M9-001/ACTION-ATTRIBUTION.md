# Action Attribution

## Two attributions

### World attribution

“世界里谁做了这件事？”答案通常是 `residentId`，经当前 `ActorRef` 进入 ActionRequest/Kernel。成功 commit 后，World Event 的 actor 仍可以是该 resident。

### Control/audit attribution

“该 resident 的这次 action 是由谁/什么控制产生的？”答案放在独立 control context/audit trace：human principal（如适用）、control mode、delegation ref/version、AgentOperation ref、ActionRequest ID、KernelOutcome 和 event refs。

## Suggested sidecar

研究层建议未来 ActionRequest composition 伴随一个不可伪造的 `ControlContext`，而不修改现有 `ActorRef`：

```ts
ControlContext = {
  worldId: string;
  residentId: string;
  actorRef: ActorRef;
  mode: "DIRECT" | "DELEGATED" | "AUTONOMOUS_RULE";
  principalRef?: string;
  delegationRef?: string;
  charterVersion?: number;
  cognitionSource: "HUMAN_INPUT" | "RULE" | "PROXY_RUNTIME" | "LLM";
}
```

这是 future port shape，不是对现有 contract 的修改要求。Kernel 只需要验证可验证的 identity/authority proof，不需要了解 LLM 内部。

## Audit rule

有效 proxy action 不是“没发生的动作”；它可以是 resident A 的世界行为，同时保留其 control origin。后续 M4 可根据 lineage 把 interaction 进入 A 的 memory，未来制度层再使用完整审计判断责任；M9 不做法律结论。

## Existing constraint

现有 `world_events` 只提供可选 `actorId/targetId` 与通用 payload/correlationId（`packages/world-kernel/src/world-events-store.ts:27-41`），不能被描述为已具备完整 action attribution audit。
