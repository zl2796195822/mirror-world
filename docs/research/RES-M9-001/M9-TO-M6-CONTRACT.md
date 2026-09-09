# M9 → M6 Contract

## Separation

M9 states which resident/control context may attempt an economic action. M6 owns accounts, inventory, offer, journal and economic mutation authority. `ResidentIdentity ≠ EconomicAccount`。

```text
Resident rights + Proxy spending permission
  → ActionRequest(BUY/EAT/WORK)
  → M6/Kernel locks and revalidates account/offer/inventory
  → atomic mutation + journal + World Event + KernelOutcome
```

## Spending rule

Charter budget is a ceiling, not a balance. A resident with 100000 cents may grant a proxy a 500-cents daily cap. M6 must check both current account authority and current charter decision; neither M5 nor M9 may mutate cash/inventory.

## Required audit join

Economic transaction should retain `ActionRequestId`, `KernelOutcome`, `eventRefs`, `delegationRef` and `charterVersion` when applicable, while keeping journal entries separate from high-level World Events. Failed/stale/duplicate/conflict requests must not create partial financial facts.

## Pending

Formal M6 accounts/resource revision/offer version/replay contracts do not exist on current main. M9 does not add them or change `ResourceReadPort`。
