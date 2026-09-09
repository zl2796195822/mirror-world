# Consent and Provenance

## ConsentRecord direction

涉及 face、voice、persona、life history、memory import 或 public representation 时，未来需要版本化 `ConsentRecord`，至少表达：

```text
consentId / subjectRef / purpose / scope
source / issuedAt / expiresAt / revokedAt
policyVersion / artifactRefs / status
```

Consent 是用途/处理授权，不自动成为 Resident creation、world action 或 rights grant。Proxy Charter 也不能用模糊的“同意 AI”代替逐项 permission。

## Provenance

每个 Digital Twin/embodiment asset 应可追溯 source kind、provider、provider version、artifact version、consentRef、createdAt、retention/deletion state。hash 可用于完整性，但 hash 不是 identity proof。

## Revocation

撤销 consent 应阻止未来相关处理/使用，并使依赖它的未提交 operation 失效；它不能伪造已经发生的 World Event 消失。具体删除、导出、匿名化与法律义务属于未来 privacy/legal design。

## World Event rule

Consent details、raw capture、biometric embedding、auth token、email/phone/real ID 和 private charter secret 不进入 World Event Ledger。
