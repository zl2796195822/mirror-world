# M9 Gate Proposal

这是未来 formal M9 的验收提案，不是当前通过的 Gate。

## Identity and continuity

- Auth ≠ DigitalIdentity ≠ Resident ≠ ActorRef。
- session end/account recovery does not delete resident history。
- avatar/voice/provider/model/memory/relationship/runtime changes preserve ResidentId。
- native resident has no fake human owner；internal origin cannot be forged。
- fork/clone creates new ResidentId and shared provenance only。

## Authority and action

- one user cannot silently control another resident。
- Proxy cannot exceed ResidentRights or active Charter。
- missing/expired/revoked/stale Charter version fails closed。
- Agent Runtime cannot edit or expand permissions。
- in-flight action is judged at commit linearization；already committed action is never retroactively erased。
- direct human takeover blocks new proxy cognition and handles concurrent stale operations。
- all proxy actions preserve resident world attribution plus complete control audit。

## Privacy and boundary

- auth/private/biometric/charter secrets never enter World Event Ledger。
- M4/M5/M6/M7 receive only purpose-limited projections。
- economy spending checks both account authority and charter budget。
- renderer cannot access auth, proxy secrets or private proof。
- world-scoped isolation holds for identity, controls, actor refs and actions。

## Replay and operations

- World Replay uses committed facts, not prompts/CoT/agent traces。
- identity/security history is separately auditable and does not become a second Kernel。
- revoke, expiry, duplicate, conflict, provider failure and restart are deterministic/bounded。
- no claim of formal M9 PASS until real browser/API/DB/security/privacy/CI evidence exists for the then-current implementation。
