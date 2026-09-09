# Auth, Digital Identity, Resident and ActorRef

## 四者定义

| 概念             | 回答的问题                                         | 生命周期         | 能否直接成为 World Action 主体 |
| ---------------- | -------------------------------------------------- | ---------------- | ------------------------------ |
| AuthPrincipal    | 现实侧认证主体是谁？                               | 认证系统         | 否                             |
| DigitalIdentity  | 现实主体在数字世界中的连续私有身份 anchor 是谁？   | 长期             | 否，先 link resident           |
| ResidentIdentity | 世界中哪个持续存在的实体？                         | 世界历史生命周期 | 是，通过 ActorRef/action path  |
| ActorRef         | 当前 world action 的哪个 resident actor 正在行动？ | action scope     | 它是引用/行动定位，不是权限    |

## Current compatibility

当前 `ActorRef` 已包含 `worldId`、`residentId`、稳定 `actorId` 和 `NATIVE_RESIDENT` kind；PRE-AL-03 明确它不承担权限。未来允许新增 `ControlContext` / `DelegationRef` sidecar，但不修改现有 ActorRef contract 以塞入 human、proxy、agent 的全部信息。

## Action path

```text
AuthPrincipal / ControlSession
  → resolve ResidentLink
  → resolve Resident ActorRef
  → resolve authority context
  → construct ActionRequest
  → Kernel revalidates actor + authority + world/domain constraints
```

任何未完成 link、world mismatch、跨 resident 访问或过期 session 都应 fail closed。Session 过期不改变 Resident 的世界存在性。
