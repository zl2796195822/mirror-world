# 07 BUY Explicit Boundary

`BUY` is declared by the existing Action Contract but is not an executable M3
resident lifecycle.

## M3 disposition

- Life may observe a bounded cash/food snapshot and mark a BUY path as
  advisory or infeasible.
- Life may not submit an accepted BUY in the M3 Story Sanity profile.
- The M3 machine gate fails if a `BUY` request commits an outcome or a purchase
  event appears in the run.
- A current validator accepting a BUY-shaped request is declaration and
  preflight evidence only; it does not make BUY executable.

## M6 owner

Full BUY requires one Kernel-owned atomic settlement for buyer cash, merchant
cash, stock, buyer inventory, offer/price revision, journal entries, purchase
event, idempotency, and economic replay. Those facts do not exist as a mature
M3 authority. They belong to M6 Economy.

No M3 document, candidate, fixture, or test may implement or imply price,
account transfer, merchant balance, payment, journal, payroll, or inventory
settlement. See [24](./24_M6_COMPATIBILITY_BOUNDARY.md).
