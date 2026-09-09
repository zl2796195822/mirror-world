# Current Identity Audit

## 结论

当前 main 只有开发认证、deterministic resident seed、fixture ActorRef、ActionRequest、Kernel validator/outcome 和 resident runtime read/write boundary。它没有正式 Digital Identity、Resident table、Control Authority、Proxy Charter 或 identity audit authority。

仓库根 `AGENTS.md:5-7` 仍保留“停止在 M1、不得执行 M2+”的旧项目范围文字；这与当前 `docs/PROJECT_STATE.md:3-5,82-96` 及本次 baseline 的已完成 PRE-AL-06 事实漂移。本研究没有修改治理文件；后续 formal 任务应先解决该文档一致性问题。

## 实际存在

| 能力             | 当前事实                                                                                                           | 证据                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Auth             | `AuthUser { id, email, status }`；开发 adapter 只在 development + `MIRROR_DEV_AUTH=true` 生效                      | `apps/web/lib/auth/adapter.ts:3-28`; `apps/web/lib/auth/config.ts:1-14`                                         |
| Resident seed    | 30 个确定性 `NATIVE` seed residents；`residentId` 与 seed/profile 可重建                                           | `packages/db/src/resident-seed.ts:4-14,60-90,244-324`                                                           |
| ActorRef         | 严格字段为 `worldId`, `residentId`, `actorId`, `kind=NATIVE_RESIDENT`                                              | `packages/contracts/src/resident-bridge-contract.ts:3-10,22-25`                                                 |
| ActionRequest    | 六类动作；`requestedBy` 是 `HUMAN/RULE/AI/PROXY` 来源 enum，不是身份或权限证明                                     | `packages/contracts/src/action-contract.ts:12-22,40-86`                                                         |
| Kernel validator | 校验 actor、world、运行状态、请求时间、版本、位置和资源；当前 snapshot 的 `allowedRequesters` 只能作为现有基础能力 | `packages/world-kernel/src/action-validator.ts:17-54,87-131`                                                    |
| Outcome          | durable status 只有 `COMMITTED/REJECTED/CONFLICT`；成功关联有序事件 refs                                           | `packages/contracts/src/action-outcome-contract.ts:29-122`                                                      |
| Runtime          | resident/world 复合主键、当前 location/activity、stateVersion、sourceWorldSeq                                      | `packages/db/src/schema.ts:58-118`; `packages/contracts/src/runtime-state-contract.ts:60-124`                   |
| Resource bridge  | 只有只读 `cashCents`, `foodUnits`, `version`；M3 fixture `version=0`                                               | `packages/contracts/src/resident-bridge-contract.ts:12-19,45-51`; `docs/verification/PRE-AL-03-report.md:52-64` |

## 当前明确不存在

- `users.id` 到 Digital Identity 或 Resident 的正式 link。
- durable Resident Identity/Origin/continuity record。
- control principal、delegation、charter version、revocation 或 confirmation state。
- Proxy permission validator；当前 `PROXY` 不是授权。
- resident-owned account/inventory/journal；M6 仍是 research input。
- M4 memory/relationship runtime；M5 Agent Runtime/LLM Session；M8 offline driver。

## Identity reading

PRE-AL-03 已明确：Resident ID 不是 `users.id`、auth session ID 或 Digital Identity ID；ActorRef 只承载 identity/scope，不承载 permission、status、location 或 version conflict。证据：`docs/verification/PRE-AL-03-report.md:20-32`。

因此 M9 不应把现有字段“升级命名”为完整身份系统；应新增未来的 identity/authority ports，并保留当前 contract 的语义。
