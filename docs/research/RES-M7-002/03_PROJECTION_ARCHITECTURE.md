# 03 Projection Architecture

Status: RESEARCH PROPOSAL (compatible with CURRENT MAIN FACTS)

## Question

Projection 是数据库 materialized view？domain projection table？event-consumer read model？snapshot generator？混合？

## Recommendation

**Hybrid PostgreSQL-first, event-consumer + snapshot generator.**

Not a second truth store. Not a formal materialized view owned by DBA ops as the product boundary. Not “whatever Colyseus has in memory.”

```text
World Truth (PG)
  worlds / world_events / resident_runtime_states /
  action_requests / kernel_action_outcomes
        │  read-only transactions / outbox-style poll or logical tail
        ▼
Projection Builder
  - folds committed events + runtime authority
  - emits ProjectionSnapshot at sourceWorldSeq
  - emits ProjectionDelta for seq ranges
        ▼
Projection Store
  - optional PG tables (projection_snapshots, projection_residents, ...)
  - rebuildable cache
  - never the only copy of truth
        ▼
Realtime Read Model
  - process memory / Colyseus room state
  - AOI indexes
  - per-client afterSeq cursors
        ▼
Client (untrusted)
        ▼
Scene Graph / Avatar / Animation
```

## Layer durability

| Layer                          | Durable?               | Losable?     | Rebuildable?              | Cache? | Write-back to truth? |
| ------------------------------ | ---------------------- | ------------ | ------------------------- | ------ | -------------------- |
| World Truth (PG Kernel)        | YES                    | NO           | N/A (source)              | N/A    | N/A                  |
| Event Ledger                   | YES                    | NO           | N/A (history)             | No     | N/A                  |
| Projection Builder             | NO                     | YES          | YES                       | N/A    | NO                   |
| Projection Store               | OPTIONAL durable cache | YES (delete) | YES from truth            | YES    | NO                   |
| Realtime Read Model            | NO                     | YES          | YES from projection/truth | YES    | NO                   |
| Client scene/avatar            | NO                     | YES          | YES via resnapshot        | YES    | NO                   |
| Derived presentation transform | NO                     | YES          | YES                       | YES    | NO                   |

## Why not pure materialized view?

- MV is great for SQL-shaped aggregates, but M7 needs:
  - ordered `afterSeq` deltas
  - AOI membership
  - movement intent presentation
  - reconnect snapshot semantics
- A pure MV cannot own websocket session lifecycle.
- Recommendation: use PG as **storage for rebuildable projection tables** if needed, but the **contract** is event-consumer + snapshot, not “SELECT from MV forever.”

## Why not realtime-only state?

- EXP-REALTIME-001 correctly forbids Colyseus as durable truth.
- If projection exists only in Colyseus memory:
  - restart recovery is harder to gate
  - AOI bugs become truth bugs
  - multi-client consistency is harder to test
- Realtime must be a **cache of projection**, not projection authority.

## Projection Builder responsibilities

1. Read `worlds.world_seq` and runtime rows.
2. Build snapshot:
   - world meta: id, status, worldTime, sourceWorldSeq
   - residents in scope: identity ref, location, activity, work obligation, stateVersion
   - movement intents derived from TRAVELING rows
3. Emit deltas on committed events / runtime updates:
   - resident enter/leave location
   - activity start/complete
   - world time ticks (throttled)
4. Never invent facts.
5. Always stamp `sourceWorldSeq`.

## Suggested projection entities (PROPOSED)

```ts
type ProjectionWorldHeader = {
  worldId: string;
  status: "RUNNING" | "PAUSED" | "MAINTENANCE";
  worldTime: string; // ISO
  sourceWorldSeq: string; // decimal
  lagState?: "CURRENT" | "MINOR_LAG" | "CATCHING_UP" | "SEVERELY_BEHIND"; // PENDING_M8
};

type ProjectionResident = {
  worldId: string;
  residentId: string;
  identityKind: "NATIVE" | "HUMAN" | "PROXY"; // currently only NATIVE proven
  locationId: string;
  locationKind: "HOME" | "OFFICE" | "CAFE" | "STORE" | "PARK" | "TRANSIT";
  activity:
    | { kind: "IDLE" }
    | {
        kind: "TRAVELING";
        activityInstanceId: string;
        sourceLocationId: string;
        targetLocationId: string;
        startedAtWorldTime: string;
        dueAtWorldTime: string;
      }
    | {
        kind: "SLEEPING";
        activityInstanceId: string;
        startedAtWorldTime: string;
        dueAtWorldTime: string;
      };
  workObligationStatus: "NO_CURRENT_OBLIGATION" | "NOT_DUE" | "DUE" | "LATE";
  stateVersion: number;
  sourceWorldSeq: string;
};

type ProjectionSnapshot = {
  header: ProjectionWorldHeader;
  residents: ProjectionResident[];
  // optional place metadata refs, not geometry
};

type ProjectionDelta = {
  worldId: string;
  fromSeqExclusive: string;
  toSeqInclusive: string;
  residentUpserts: ProjectionResident[];
  residentRemovals?: string[]; // usually empty; residents don't vanish from world
  header?: Partial<ProjectionWorldHeader>;
};
```

These are **not** CURRENT FACT schemas in main. They are contract drafts for formal M7.

## Source mapping from current main

| Projection field                  | Authority source                                 |
| --------------------------------- | ------------------------------------------------ |
| worldId/status/worldTime/worldSeq | `worlds`                                         |
| residentId                        | seed / ActorRef                                  |
| locationId/kind                   | `resident_runtime_states` + location fixture ref |
| activity                          | `resident_runtime_states`                        |
| travel target/due                 | runtime activity metadata                        |
| sourceWorldSeq                    | runtime + world header                           |
| work obligation                   | Observation obligation derivation                |
| committed history                 | `world_events` + outcomes                        |

## Event folding policy

- Fold only committed world events and committed runtime updates.
- Do not fold rejected outcomes into resident visuals except optional UI error toast for the acting client.
- `WORLD_TIME_ADVANCED` updates header; avoid broadcasting every tick to every client if frequency high — coalesce for presentation.

## AOI boundary

AOI lives in Realtime Read Model (and optionally projection index), **never** in Kernel.

If a resident is outside AOI:

- still exists in truth
- still progresses
- simply not streamed to that client

## Failure behavior

| Builder/store failure    | Truth impact | User impact                               | Recovery           |
| ------------------------ | ------------ | ----------------------------------------- | ------------------ |
| Projection builder crash | NONE         | stale/frozen scene if realtime also stale | rebuild from truth |
| Projection store wiped   | NONE         | clients resnapshot                        | rebuild            |
| Realtime wiped           | NONE         | disconnect/reconnect                      | reload snapshot    |

## Decision

M7 v1 should implement:

1. Projection contract types
2. Snapshot builder from runtime + worlds
3. Delta emission from Kernel commits / change feed
4. Realtime adapter consuming projection only
5. Optional PG projection tables as cache with rebuild job

Avoid for v1:

- New non-PG primary stores
- Cross-world global materialized truth
- Client-authoritative transforms as facts
