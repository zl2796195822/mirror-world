# POPULATION-SCALING

Research complexity model only. **No benchmarks run. No fake numbers presented as measurements.**

## Population Tiers

| Tier | Residents | Notes |
| ---- | --------- | ----- |
| T0 | 30 | Current M3 fixture / first street |
| T1 | 1_000 | District |
| T2 | 10_000 | City slice |
| T3 | 100_000 | Metropolis research horizon |

## Execution Strata (not all residents equal)

| Stratum | Description | Typical count pressure |
| ------- | ----------- | ---------------------- |
| ACTIVE cognitive | Near humans, in interactions | Small fraction |
| Scheduled | Have due activities / work edges | Spikes at rush/sleep times |
| Dormant | No near-term due work | Majority most of the time |

## Complexity Model (ideal event-jump)

Let:

- `D(t)` = number of due boundaries in window
- `C` = cost per Kernel commit
- `R` = residents
- `T` = world duration in minutes

### Forbidden naive tick

```text
cost ≈ R × T × tick_cost     # e.g. 10000 × 43200 × ε  → fails
```

### Event-jump target

```text
cost ≈ D(t) × C + index_maintenance
```

where `D(t)` depends on life density (sleep cycles, work shifts, meals), **not** on wall seconds.

Rough life density for M3-like agents:

```text
per resident per world-day:
  ~1 SLEEP cycle (2 events)
  ~few MOVE
  ~2–3 EAT-related decisions (future)
  ~1–2 work edges
  → O(10) durable events/day/resident as order-of-magnitude design target
```

| Tier | Order-of-magnitude events/day (design, not measured) |
| ---- | ---------------------------------------------------- |
| 30 | ~10² |
| 1_000 | ~10⁴ |
| 10_000 | ~10⁵ |
| 100_000 | ~10⁶ |

10⁶ events/day is a serious PostgreSQL ops problem — hence partitioning/archiving research — but it is **not** 100k×1440 ticks/day.

## Layered Scaling Path

```text
M8 v1 correctness (30)
  → denser due batches (1k)
  → world sharding by district (10k)
  → partitioned worlds / regions (100k) — far future
```

Do not sacrifice 30-resident correctness for speculative 100k parallelism.

## Parallelism Direction (future)

```text
parallel decision evaluation
+ deterministic commit ordering
+ world/district isolation
```

Not: shared global lock for all worlds.

## Benchmark Plan (future, not run)

1. Synthetic due-work generator at 1k/10k residents
2. Measure: commits/sec, index rebuild time, catch-up lag for 7d/30d
3. Measure: checkpoint restore
4. Measure: digest query p95
5. Fail if ordering nondeterminism appears

## Hard Recommendations

1. No global per-second tick at any tier.
2. Wake index required before T2.
3. Partitioning plan before multi-year T2+ production.
4. LLM off the bulk path (I0/I1) at all tiers for continuity.
