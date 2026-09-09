# Digital Twin

## Definition

Digital Twin 是与现实真人存在正式、可追溯映射的 Resident representation，不是上传一张脸或复制一个 JSON 后“复制本人”。它可以采用多个 provider/representation，但必须独立保存 identity link、consent、provenance、profile、memory、relationships、assets 和 control policy。

## Separated layers

| 层                | 内容                                        | 是否改变 ResidentId                   |
| ----------------- | ------------------------------------------- | ------------------------------------- |
| Identity core     | resident continuity/origin/link reference   | 是身份锚，不随表示变化                |
| Human link        | DigitalIdentity ref、proof ref、consent ref | 变更不自动换 resident                 |
| Persona/profile   | preferences、style、life-history references | 否                                    |
| Embodiment        | body/avatar/VRM representation              | 否                                    |
| Voice             | voice representation provider               | 否                                    |
| Memory            | resident-owned cognitive state              | 否；失忆仍是同一 resident             |
| Relationships     | directional social projections              | 否                                    |
| Assets/rights     | M6 accounts and world policy                | 否；权属不随 avatar/provider 自动迁移 |
| Control/cognition | direct/proxy/rule/LLM operation             | 否                                    |

不要把上述全部塞入 `digital_twin_profile JSON`。尤其 raw biometric、auth credential、private memory 和 charter 不进入 World Event。

## No identity proof shortcut

Face/voice match、email login、camera scan 只能是 provider output 或 proof signal；它们不能单独定义 Resident Identity。M9 v1 只保留可替换 Proof Provider boundary，不接入 KYC/biometric engine。
