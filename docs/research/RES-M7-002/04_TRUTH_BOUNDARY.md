# 04 Truth Boundary

## Single direction

```text
Truth → Projection → Realtime → Scene → Avatar → User
```

Any reverse arrow is a bug, except the **legitimate interaction path**:

```text
User interaction
  → Intent / ActionRequest
  → World Kernel
  → KernelActionOutcome
  → Projection update
```

That path never lets the browser write location/identity/economy/history directly.

## Ownership matrix

| Concept                     | Owner                    | M7 may                | M7 must not                |
| --------------------------- | ------------------------ | --------------------- | -------------------------- |
| Resident identity id        | World / seed / future M9 | display ref           | mint/alter identity        |
| Current locationId          | Kernel runtime authority | project               | set from client coords     |
| Activity lifecycle          | Kernel                   | project + animate     | invent completion          |
| World time                  | Kernel clock             | visual mapping        | advance/pause from browser |
| worldSeq / event history    | Kernel ledger            | consume afterSeq      | append/fake events         |
| Money/resources             | Kernel / future M6       | project               | mutate                     |
| Relationships/memory        | future M4                | project if authorized | own truth                  |
| Avatar asset id             | presentation profile     | bind                  | become resident identity   |
| x/y/z / navmesh / animation | presentation             | own                   | write back as world fact   |
| AOI membership              | realtime projection      | filter stream         | delete existence           |
| LOD level                   | presentation policy      | choose                | change world outcome       |

## Layer answers to “who is truth?”

| Layer                                  | Truth? | Why                                |
| -------------------------------------- | ------ | ---------------------------------- |
| PostgreSQL Kernel state + Event Ledger | YES    | durable, transactional, replayable |
| Projection store                       | NO     | rebuildable cache                  |
| Realtime room state                    | NO     | ephemeral                          |
| Client scene graph                     | NO     | untrusted                          |
| Avatar mesh/pose                       | NO     | visual body only                   |
| Browser clock                          | NO     | cannot define world time           |
| Animation timeline                     | NO     | cannot undo committed actions      |

## Concrete forbidden writes

Browser / Realtime / Avatar must not:

1. `UPDATE resident_runtime_states`
2. append `world_events`
3. advance `worlds.world_seq`
4. change `worlds.world_time`
5. create resident identity
6. change cash/inventory/relationship
7. mark event history “happened”
8. keep a long-lived conflicting location after Kernel rejects

## Allowed presentation mutations

Client/scene may locally own:

- camera
- visual transform interpolation
- animation phase
- material/emissive
- LOD mesh selection
- ambient audio bus
- temporary visual anticipation (bounded, doc 20)
- debug overlays

These are Derived Presentation State.

## Identity boundary

Current main: `identityKind: "NATIVE"` only in observation self.

M7 v1 should only display identity attributes that exist as projected facts.

If future human/proxy distinctions appear:

- label must come from projected identity fact
- Proxy presentation details are `PENDING_RES_M9_001`
- M7 must not invent Proxy Charter

## Authority checks for formal M7

Future implementation should be able to prove:

1. Deleting all projection/realtime/scene state does not change Kernel tables.
2. No code path from WebGL/avatar module imports Kernel write APIs except through a narrow Intent gateway.
3. Every user-visible world change has a committed event or runtime authority row behind it.
4. Client-supplied coordinates never appear in `current_location_id` updates.

## ADR CANDIDATE

`ADR-M7-001 Projection Truth Boundary` should freeze:

- one-way dataflow
- rebuildability
- untrusted client
- presentation state non-authority

Status: CANDIDATE only; not written to formal ADR tree by this research.
