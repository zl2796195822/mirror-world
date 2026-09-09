# HYBRID-WORLD-EXECUTION

## Thesis

镜界 is not:

- A pure real-time agent simulation (too expensive, not durable-first)
- A pure turn-based game (breaks presence and continuity)

It is a **hybrid**: continuous presentation for what humans see, discrete durable facts for what the world *is*.

## Six Execution Strands

### 1. Continuous Presentation

**Scope:** currently visible / interactive region only.

- Client interpolation / animation (M7)
- Network projection 10–20 Hz
- Local transform smoothing

**Not World Truth.** Rebuildable from current durable state. Absence of renderer does not pause the world.

### 2. Discrete World Facts

**Scope:** all durable mutations.

- Kernel transaction
- Event Ledger append
- Outcome commit

One activity completion = one (or N) committed events, not 60 frames of truth.

### 3. Long-term Needs (lazy World-Time derivation)

Inherited from ADR-0007 / `m3-needs-v1`:

```
Need(t) = clamp(anchored + rate × worldElapsed − relief(events), 0, 100)
```

- No per-minute Need rows
- No per-second Need events
- Threshold crossing can be computed analytically → wake boundary

### 4. Scheduled Activities

MOVE/SLEEP already carry `activityDueAtWorldTime`.

- Completion is explicit Kernel command
- Scheduler wakes at due time (PENDING_PRE_AL_07)
- Catch-up jumps directly to earliest due activity

### 5. Background Cognition (wake-reason driven)

Future M5:

- Woken by: due decision, need threshold, event of interest, human interaction
- Not a permanent per-resident process
- LLM optional; I0/I1 maintain survival loop

### 6. No Full-City Per-Second Tick

Hard recommendation: forbidden as long-term architecture.

## Execution Matrix

| Concern | Continuous | Discrete Event | Lazy Derived | Scheduled |
| ------- | ---------- | -------------- | ------------ | --------- |
| Avatar pose (visible) | ✓ | | | |
| World Time | | ✓ advance events | | |
| Location | | ✓ MOVE complete | | |
| Activity | | ✓ start/complete | | ✓ due |
| Hunger/Rest/Social | | relief events | ✓ values | threshold wake |
| Work obligation | | shift complete | obligation at t | shift edges |
| Relationship (future) | | interaction facts | projection | |
| Digest | | | read model | on return |
| Economy payroll (future) | | journal + event | balances | pay day |

## Why Hybrid Holds for M8

Re-confirmed against current foundation:

1. Needs are already lazy — catch-up can jump thresholds.
2. Activities already have due World Time — catch-up can jump completions.
3. Kernel commits are already short transactions — catch-up can chunk.
4. Replay already treats events as discrete truth — no continuous truth stream needed.
5. Presentation is already outside Kernel — offline world needs no renderer.

## Failure Mode to Avoid

Collapsing layers:

| Wrong collapse | Consequence |
| -------------- | ----------- |
| Presentation writes location | Non-deterministic truth |
| Needs tick every second into Event Ledger | Ledger explosion |
| LLM “fills” quiet hours | Fake history |
| Scheduler owns World Time | Second clock authority |

## Conclusion

Hybrid World Execution is **confirmed viable** for M8 on top of M2/M3 foundations, pending PRE-AL-07 driver semantics for due-work processing.
