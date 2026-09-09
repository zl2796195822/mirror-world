# M8-TO-M6-CONTRACT

M6 = Economy durable authority (research only; not implemented).

## Boundary

M8 schedules **when** economic due operations should run.  
M6 owns **what** economic truth is and how it mutates.

## Future Scheduled Economic Operations

| Operation | Wake boundary |
| --------- | ------------- |
| Payroll settlement | Shift end / pay period |
| Rent | Calendar world-day |
| Business open/close | Schedule |
| Inventory restock (future) | Schedule |

These become wake-index `INSTITUTION_DUE` / `WORK_BOUNDARY` candidates.

## M8 Must Not

- Own accounts, inventory, journal
- Treat M3 fixture `cashCents`/`foodUnits` as durable economy
- Invent second financial idempotency layer
- Implement rent/tax/loans as offline-persistence side effects
- Directly change trust/relationship from economic events

## Three-Layer Accounting Alignment

M6 research:

```text
World Event Ledger     = business facts
Accounting Journal     = double-entry internals
Materialized Projections = balances/inventory
```

Catch-up commits World Events + journal atomically via Kernel — M8 only ensures the scheduler reaches those boundaries.

## Replay Alignment

Economic replay uses committed events + journal, not checkpoint-as-truth.  
M8 equivalence Gate for v1 may exclude full economy until M6 lands; then must extend.

## Payroll Offline Example

```text
World Time reaches shift end
  → wake WORK_BOUNDARY
  → M6-owned settlement via Kernel system ActionRequest (deterministic key)
  → WAGE_PAID / arrears World Event
  → projections update
```

No per-minute WORK_DUE spam.

## Version Discipline

Do not use `worldSeq` as `resourceVersion`. Economy versions are separate (RES-M6-002).
