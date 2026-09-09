# USER-RETURN-FLOW

## Goal

User reconnects after minutes or weeks and enters a world that **already lived**, then sees what matters — without waiting 20 minutes for on-login simulation of the past.

## Flow

```text
User reconnects
        ↓
World already CURRENT
   or catch-up completes / completes soon
        ↓
Load Resident current state (Kernel/Observation)
        ↓
Query since lastSeen (product cursor)
        ↓
Structured return digest
        ↓
Enter current world
```

## Catch-up Timing Strategy

| Strategy | Description | M8 v1 |
| -------- | ----------- | ----- |
| **Background catch-up** | World catches up continuously while user was away (process running) | Preferred when infra is up |
| **On-demand final catch-up** | Small residual jump when user arrives | Yes |
| **Login-triggered full 30-day sim** | User waits for entire history | **Forbidden** |

If process was down 30 days:

1. Boot recovery starts catch-up immediately (`WORLD-BOOT-RECOVERY.md`)
2. User may see `CATCHING_UP` / `DEGRADED` honestly
3. When lag clears (or hits MINOR_LAG), interactive entry proceeds
4. Digest uses committed events only

## Minimal Return UX (product research)

1. World status badge (current / catching up)
2. “What happened while I was away” digest
3. Resident personal state summary (location, activity, needs bands)
4. Enter street / interact (when freshness allows)

## Product Session State vs World Facts

| State | Storage | World Event? |
| ----- | ------- |--------------|
| `lastSeenAt` / digest cursor | Product/user state | **No** |
| Embodied resident actions | Kernel | Yes |
| “User opened app” | Session log | No |

Do not emit `USER_VIEWED_WORLD` into Event Ledger.

## Multiple Users

Each user has their own digest cursor. World Time is shared. One user’s return does not pause or fork the world for others.

## Failure Paths

| Failure | UX |
| ------- | -- |
| Digest unavailable | Enter world with empty digest + retry later |
| World SEVERELY_BEHIND | Explain lag; allow read-only or queue |
| World PAUSED | Show paused state; no fake catch-up |

## Non-Goals

- Global newspaper system in v1
- Real-time multiplayer presence as truth
- LLM story generation of the offline period as history
