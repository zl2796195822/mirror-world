# 21 Cross-World Isolation

## Proposed invariants

These are future invariants, not claims that all consumers are already implemented:

1. A work item, budget, cognition envelope, proxy charter, projection cursor and realtime channel is scoped by exactly one `worldId` unless an explicit non-world account boundary is named.
2. World A's wake ordering, `worldSeq`, due work, resident action and projection cannot mutate or satisfy World B's corresponding state.
3. A ResidentId is not globally portable across worlds without an explicit world membership/lineage contract; an ActorRef must include world scope where needed.
4. Provider/global quota accounting may be globally metered, but allocation and audit must retain world and resident dimensions; global pressure cannot silently grant World A access to World B's budget.
5. Snapshot, `afterSeq`, digest and freshness cursors must reject cross-world use before any world write is attempted.

## Current evidence

Current main provides world-local Event Ledger sequence, foreign-keyed world runtime/wake rows, world-filtered driver queries, and PRE-AL-07 world-isolation integration evidence. This is strong for the current M3 v1 driver path.

## Open surfaces

M7 realtime/AOI channels, M9 identity/account mapping, M10 quota pools, M4 memory/relationship projections and M6 journals do not yet have a single formal cross-world contract. A shared Redis cache or Provider pool is not automatically a leak, but keying/authorization/observability must be proven. Status: `PARTIALLY_EVIDENCED / PENDING_FORMAL_CONTRACT`.
