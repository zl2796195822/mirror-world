# Identity Layer Model

## 推荐层级

```text
Real Human (external principal)
        │ authenticates
        ▼
AuthPrincipal ── session ── ControlSession
        │ private link
        ▼
DigitalIdentity
        │ world-scoped link / optional twin profile
        ▼
ResidentIdentity (ResidentId)
        │ represented by
        ▼
EmbodimentProfile / VoiceProfile
        │ acts through
        ▼
ActorRef (world + resident + actor)
        │ command
        ▼
ActionRequest → World Kernel → KernelActionOutcome / World Events
```

这是一条职责链，不是 1:1 数据库外键链。`ActorRef` 只指向当前行动的 world resident actor；控制主体、授权版本和认知来源由独立的 control/audit context 表达。

## 推荐关系基数

| 关系                            | 推荐                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| AuthPrincipal → DigitalIdentity | 1:N，允许恢复/平台账号变更，但需要显式 policy                                                                           |
| DigitalIdentity → WorldResident | N:M through explicit `ResidentLink`，M9 v1 对普通 human entry 默认 1 个 primary link per world；额外 link 需显式 policy |
| Resident → Embodiment           | 1:N，单一 active representation，历史可保留                                                                             |
| Resident → ControlGrant         | 1:N，多个潜在控制主体；同一 action 只有一个有效授权决策                                                                 |
| Resident → ActorRef             | 1:N across worlds/actor incarnations；当前 M3 是 deterministic fixture one-per-resident                                 |
| Resident → Account              | 1:N or 0:N，绝不 `residentId = accountId`                                                                               |

## 不采用

- `ResidentType = HUMAN | AI | PROXY`：把 origin、control、cognition 混成一个会膨胀的 enum。
- `avatarFileHash = residentId`、`voiceHash = residentId` 或 `promptHash = authorityId`。
- 把 `requestedBy=PROXY` 当成可执行权限。

## Scope

建议 DigitalIdentity 可以是平台/跨世界的私有连续性 anchor；ResidentIdentity 保持 world-scoped。跨世界资产、记忆、关系迁移不在 M9 v1 实现。
