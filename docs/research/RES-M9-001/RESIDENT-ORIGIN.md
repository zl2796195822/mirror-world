# Resident Origin

## 推荐

不要用一个 `ResidentType` 表达所有语义。M9 v1 建议最小正交模型：

```text
ResidentOrigin = NATIVE | HUMAN_ORIGIN
HumanLink.mode  = DIRECT_HUMAN | DIGITAL_TWIN   (only when HUMAN_ORIGIN)
ControlMode     = DIRECT | DELEGATED | AUTONOMOUS_RULE | SHARED_POLICY
```

如果正式 contract 更希望保留 `DIGITAL_TWIN` 作为 origin 值，也只能把它解释为“创建时采用了 twin mapping”，不能把它解释为当前控制者或 cognition provider。推荐首选 `NATIVE/HUMAN_ORIGIN + HumanLink.mode`，因为 Digital Twin 是 human-origin resident 的一种可替换 profile/relationship。

## 四类组合

| 业务称呼                  | Origin                | Link/profile                         | Control                                   | Cognition                          |
| ------------------------- | --------------------- | ------------------------------------ | ----------------------------------------- | ---------------------------------- |
| Human-Controlled Resident | HUMAN_ORIGIN          | optional direct human profile        | DIRECT                                    | human input / deterministic assist |
| Human Digital Twin        | HUMAN_ORIGIN          | DIGITAL_TWIN + consent/provenance    | DIRECT, DELEGATED or temporary autonomous | human/proxy/M5 bounded runtime     |
| Authorized Proxy          | not a Resident origin | delegation over an existing resident | DELEGATED                                 | proxy operation                    |
| Native Digital Resident   | NATIVE                | no fake human owner                  | autonomous/rule/other future policy       | M3 rules + optional M5             |

Proxy 不应出现在 `ResidentOrigin`；它不是 Resident 的来源。

## Creation provenance

每个 resident creation/link 必须有可追溯的 origin record，至少含 world、resident、origin kind、created-at-world-time、policy version 和 source reference。该记录属于 identity/audit history，不自动成为公共 World Event。

## Current gap

当前 seed 只有 `identityKind: "NATIVE"`（`packages/db/src/resident-seed.ts:13,60-75`），观察 contract 也只接受 `NATIVE`（`packages/contracts/src/observation-contract.ts:124-133`）。这只是 M3 fixture 限制，不是 M9 的最终 origin model。
