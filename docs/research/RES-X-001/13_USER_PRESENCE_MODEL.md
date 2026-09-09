# 13 User Presence Model

## Three independent layers

| Layer                        | Examples                                                                    | Is World Fact?                                 | Consumer             |
| ---------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------- | -------------------- |
| Human authenticated presence | login/session, auth principal online                                        | No                                             | Auth/product         |
| World interaction presence   | entered world/street, submitted direct ActionRequest, current control grant | Only committed embodied action is a world fact | Kernel/M9/M7 gateway |
| Presentation attention       | AOI, focused resident, click, camera, tab focus, scroll                     | No by default                                  | M7/M10 policy signal |

## Vocabulary audit

| Product phrase | Safe meaning                                                              | Unsafe inference                              |
| -------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| online         | human session only unless qualified                                       | world running, proxy enabled, resident active |
| active         | qualify as human session, world execution, cognition wake or presentation | one universal status                          |
| present        | qualify as authenticated, interacting or visible                          | resident exists only while seen               |
| entered street | product navigation/read scope                                             | world time started or resident moved          |
| AOI visible    | presentation subset                                                       | existence subset or cognition entitlement     |
| takeover       | new direct control decision                                               | historical proxy facts erased                 |

## Candidate sequence

```text
authenticated human
  → reads a world
  → enters a street/AOI
  → selects a resident
  → requests direct control (M9 authority)
  → submits ActionRequest (M3/Kernel)
  → committed outcome is world fact
```

Only the final committed path creates world consequences. Login, page navigation, visibility and attention remain product/policy signals unless a future explicit event contract says otherwise. `X-C014` covers the risk that a single `online/active` field collapses these layers.
