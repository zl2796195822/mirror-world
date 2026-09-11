# 05 EAT Analysis

## Finding

`EAT_GATE_CONTRACT_FIX_REQUIRED`.

The frozen Hard Gate #3 predicate requires every resident to complete EAT. The
T01 fixture deterministically assigns
`FOOD_BANDS = [1, 2, 3, 4, 0, 2]` across 30 residents, producing five
residents with initial `foodUnits=0`. The run has 60 EAT starts, exactly the
total positive initial food units, and 25 residents with completion.

## Feasibility answers

1. The 25 positive-food residents have a legal local EAT capability if an EAT
   Need episode is observed: their resident-owned food item is at the home
   location, and home exposes `EAT`. Positive food alone is not proof of Need
   eligibility.
2. The five zero-food residents have no feasible EAT opportunity under the M3
   resource contract. There is no free meal, shared food, workplace grant,
   store grant, or regeneration mechanism in the run contract or fixture.
3. `BUY` is declared but non-executable in M3; settlement belongs to M6. The
   Kernel correctly rejects/fails closed rather than inventing food.
4. The resource CAS, non-negative invariant, EAT events, replay hashes, and
   resource-conservation Gate all pass. No Kernel defect is shown.

## Options reviewed

| Option                                                                                       | Decision                                                     |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| E1: require response only when feasible EAT opportunity exists                               | **Recommended**                                              |
| E2: require hunger-threshold response plus valid resource, with bounded unavailable evidence | **Required companion evidence**                              |
| E3: change fixture to give every resident food                                               | Rejected; changes T01 semantics without a fixture DoD defect |
| E4: introduce food acquisition/BUY                                                           | Rejected; Economy/M6 scope expansion                         |

The minimal correction is to separate Need eligibility from resource
feasibility, conditionalize completion coverage on feasible EAT episodes, and
require an explicit bounded unavailable/defer record for eligible but
infeasible episodes. It must not add a Gate-only grant or a second inventory
truth.

See [09_EAT_FEASIBILITY_MATRIX.md](./09_EAT_FEASIBILITY_MATRIX.md).
