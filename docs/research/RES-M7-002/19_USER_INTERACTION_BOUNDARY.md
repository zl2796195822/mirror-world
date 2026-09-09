# 19 User Interaction Boundary

## Allowed interaction classes (product direction, not implemented)

| Interaction                           | v1 research stance                        |
| ------------------------------------- | ----------------------------------------- |
| Observe street/residents              | YES (read projection)                     |
| Click resident → profile/timeline     | YES read-only                             |
| Enter building (presentation camera)  | YES presentation-only                     |
| Embodied MOVE as user-linked resident | PENDING identity + action API + freshness |
| Talk / buy / work as user             | PENDING domain executors (M6/M9/etc.)     |

## Required pipeline

```text
User interaction
  → Intent request (authenticated, validated)
  → ActionRequest (idempotent, version-fenced)
  → World Kernel
  → KernelActionOutcome
  → Projection update
  → Scene
```

## Forbidden

- UI direct DB write
- Realtime handler mutating runtime rows
- Raycast point submitted as authoritative location
- Optimistic permanent state without outcome
- LLM fabricating action success

## Intent gateway (PROPOSED)

A narrow API boundary:

- authN/authZ
- maps UI intent to ActionRequest fields
- attaches `requestedBy` (HUMAN/PROXY/...)
- does not decide world truth

Example:

```http
POST /api/v1/worlds/:worldId/actions
{
  "actionType": "MOVE",
  "actorId": "…",
  "parameters": { "destinationId": "…" },
  "idempotencyKey": "…",
  "expectedActorVersion": 12,
  "traceId": "…"
}
```

This endpoint does **not** exist on main today. It is a formal M7/M3+ candidate.

## Observation UI vs action UI

Read models for browsing can be more available than write path.

Writes require:

- world freshness CURRENT (M8)
- actor permission
- valid preconditions
- idempotency

## Boundary with avatar

Clicking an avatar selects presentation target.

Submitting an action is a separate intent call.

Avatar hover state is not authorization.
