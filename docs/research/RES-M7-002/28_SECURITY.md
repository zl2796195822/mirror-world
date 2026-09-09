# 28 Security

## Threat model stance

**Client untrusted.**

Browsers, realtime SDKs, avatar code, and user devices are attacker-controlled surfaces.

## Attacks and required controls

| Attack                      | Control                                                                          |
| --------------------------- | -------------------------------------------------------------------------------- |
| Fake location packet        | server never accepts location updates from client; only ActionRequest path       |
| Fake movement stream        | movement is presentation; ignored for truth                                      |
| Forged resident state       | projection is server→client only; signed session; no client-authoritative schema |
| Forged event                | events only from Kernel commit                                                   |
| Replay attack (action)      | idempotencyKey + fingerprint + auth; stale expectedActorVersion → CONFLICT       |
| Stale ActionRequest         | requestedAtWorldTime checks; version fence                                       |
| Asset URL abuse             | asset allowlist / same-origin / integrity hashes in manifest                     |
| Snapshot poisoning          | realtime authenticated; reject cross-world payloads                              |
| Privilege escalation via UI | intent gateway authZ; requestedBy not trusted blindly                            |
| Proxy impersonation         | pending M9; never accept client-declared proxy powers                            |

## Protocol rules

1. All write intents authenticated.
2. All truth mutations in Kernel transaction.
3. Realtime channels are read-mostly projection; write frames are intents, not state sets.
4. Validate payload schemas server-side (Zod contracts style already used in main).
5. World isolation checks on every request.
6. Rate limit action submission and reconnect storms.

## What not to do

- Trust `residentId` sent by client without auth binding
- Allow websocket "setState"
- Use predictable idempotency keys from client without server policy
- Serve arbitrary asset paths from user input
- Put secrets in avatar assets

## Gate candidates

- forged MOVE without auth rejected
- replayed ActionRequest does not double-commit
- client cannot advance worldSeq/worldTime
- cross-world resident projection rejected
- asset path traversal blocked
