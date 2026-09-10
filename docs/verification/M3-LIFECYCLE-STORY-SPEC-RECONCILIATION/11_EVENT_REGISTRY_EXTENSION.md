# 11 Typed Event Registry Extension

## Registry versions

Historical `m3-domain-event-registry-v1` remains able to replay its original
events. The expanded run uses `m3-domain-event-registry-v2` and replay schema
`m3-resident-projection-v2`. The version is recorded in the manifest,
checkpoint, payload policy, and report.

## New typed events

| Event type                | Actor/target                  | Start/completion effect                                         |
| ------------------------- | ----------------------------- | --------------------------------------------------------------- |
| `RESIDENT_EAT_STARTED`    | actor / none                  | reserves and consumes Kernel-owned food units; runtime `EATING` |
| `RESIDENT_EAT_COMPLETED`  | actor / none                  | releases runtime; accepted nutrition fact                       |
| `RESIDENT_WORK_STARTED`   | actor / workplace             | runtime `WORKING`; binds shift key                              |
| `RESIDENT_WORK_COMPLETED` | actor / workplace             | attendance fact; releases runtime                               |
| `RESIDENT_TALK_STARTED`   | initiator / participant actor | both runtime rows `TALKING` with one activity instance          |
| `RESIDENT_TALK_COMPLETED` | initiator / participant actor | social-contact fact; releases both rows                         |

No `NEED_CHANGED`, `RELATIONSHIP_CHANGED`, `MEMORY_CREATED`,
`PURCHASE_COMPLETED`, `WAGE_PAID`, or new scheduler event is added by this
M3 extension.

## Payload contract

Every new payload has `schemaVersion=1`, `actionType`, `phase`,
`actionRequestId`, `activityInstanceId`, `sourceLocationId`,
`startedAtWorldTime`, `dueAtWorldTime`, `completedAtWorldTime` when completed,
`durationWorldMinutes`, and `policyVersion=m3-lifecycle-semantics-v1`.
`occurredAt` equals the start or completion World Time.

Additional fields:

- EAT: `itemId`, `quantity`; STARTED also has
  `resourceEffect={kind, beforeUnits, afterUnits, beforeVersion, afterVersion}`;
  COMPLETED has `needEffect={kind:"HUNGER_PRESSURE_RELIEF", quantity,
policyVersion:"m3-need-effects-v1", reliefPoints:55*quantity}`.
- WORK: `workplaceId`, `workObligationKey`, `shiftStartsAtWorldTime`,
  `shiftEndsAtWorldTime`; COMPLETED also has `attendanceMinutes=480`.
- TALK: `participantId` and `participantActorId`; COMPLETED also has
  `needEffect={kind:"SOCIAL_PRESSURE_RELIEF", policyVersion:"m3-need-effects-v1",
reliefPoints:35}`.

All IDs must belong to the event world. The TALK target is the participant's
ActorRef actor id; the resident projection resolves it through the seeded
world-local actor map.

## Registry rules

The registry validates exact action/phase/event combinations, policy versions,
World-Time monotonicity, request/activity identity, and action-specific fields.
Unknown event types fail closed. Event references retain the existing outcome
order and world sequence; cross-resident interleaving may leave gaps in one
resident's refs but not in the world's full replay stream.
