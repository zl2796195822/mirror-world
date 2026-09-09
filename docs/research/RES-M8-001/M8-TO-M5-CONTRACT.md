# M8-TO-M5-CONTRACT

M5 = Agent Runtime / Intelligence LOD (research only; not implemented).

## Constitutional Boundary

```text
Resident ≠ Agent Runtime Process ≠ LLM Session
```

M8 owns world time continuity and wake-trigger infrastructure.  
M5 owns bounded cognitive operations when woken.

## Hard Rule

> LLM is **not** a prerequisite for offline continuity.

If all providers fail:

- World Time still advances
- Due activities still complete
- I0/I1 deterministic decisions still run
- Catch-up still finishes
- Structured digest still works

## Intelligence LOD vs World Execution LOD

| LOD | Meaning | Owner |
| --- | ------- | ----- |
| I0–I3 | Cognition depth | M5 |
| W0–W2 | World compute level | M8 research |

Offline bulk path should be I0/I1. Important events may escalate to I2/I3 when budget allows — never required for heartbeat.

## Wake Triggers (future)

M8/scheduler may wake cognition for:

- Need threshold
- Activity completion → re-decide
- Work boundary
- Human interaction
- Significant committed event (filtered)

M5 must not:

- Add a second resident scheduler
- Use BullMQ as world clock
- Poll full population on wall-clock intervals
- Complete MOVE/SLEEP outside Kernel
- Persist CoT into Event Ledger

## Agent Offline Crash

| Loss | World impact |
| ---- | ------------ |
| Agent process crash | None to Truth |
| LLM session loss | None to Truth |
| Provider outage | I0/I1 continues |
| Queue loss | Rebuild from durable due-work |

AgentOperation metadata (future) is operational, not World Fact.

## Replay

World Replay never re-invokes LLM.  
Agent traces are not authoritative replay inputs.

## M8 Must Not

- Call LLM as world heartbeat
- Require M5 to exist for catch-up
- Treat LLM prose as history
- Own ProviderPort / AgentOperation tables
