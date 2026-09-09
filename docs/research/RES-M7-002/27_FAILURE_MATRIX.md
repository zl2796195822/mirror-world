# 27 Failure Matrix

| Failure                   | User-visible state                      | Truth impact                 | Recovery                                                      | Retry policy                        |
| ------------------------- | --------------------------------------- | ---------------------------- | ------------------------------------------------------------- | ----------------------------------- |
| Projection builder crash  | updates stop; scene freezes at last seq | NONE                         | restart builder; clients snapshot if gap                      | rebuild, no truth rewrite           |
| Realtime crash            | disconnect banner                       | NONE                         | process restart + rebuild from truth                          | client reconnect backoff + snapshot |
| WebSocket gap             | missing avatars/updates                 | NONE                         | detect seq gap → resnapshot                                   | no guessing                         |
| Duplicate packet          | none if handled                         | NONE                         | drop by seq/version                                           | idempotent client apply             |
| Out-of-order packet       | possible jitter if unguarded            | NONE                         | stale version guard                                           | drop old                            |
| Stale snapshot            | wrong older scene briefly if accepted   | NONE                         | ignore if cursor newer; else accept only if seq policy allows | prefer newer snapshot               |
| Asset missing             | placeholder building/avatar             | NONE                         | fallback marker                                               | lazy retry/backoff                  |
| Avatar failed             | icon/V1 fallback                        | NONE                         | reload asset later                                            | bounded retries                     |
| Renderer crash/WebGL lost | blank canvas                            | NONE                         | reinit renderer; keep truth UI                                | reload scene package                |
| Client clock wrong        | wrong local interpolation speed maybe   | NONE                         | use server worldTime anchors                                  | resync                              |
| World catch-up            | lag banner, delayed life                | truth advancing via M8 later | wait/honest UI                                                | no write during severe lag          |
| Kernel unavailable        | actions fail; reads may stale           | cannot commit new facts      | fail-closed API; realtime stale label                         | retry with backoff                  |
| Projection rebuild        | brief resync flash                      | NONE                         | snapshot replace                                              | atomic swap                         |
| World deleted/paused      | paused/maintenance state                | authoritative status         | show status; disable writes                                   | N/A                                 |
| PG partial outage         | ready=false                             | Kernel fail-closed           | restore DB                                                    | no client-side invent               |
| Client tampering          | possibly weird local only               | NONE if server authoritative | ignore forged payloads; auth reject                           | ban/throttle later                  |
| Asset cache dispose race  | visual corruption if bug                | NONE                         | leases (EXP-M7-003 candidate)                                 | fix presentation only               |
| Thin collider tunneling   | camera/avatar fall                      | NONE                         | thick colliders (EXP-3D-002 lesson)                           | presentation physics only           |

## Priority principle

Any failure must degrade **presentation**, never invent or destroy **truth**.
