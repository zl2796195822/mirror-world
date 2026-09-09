# 05 Three-Axis LOD Reconciliation

## Result

`PARTIALLY_ALIGNED`。M8 W0/W1/W2、M10 I0–I3、M7 V0–Vn 都可以解释为不同控制面，但 M5 的旧 I-LOD 把 dormant 放进 I0，且各研究没有正式冻结组合约束。三轴在本包中只作 reconciliation map，不是正式 LOD contract。

## Axes

| Axis            | Values                                                                                | Research owner direction          | Changes                                  | Must not change                    |
| --------------- | ------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------- | ---------------------------------- |
| World Execution | W0 ACTIVE / W1 BACKGROUND / W2 DORMANT_CATCHUP                                        | M8 + future driver                | world compute strategy and catch-up mode | existence, identity, history       |
| Intelligence    | I0 RULE_ONLY / I1 LIGHT_COGNITION / I2 STRUCTURED_COGNITION / I3 HIGH_VALUE_REASONING | M10 policy; M5 execution          | cognition depth, cost, bounded frequency | authority, rights, facts           |
| Visual          | M7 V0…Vn                                                                              | M7 projection/presentation policy | render detail, AOI, asset complexity     | logical location, identity, events |

## Candidate combination matrix

| Combination      | Classification               | Evidence / condition                                                                        |
| ---------------- | ---------------------------- | ------------------------------------------------------------------------------------------- |
| W0 + I0 + V3     | VALID                        | visible high-fidelity presentation can remain rule-only                                     |
| W0 + I3 + V0     | CONDITIONALLY_VALID          | cognition can be triggered without rendering; budget/charter/kernel constraints still apply |
| W1 + I0 + V0     | VALID                        | M8 background due work and M10 zero-LLM baseline                                            |
| W1 + I2 + V1     | CONDITIONALLY_VALID          | only meaningful wake, provider/budget/fairness permit; not a permanent background default   |
| W2 + I0 + V0     | VALID                        | M8 catch-up minimum: event-jump, no presentation                                            |
| W2 + I1 + V0     | UNDEFINED / PENDING_CONTRACT | M10 allows deterministic I0/I1 fallback in catch-up; M8 dormancy table says I0              |
| W2 + I2 + V0     | INVALID for new cognition    | no new expensive cognition in W2; historical frozen envelope may be replayed                |
| W2 + I3 + Vn     | INVALID for new cognition    | no presentation and no new I3 generation in dormant catch-up                                |
| W0/W1/W2 + any V | CONDITIONALLY_VALID          | V is client/projection policy and does not imply existence or execution                     |

## Mixing audit

- `dormant` is W2 execution policy, not absence, invisibility, or I0 by definition.
- `invisible`/outside AOI is M7 presentation filtering, not resident deletion or no-facts.
- `rule-only` is M10 I0 cognition, not W2 and not V0.
- M5-001's `LOD-I0 = DORMANT / DETERMINISTIC ONLY` is the direct conflict; M10 explicitly relocates dormancy to W1/W2.

## Future contract questions

Freeze the allowed cognition set for W2, whether deterministic I1 is included, whether V0 means no client or a minimal marker, and which transitions are policy-only. Marked `X-C001`, `X-C002`, `X-C003`, `X-C016`.
