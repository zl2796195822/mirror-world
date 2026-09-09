# Privacy and Data Classification

## Classification matrix

| Class                          | Examples                                                                        | Default access                                |
| ------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------- |
| `PUBLIC_WORLD_IDENTITY`        | public display name/alias、world resident handle、approved embodiment reference | world clients按 public policy                 |
| `WORLD_PRIVATE_RESIDENT_STATE` | resident runtime、private status、world-scoped profile                          | Kernel、authorized resident views             |
| `AUTH_PRIVATE`                 | auth principal、session、email、account recovery refs                           | Auth boundary only                            |
| `BIOMETRIC_SENSITIVE`          | raw face/body/voice capture、embedding、derived biometric profile               | dedicated provider/vault；默认不保存          |
| `CONTROL_DELEGATION_PRIVATE`   | charter、budget、delegate、confirmation、revocation、private grant rationale    | authority/audit boundary                      |
| `AUDIT_SECURITY`               | control attribution、operation/request/outcome refs、provider metadata          | security/audit operators with least privilege |
| `MEMORY_PRIVATE`               | resident memory、private relationship projection、retrieval context             | resident-scoped M4/M5 ports                   |
| `ASSET_PRIVATE`                | account/inventory/ownership details                                             | M6/economic boundary                          |

## Access rules

- World Event Ledger 不含 auth/PII/biometric/secret/private prompt。
- M7 renderer 只拿 public embodiment projection，不拿 credential、charter、proof 或 private memory。
- M5 只能拿 bounded, resident-scoped context；不得跨 resident private read。
- M4 只接收有 lineage/eligibility 的 perception，不接收整份 auth profile。
- M6 只拿执行经济操作所需的 account/offer projection，不暴露全 ledger 给 cognition。
- Admin access 是 audit/operations capability，不是 world resident authority。

## Deletion tension

Auth/biometric/private profile deletion 与 immutable committed world history 必须分开设计。不能简单删除 World Events 造成因果断裂，也不能以历史保留为由默认永久保存 PII。M9 只记录 P0 architectural concern，不做法律结论。
