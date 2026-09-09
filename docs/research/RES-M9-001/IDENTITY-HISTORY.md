# Identity History

## History categories

未来 identity/security history 可以记录：

- resident creation and origin establishment；
- DigitalIdentity ↔ ResidentLink 创建/变更/解除；
- control grant、takeover、suspension、revoke；
- charter issue/amend/revoke/expire；
- embodiment/voice representation change；
- proof/consent status change；
- fork provenance。

它们默认属于 Identity/Security Audit，不自动作为所有居民可见的 World Event。若某项变更本身改变世界可观察事实，才由明确 policy 决定是否有 world projection；不要把 audit rows 全部写入 Event Ledger。

## Lifecycle direction

技术上至少要预留 `ACTIVE`, `SUSPENDED`, `RETIRED` 与 `LEGACY` 等可版本化状态。`DECEASED`/posthumous digital life、继承、家庭法、数字永生均 DEFER；M9 v1 不作法律结论。

## Account lifecycle

Auth account recovery/deletion 与 resident continuity 分离。删除认证数据、private profile 或 biometric 不等于删除已经发生的 immutable world facts；具体 erasure/anonymization 要由未来 privacy/legal review 决定。
