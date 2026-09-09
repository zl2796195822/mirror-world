# PORT-PLAN

How RES-M8-001 ports into formal work later. Research is frozen input, not a build order.

## Freeze Rule

After this package commits:

```text
FREEZE = ON
```

No silent edits. Updates require a new research revision or formal ADR superseding.

## Port Sequence

```text
1. Wait for H-prerequisites (esp. PRE-AL-07)
2. Re-read then-current main + latest M3/M4/M5/M6 research
3. Compatibility Review:
     - which research assumptions still hold
     - what PRE-AL-07 already solved
     - what broke
4. ADR(s) for formal M8:
     - World Time / downtime policy freeze
     - catch-up planner ownership
     - freshness contract
     - digest read model
     - checkpoint evolution v1
5. Formal task breakdown (TDD)
6. Implement through Kernel-only write paths
7. Gate per M8-GATE-PROPOSAL + Persistent World Alpha
```

## What Ports First (likely)

| Order | Work item | Depends on |
| ----- | --------- |------------|
| 1 | World lag/status operational model | Existing clock |
| 2 | Due-work rebuild / wake index contract | Runtime dues + PRE-AL-07 |
| 3 | Catch-up `runUntil` mode | Driver |
| 4 | Crash/queue-loss tests | 2–3 |
| 5 | Freshness reject/queue for interactive writes | 1 |
| 6 | Structured return digest | History query |
| 7 | Equivalence harness extension | RES-M3-003 harness |
| 8 | Checkpoint/ledger growth ops path | Long-run needs |

## What Does Not Port Directly

- Research names of modes (need ADR freeze)
- Unmeasured scale numbers
- S1/S2 fidelity ideas
- Multi-region / shard designs
- LLM narrative polish as core milestone

## Doc Mapping (research → future ADR topics)

| Research doc | Future ADR theme |
| ------------ | ---------------- |
| WORLD-TIME-POLICY / DOWNTIME-POLICY | Clock & downtime freeze |
| OFFLINE-CATCHUP / EVENT-JUMP | Catch-up planner |
| SCHEDULER-TRUTH-BOUNDARY / WAKE-INDEX | Recovery & due-work |
| WORLD-LAG-FRESHNESS / USER-RETURN-FLOW | Product freshness |
| OFFLINE-DIGEST | Digest read model |
| REALTIME-CATCHUP-EQUIVALENCE | Gate methodology |
| M8-FORMAL-SCOPE / GATE | Milestone charter |

## Compatibility Review Questions

1. Did PRE-AL-07 already implement due-queue? What’s the exact key?
2. Did full resident projection replay land?
3. Is EAT/WORK/TALK/BUY executor available for richer catch-up?
4. Are M4/M5/M6 still research-only?
5. Any new migrations affecting runtime/events?
6. Did product change PAUSED defaults?
