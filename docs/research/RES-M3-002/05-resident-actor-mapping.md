## 最终 M2 的 actor 语义

`KernelActorSnapshot` 只有 `id/worldId/status/version/locationId/allowedRequesters/inventory/balanceCents/employmentWorkplaceId`（`action-validator.ts:19-33`）。`actorId` 在 request/event 中是 UUID，没有 actors 表或 FK；`requestedBy` 是 `HUMAN/RULE/AI/PROXY` 来源，不是 user 或 resident identity。

## 推荐关系

```text
Auth Identity (user/session)
        ≠
Digital Identity (HUMAN / PROXY / NATIVE)
        ≠
Resident Entity (life profile in a world)
        ↓
ActorRef / ActorCapability (Kernel action subject, versioned)
```

推荐 `Resident Entity → ActorRef/Capability`，而不是 `Resident = Actor = users.id`。

### Resident profile

属于 Resident/Life/Identity：`residentId`、`worldId`、`identityKind=NATIVE`、home、routine、seeded personality、employment reference、goals 和 profile version。T01 生成 profile 和 fixture-level actorRef 即可，不创建正式 identity/actor migration。

### ActorRef / Kernel actor

属于 Kernel execution boundary：stable actor id/world、active status、version token、authoritative location/activity reference、allowed requester/capability、action-time resource snapshot reference，以及 request/event/result correlation。

## T01 必须冻结

```text
residentId       // 人生模型稳定标识
actorId          // Kernel action subject（若 fixture 需要）
identityKind     // NATIVE，不是 HUMAN/PROXY
worldId          // world isolation
profileVersion   // fixture contract version
```

禁止用 auth cookie 作为 actor，禁止把 users.id/residents.id/actor.id 为方便硬合并，禁止把 actor version/location/resource ownership 放进 Life 私有 state。

结论：Resident 不直接等于 Kernel Actor；Resident 是生命实体/档案，ActorRef 是可被 Kernel 校验和版本控制的行动能力引用。
