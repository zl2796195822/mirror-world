# 25 Event History UX Contract

## Principle

UI reads real evidence only.

No LLM-generated explanations of non-existent events.

## User clicks resident → may show

| Panel             | Source                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Current state     | projection snapshot (location, activity, obligation)                                        |
| Recent events     | event ledger filtered by actorId (authorized)                                               |
| Timeline          | ordered committed events with worldTime + seq                                               |
| Why this happened | only structured reasons from outcomes/payloads (reasonCode, goal source if later persisted) |
| Related actors    | event target/participants when present                                                      |
| Location          | locationId resolved via place catalog                                                       |
| World time        | event.occurredAt + world header                                                             |

## Honesty rules

1. If reason is unknown, show unknown — do not invent motive.
2. Needs/Goals are not durable events yet; do not claim “because hunger 87” unless a committed evidence source exists.
3. Rejected actions are not world history; they may appear in a private “your attempts” debug panel for the actor, not as street fact.
4. Future memory/relationship explanations require M4 redaction policy (`PENDING_M4`).

## API shape (PROPOSED)

```http
GET /api/v1/worlds/:worldId/residents/:residentId/history?afterSeq=&limit=
```

Response items:

```json
{
  "seq": "912",
  "type": "RESIDENT_MOVE_COMPLETED",
  "occurredAt": "…",
  "actorId": "…",
  "targetId": "…",
  "summary": {
    "fromLocationId": "…",
    "toLocationId": "…"
  },
  "reasonCodes": []
}
```

`summary` is a deterministic projection of payload fields, not freeform AI prose.

## Privacy

- Future human-linked identity may restrict history visibility
- Mark: `PENDING_RES_M9_001`
- M7 v1 NATIVE resident public observation can be broader, still world-scoped and non-secret
