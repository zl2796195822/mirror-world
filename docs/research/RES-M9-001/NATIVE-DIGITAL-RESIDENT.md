# Native Digital Resident

## Definition

Native Digital Resident 没有现实真人对应者，但可以拥有独立的 Resident Identity、memory、relationships、assets、life history、cognition、embodiment 和 future rights policy。它不是 `ownerUserId=system` 的普通 SaaS row，也不应被技术运营方的 infrastructure ownership 语义替代。

## Birth/origin direction

未来创建流程应至少生成可追溯的 identity history：

```text
genesis request/policy
  → ResidentCreated(origin=NATIVE)
  → IdentityEstablished
  → optional EmbodimentAssigned
  → world entry
```

这些名字是研究事件/审计方向，不是当前 Event Registry 的新增要求。当前 M3 seed 的 `NATIVE` 只是 fixture origin。

## Control and rights

Native resident 可以由 deterministic rule、future Agent Runtime 或未来制度允许的 controller 产生行为；这些是 cognition/control decisions，不是 human ownership。其 `CanAct/CanOwn/CanCommunicate/CanDelegate/CanBeRepresented` 等 rights 要由 future RightsPolicy 决定，M9 v1 不定义法律人格结论。

## Provenance disclosure

系统内部 audit 必须始终知道 origin，且不能让 native/proxy 伪造 human principal。其他居民是否看到 origin 是 world/institution policy，不把 `NATIVE` 强制当公共 UI 标签。
