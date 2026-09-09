# M9 → M8 Contract

## Separation

M8 owns persistent-world time continuity, scheduler/catch-up and dormancy strategy. M9 owns resident identity continuity and control/delegation validity. M8 does not infer proxy permission from online/offline presence。

## Offline rule

```text
user offline
  ≠ resident deleted
  ≠ world paused
  ≠ proxy enabled
```

If a Charter permits offline routine operations, M8 may wake the bounded driver; each eventual action still carries current delegation/version and passes Kernel validation. Without a valid Charter, use permitted deterministic routine/limited inactive behavior, not an assumed proxy。

## Catch-up

M8 event-jump catch-up may commit real Kernel facts while no client is open. It must preserve world resident attribution and control audit, never fabricate LLM history, and never replay an Agent’s thoughts. Stale/revoked scheduled actions are skipped or re-observed under bounded policy.

Dormant resident keeps identity, state, relationships and history; only compute/presentation LOD changes. Human return/takeover is a control event, not a new resident creation。
