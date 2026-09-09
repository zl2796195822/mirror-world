# EVENT-LEDGER-GROWTH

## Problem

Second Human World running 10 years → `world_events` may become enormous.

## Constraints

- PostgreSQL remains durable truth for M8 v1 horizon
- Append-only + world-local seq must survive
- Do not prematurely introduce Kafka / Cassandra / ClickHouse as required truth stores

## Growth Drivers

| Driver | Magnitude |
| ------ | --------- |
| WORLD_TIME_ADVANCED | Can dominate if over-logged |
| Activity lifecycle | MOVE/SLEEP start+complete |
| Future domain events | Work, social, economy |
| Bad: per-minute need ticks | **Forbidden** |

### Control #1: Don’t log noise

Needs stay lazy. No `HUNGER_TICK` events. Time advances only when Kernel clock actually jumps.

## PostgreSQL Feasible Evolution Path

### 1. Indexing

Required access patterns (see `HISTORICAL-QUERY.md`):

- `(world_id, seq)` — already unique
- `(world_id, occurred_at)`
- `(world_id, type, seq)`
- `(world_id, actor_id, seq)`
- Optional `(world_id, target_id, seq)`

Add indexes via migrations when formalized — not in this research.

### 2. Partitioning

Candidates:

| Strategy | Notes |
| -------- | ----- |
| Partition by `world_id` | Isolation; large worlds still big |
| Partition by time / seq range | Natural cold/hot split |
| Composite | world + month/seq chunk |

PostgreSQL declarative partitioning fits append-only ledgers.

### 3. Hot / Cold Split

| Tier | Content |
| ---- | ------- |
| Hot | Recent events for digest, catch-up, active queries |
| Warm | Full local SSD history for replay |
| Cold | Old partitions / archived dumps with checksums |

Replay of ancient suffix may pull from cold restore — still the same events.

### 4. Archiving (not deletion of truth)

Archive = export + checksum + retention policy.  
Not “delete old events because boring.”

Product may choose retention for GDPR-like cases later — that is a **formal policy ADR**, not this research.

### 5. Vacuum / Bloat

Append-only helps; monitor dead tuples from updates on *other* tables. Events themselves stay immutable.

## Explicit Non-Goals for M8 v1

- No Kafka event mesh as truth
- No Cassandra
- No ClickHouse as authority (may exist later as derived analytics)
- No multi-region active-active event store

## Scaling Sanity

| World age | Rough strategy |
| --------- | -------------- |
| Days–months | Single table + indexes |
| 1–2 years | Partition by time/seq |
| 10 years | Partitioned hot + cold archive + checkpoint chains |

Exact numbers require future benchmarks — this research only forms the plan shape (`POPULATION-SCALING.md` has complexity model, not fake benchmark results).
