# 24 Offline / Reconnect UX

## Scenarios

| Scenario                 | World                              | Client return flow                             |
| ------------------------ | ---------------------------------- | ---------------------------------------------- |
| Close browser 10 min     | continues                          | reconnect → snapshot → maybe minor visual jump |
| Close browser 7 days     | continues / catch-up policies (M8) | lag honesty + snapshot                         |
| Network blip             | continues                          | token reconnect + snapshot                     |
| Tab sleep/freeze         | continues                          | on wake, seq check → resync if gap             |
| Computer sleep           | continues                          | same                                           |
| Server restart           | truth intact                       | realtime rebuild + client snapshot             |
| World paused/maintenance | clock frozen                       | show paused status; no fake life               |

## Required UX elements

1. Connection state: connected / reconnecting / offline
2. World freshness: current / lag labels (from M8 when available)
3. Resync indicator when snapshot replaces local scene
4. Honest empty/failure states (M1 shell already teaches honesty)

## Client algorithm on return

```text
1. Load cached UI shell (optional)
2. Connect realtime/HTTP
3. Request snapshot
4. Replace scene state atomically at seq X
5. Subscribe afterSeq X
6. Resume presentation interpolation
```

Do not:

- keep animating stale avatars as if live forever
- invent events during offline gap
- silently mutate local truth

## First street product rule

**第一条街不能依赖网页一直开着.**

Street is an observation window into a persistent world, not the world process itself.

## Compatibility with M8 digest

If user was away long:

- street scene shows current committed world after catch-up
- digest/timeline can explain “what you missed” from real events
- digest is separate from realtime projection stream
