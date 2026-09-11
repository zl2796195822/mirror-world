# 15 Fixture Review

## Integrity findings

- The fixture is the deterministic T01-derived 30-resident seed with 26 employed and 4 unemployed residents.
- `FOOD_BANDS = [1, 2, 3, 4, 0, 2]` is part of the fixture semantics. Five residents therefore start with `foodUnits=0`.
- Homes and workplace locations are deterministic and the employed workplace routes are reachable. Fixture integrity and commute existence pass.
- Run-08 resource conservation passes: 60 EAT starts consume exactly the positive initial food quantity; no negative resource value or fabricated food is observed.

## Decision

`FIXTURE_SEMANTICS_DEFECT = NOT_PROVEN`; `FIXTURE_CHANGE_REQUIRED = NO`. Giving the five residents food would change the input contract to make an unconditional Gate predicate convenient, not repair a demonstrated T01 defect. A free meal, regeneration, workplace grant, or BUY settlement would also cross the M6 boundary and create a second resource truth.

Keep the fixture hash and resource semantics unchanged. If a future governance decision intentionally changes the fixture, it must be a separately hashed fixture change with its own formal DoD and rerun lineage; it is not part of this reconciliation.
