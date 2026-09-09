# 17 Authority Classification Matrix

## Classification rule

这是 reconciliation 分类，不是新 schema。`WORLD_EVENT` 是历史记录；`DOMAIN_FACT` 是 Kernel 事务内产生的领域事实或 durable current state；`AUDIT_FACT` 用于解释授权/决策；其余均不可越过 Kernel 成为 World Truth。

| Item                      | Classification                                                        | Truth boundary / owner direction                     | Conflict or note                                           |
| ------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| Event Ledger              | `WORLD_EVENT` + `WORLD_TRUTH` history                                 | Kernel append-only ledger                            | 唯一客观历史；不可由 projection 重写。                     |
| KernelActionOutcome       | `DOMAIN_FACT` disposition + linked `WORLD_EVENT`                      | Kernel transaction                                   | `COMMITTED/REJECTED/CONFLICT` 与调用处置分离。             |
| `resident_runtime_states` | `DOMAIN_FACT` current runtime projection                              | Kernel-owned current state; rebuild contract pending | durable 运行状态不是完整历史。                             |
| Proxy Charter             | `CONTROL_AUTHORIZATION`                                               | M9 identity/control boundary                         | 影响未 commit 行为，不删除历史。                           |
| `delegationRef`           | `CONTROL_AUTHORIZATION` + `AUDIT_FACT`                                | M9 / security                                        | 不是 ResidentId，不应成为客户端自报字段。                  |
| Cognition Envelope        | `COGNITION_EVIDENCE`                                                  | M10/M5 cognition boundary                            | 不等于 selected world action；必须支持 replay。            |
| Intelligence LOD decision | `AUDIT_FACT` / policy evidence                                        | M10 policy                                           | 不能直接改 World Authority。                               |
| Visual LOD                | `PRESENTATION_STATE`                                                  | M7 presentation                                      | 由 AOI/device/attention policy 影响；不改变 identity。     |
| World Execution LOD       | `AUDIT_FACT` / execution policy                                       | M8/driver policy                                     | 不等于 I-LOD 或 visibility。                               |
| freshness                 | `PRESENTATION_STATE` + `PROJECTION` metadata                          | M7/M8 read boundary                                  | 不能被误读为 Truth seq。                                   |
| snapshot                  | `PROJECTION`                                                          | M7 projection store                                  | 可删除、重建；需携带明确 cursor semantics。                |
| `afterSeq`                | `PROJECTION` cursor                                                   | M7 realtime boundary                                 | 是投影/订阅游标，不自动等于 World Time。                   |
| `AvatarAssetId`           | `PRESENTATION_STATE`                                                  | M7 asset/presentation                                | `Avatar ≠ Identity`。                                      |
| `locationId`              | `DOMAIN_FACT`                                                         | Kernel runtime/location boundary                     | 视觉 transform 不能回写 location。                         |
| `x/y/z`                   | `PRESENTATION_STATE` unless future coordinate contract says otherwise | M7 scene                                             | 当前只能作为 visual transform；logical location 另行审计。 |
| resident memory           | `DOMAIN_FACT` (subjective resident state)                             | M4/future memory owner                               | 主观记忆不可冒充客观 Event Ledger。                        |
| relationship projection   | `PROJECTION`                                                          | M4/M7 consumer                                       | 可重建；不能作为关系事实唯一来源。                         |
| digest                    | `DIGEST`                                                              | M7/M8 presentation/read service                      | 摘要不是 event history，不能用于提交动作。                 |
| audit log                 | `AUDIT_FACT`                                                          | security/ops/identity                                | 不自动升级为 World Event。                                 |
| `lastSeen`                | `PRESENTATION_STATE` / telemetry                                      | product/session owner                                | 不表示 resident 已经 offline/deleted/paused。              |
| human online state        | `IDENTITY_PRIVATE_DATA` / session state                               | auth/product boundary                                | 不自动启用 Proxy，也不改变 World Time。                    |
| Realtime update           | `CACHE` / `PROJECTION` delivery                                       | realtime service                                     | 丢失可 snapshot/replay recovery。                          |

## Reconciliation findings

主要冲突是 `KernelActionOutcome`、runtime、cognition envelope 和 `x/y/z` 在不同研究中有时被笼统称为“state/event”。未来合同必须给出 payload kind、owner、source cursor 和 forbidden write path；本表不直接创建该合同。
