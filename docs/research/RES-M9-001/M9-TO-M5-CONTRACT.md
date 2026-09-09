# M9 → M5 Contract

## M5 input envelope

Future Agent Runtime receives a bounded, world/resident-scoped context containing:

```text
residentId + ActorRef
effective control mode
delegationRef + charterVersion (when proxy)
allowed action capability summary
resident rights boundary
source world/runtime/resource fences
```

M5 may not receive private identity vault data, raw biometrics or unconstrained charter internals unless a separate purpose policy grants a redacted projection.

## M5 action flow

```text
Observation/Context → ActionIntent → M9 authority preflight
→ ActionRequest(requestedBy=PROXY, delegation ref/version)
→ Kernel authority/domain revalidation → Outcome/Event
```

The exact ActionRequest shape is pending; current M3 contract is not modified by this research.

## Hard constraints

- Agent Runtime ≠ Resident and LLM Session ≠ Resident。
- Agent cannot create, edit, extend or self-renew a Charter。
- Prompt is not permission。
- Provider output and AgentOperation are not World Facts。
- stale charter/version or missing fence fails closed。
- inference stays outside Kernel transaction；only short validation/commit enters Kernel。
- provider failure degrades to permitted deterministic fallback or stop; it does not grant broader authority。

This inherits RES-M5-002’s zero-fact-authority, bounded context, stale fencing and separate audit trace decisions。
