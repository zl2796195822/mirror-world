# 06 TALK Formal Specification

## Purpose and scope

M3 TALK proves a legal, structured, deterministic social contact. It is not a
conversation system. The action has one initiator and one participant; the
participant is a stable resident reference, not free-form content.

## Request and participant model

The existing single-actor `ActionRequest` remains the transport shape:

```text
actorId = initiator ActorRef
actionType = TALK
parameters.participantId = target resident's ActorRef actorId
message = omitted in M3
```

The request is valid only when both actor and participant exist, are active,
belong to the same world, are different residents, share the same current
location, and are both `IDLE`. Participant lookup is world-scoped and never
uses a resident from another world.

## Atomic paired lock

At START the Kernel locks both runtime rows in ascending UUID-byte order,
re-reads both versions, validates both residents, and commits both rows to
`TALKING` with the same activity instance id and due time. The initiator row
stores the participant id; the participant row stores the initiator id. A
simultaneous B→A request therefore fails its second row check with a bounded
conflict/reobserve, and cannot create two contacts.

This paired occupancy is required for correctness. It is the subject of the
TALK runtime-lock ADR gate; the recommended design is not replaced with an
unlocked best-effort check.

## Lifecycle

```text
TALK ActionRequest(participantId)
 -> RESIDENT_TALK_STARTED + both residents TALKING + due = start + 15m
 -> one canonical ACTIVITY_COMPLETION due item
 -> RESIDENT_TALK_COMPLETED + social contact fact + both IDLE
```

The scheduler deduplicates the two runtime due rows by shared
`activityInstanceId`; the canonical item is owned by the initiator request.
Completion locks both rows again and releases them atomically. A participant
cannot run another action while paired TALK is active.

## Need effect and exclusions

`RESIDENT_TALK_COMPLETED` is the only M3 social effect. Under
`m3-need-effects-v1`, it contributes `35` pressure points of
`SocialPressure` relief to the initiator and participant, with each resident's
anchor advanced at the completion World Time. No relationship score,
familiarity, trust, conflict, memory, transcript, summary, or LLM output is
created.

## Failure handling

| Failure                                          | Result                                     | Recovery                                  |
| ------------------------------------------------ | ------------------------------------------ | ----------------------------------------- |
| self, missing, inactive, cross-world participant | rejected                                   | terminal invalid candidate; no retry loop |
| different location or busy participant           | rejected/conflict                          | reobserve or bounded defer                |
| simultaneous reciprocal request                  | one wins stable order; other gets conflict | two conflict recoveries maximum           |
| duplicate request                                | `REUSED`                                   | no second lock/contact                    |
| completion before due                            | `NOT_DUE`                                  | retain due item                           |

M3 has no normal participant disappearance transition. A Kernel actor cannot
be deactivated or moved out of a paired TALK without first resolving the
active action. Corrupt/stale completion is a terminal integrity failure and
must not leave a half-locked pair; the transaction rolls back and emits no
partial completion.
