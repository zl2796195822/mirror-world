# 24 M6 Compatibility Boundary

## M3 may own

- a Kernel-owned, bounded, versioned food-unit consumption capability required
  to make M3 EAT causal;
- the accepted EAT event and its deterministic Hunger relief input;
- the existing fixture cash/food read snapshot as an advisory/preflight input;
- work obligation and attendance completion as M3 behavior evidence.

## M3 may not own

- merchant offers, prices, seller balances, accounts, payment, stock markets,
  inventory settlement, journal entries, wage calculation, payroll, arrears,
  rent, or `MoneyPressure`;
- a second inventory/resource table whose values diverge from the Kernel/M6
  owner;
- any accepted BUY settlement.

The M3 food capability is deliberately a narrow compatibility seam: it
consumes a resident-owned food unit and records before/after version in the
Kernel event. M6 may later replace the adapter with full inventory/economic
authority while retaining the action/request/outcome boundary. If M6 rejects
this seam, the EAT ADR must be revised before implementation; the Life Engine
must not compensate by mutating resources.

## Handoff facts

`RESIDENT_EAT_COMPLETED` can be consumed by future economy/accounting logic,
but it is not a purchase event. `RESIDENT_WORK_COMPLETED` can be an M6 payroll
input, but M3 does not compute wages. M6 owns the full settlement and economic
replay gate.
