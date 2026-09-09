# 08 World Time → Visual Time

## Authority

World Time is owned by Kernel clock (`worlds.world_time`, `clock_anchor_at`, status, timeScale).

Production scale is 1. Browser cannot advance it.

## Projection needs

Client should receive:

- `worldTime` (ISO)
- `worldStatus`
- `sourceWorldSeq`
- optionally `timeScale` (dev only usefulness)

Client may interpolate **displayed** clock slightly between updates for smoothness, but:

- must not invent days
- must not persist interpolated time as fact
- must correct immediately when authoritative updates arrive

## Visual mappings (presentation only)

| World Time signal                                       | Presentation effect                                       |
| ------------------------------------------------------- | --------------------------------------------------------- |
| hour of day                                             | sun/moon lighting, sky                                    |
| store schedule derived from world time + place metadata | open/closed sign                                          |
| weather (future, if ever a world fact)                  | rain/fog materials                                        |
| traffic/crowd density                                   | only if derived from real resident presence/AOI, not fake |
| ambient audio                                           | day/night cafe street beds                                |

### Store open/closed

Careful:

- If open/closed is **presentation heuristic** from worldTime + static place hours, label as presentation.
- If economy later needs real store state, that becomes Kernel/M6 fact, not M7.
- Do not let a neon sign imply a purchase is possible when Kernel would reject.

## Pause / tab hidden / disconnect

| Client condition       | World Time                           |
| ---------------------- | ------------------------------------ |
| tab hidden             | continues                            |
| laptop sleep           | continues                            |
| websocket drop         | continues                            |
| browser process killed | continues                            |
| user returns           | world may be far ahead (M8 catch-up) |

M7 must never pause the world because rendering stopped.

## Dev time controls

Main has development-only clock control API. Formal M7 v1 should:

- not expose raw production time mutation in UI
- if a debug panel exists, gate it development-only and clearly marked non-world-authority for users

## Coalescing

`WORLD_TIME_ADVANCED` can be frequent depending on driver.

Projection policy (PROPOSED):

- update local displayed time continuously from last anchor + elapsed × scale when status RUNNING
- authoritative snapshots correct drift
- do not emit one realtime packet per world second to every client if unnecessary
- lighting updates can throttle (e.g. 1 Hz visual) while facts remain discrete

## Honesty

If world is `CATCHING_UP` / `SEVERELY_BEHIND` (M8 concepts):

- do not animate a fake fast-forward that pretends the user watched the whole past
- show lag state
- render the committed worldTime after catch-up

See doc 13.
