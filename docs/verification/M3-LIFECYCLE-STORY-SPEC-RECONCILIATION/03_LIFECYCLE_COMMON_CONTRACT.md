# 03 Common Lifecycle Contract

## Common action contract

All five executable M3 behaviors use the existing `ActionRequest` envelope.
The request is strict, world-scoped, and rule-generated with:

```text
requestedBy = RULE
worldId = observed world
actorId = resident ActorRef actorId
requestedAtWorldTime = current observed World Time
expectedActorVersion = observed runtime stateVersion
idempotencyKey = deterministic(policy, world, resident, decisionEpoch, candidate)
traceId = deterministic request trace
```

M3 rule requests omit `TALK.message`; a free-form message is not an M3
behavior input. The existing contract shape remains the transport boundary.

## Start transaction

The Kernel start transaction must:

1. Check the simulation-driver fence when invoked by the driver.
2. Lock the world row and all actor runtime rows required by the action in a
   stable UUID-byte order.
3. Re-read the runtime, actor, location, obligation, and resource facts.
4. Validate world identity, `RUNNING`, actor status, requester permission,
   current World Time, expected version, location, action-specific facts, and
   active-activity exclusivity.
5. Apply only the action's committed start effects.
6. Append exactly one typed `*_STARTED` event with `schemaVersion=1`.
7. Persist one committed start outcome and associate the event with it.
8. Set the active runtime state and a deterministic due World Time.

The transaction is all-or-nothing. A rejected or conflicting request appends
no domain event and changes no runtime/resource fact.

## Completion transaction

The due worker must call the same Kernel completion boundary, never update a
runtime row directly. Completion must:

1. Re-check the world fence, world status, activity identity, state versions,
   and due time.
2. Re-check any completion invariant. EAT resource is reserved at start;
   WORK obligation and TALK paired occupancy remain valid through completion.
3. Append exactly one typed `*_COMPLETED` event to the existing outcome.
4. Apply completion effects: Need-relevant nutrition/social facts, work
   attendance, and runtime release.
5. Set every participating resident to `IDLE`, clear activity metadata, and
   increment each state version atomically.
6. Return the updated outcome with ordered event refs.

An already completed request is `REUSED`. A due item that is early is
`NOT_DUE`. A stale duplicate must not append a second event or increment a
state version.

## Activity exclusivity

M3 v1 has one active activity per resident. EAT, WORK, and TALK are not
interruptible. MOVE/SLEEP behavior is unchanged. A TALK occupies two
residents with one shared activity instance; no resident can be the actor or
participant of another active TALK at the same time.

The runtime extension adds `EATING`, `WORKING`, and `TALKING`, plus a nullable
`activityTargetResidentId` for paired TALK state. An EAT/WORK target resident
is null. This is a contract/schema extension under the ADR gate, not a new
runtime authority.

## Duration policy

`m3-lifecycle-semantics-v1` freezes deterministic World-Time durations:

| Action |                                                              Duration |
| ------ | --------------------------------------------------------------------: |
| EAT    |                                                      30 World Minutes |
| WORK   | from exact shift start to exact shift end, normally 480 World Minutes |
| TALK   |                                                      15 World Minutes |

No wall time, random duration, promise completion order, or unversioned magic
number is allowed. WORK cannot start after the shift start boundary; a
`LATE` obligation is not silently converted into a legal WORK start.

## Causality and outcome evidence

Every accepted start and completion must retain the request id, action type,
resident/world ids, start/due/completion World Times, policy version, and
causation/correlation association. Until the existing database contract gains
a separate causation column, the request id and event `correlationId` are the
minimum association; adding a new generic causation field is not required for
this freeze.
