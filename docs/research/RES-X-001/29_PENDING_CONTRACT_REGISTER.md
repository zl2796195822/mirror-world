# 29 Deduplicated Pending Contract Register

下表将四份研究与相关 M3/M4/M5/M6 输入去重后按 owner 聚合；current main 已解决的 M3 v1 scheduler contract 不重复列为 pending，但其扩展仍保留。

| ID      | Group               | Contract                                                             | Origin research   | Affected research  | Formal owner                  | Blocking? | Current state                   |
| ------- | ------------------- | -------------------------------------------------------------------- | ----------------- | ------------------ | ----------------------------- | --------- | ------------------------------- |
| P-X-001 | M5/M7/M8/M10        | W/I/V namespace and legal combinations                               | M5, M7, M8, M10   | all four           | Compatibility/ADR             | Yes       | pending ADR                     |
| P-X-002 | M8/M10              | W2 allowed cognition and deterministic fallback                      | M8, M10           | M8, M10, replay    | M8/M10                        | Yes       | pending                         |
| P-X-003 | M10/Replay          | Cognition envelope schema, retention and missing-envelope policy     | M10               | M8, M10, M3 replay | M10/Replay                    | Yes       | pending                         |
| P-X-004 | PRE-AL-07 extension | Driver lease/fence, single active driver and lost-fence recovery     | M3-003, M8        | M3, M8, M10, Ops   | PRE-AL-GATE/Ops               | Yes       | current main deferred           |
| P-X-005 | PRE-AL-07 extension | Decision wake acknowledgement/consumption and dedupe lifecycle       | M8, M10           | M8, M10, M5        | scheduler + decision boundary | Yes       | current source is at-least-once |
| P-X-006 | M3/Replay           | Typed event registry, reducers and resident projection replay        | M3-003, PRE-AL-07 | M3, M7, M8, M10    | Kernel/M3                     | Yes       | deferred                        |
| P-X-007 | Replay/Ops          | Simulation manifest, semantic hash, full 30×30 evidence              | M3-003, M8, M10   | M3, M7, M8, M10    | Replay/Ops                    | Yes       | deferred                        |
| P-X-008 | M8/M10              | Catch-up provider failure: envelope/fallback/defer/stop              | M8, M10           | M8, M10, M5        | M8/M10/ADR                    | Yes       | conflict pending                |
| P-X-009 | M7/M8               | Snapshot, afterSeq, freshness, visible cursor and write gating       | M7, M8            | M7, M8             | M7/M8                         | Yes       | pending                         |
| P-X-010 | M8                  | Downtime/world-time accounting and return flow                       | M8                | M7, M8             | M8/Kernel                     | Yes       | pending ADR                     |
| P-X-011 | M9/M10              | CognitionAuthority to I-level mapping                                | M9, M10           | M9, M10            | M9/M10                        | Yes       | pending                         |
| P-X-012 | M9/M10              | Proxy Charter max I, budget source and approval                      | M9, M10           | M5, M9, M10        | M9/security/M10               | Yes       | pending                         |
| P-X-013 | M9/M3               | Proxy revoke/takeover linearization at commit boundary               | M9                | M3, M7, M9, M10    | M9/security/Kernel            | Yes       | pending                         |
| P-X-014 | Security/Privacy    | public/private/audit projection for origin, proxy and human presence | M7, M9            | M7, M9, M10        | M9/security                   | Yes       | pending                         |
| P-X-015 | M7/M8/M9            | Human authenticated, world interaction and presentation presence     | M7, M8, M9        | M7, M8, M9         | product/security              | No        | terminology pending             |
| P-X-016 | M7/M10              | Human attention bonus, quota, fairness and anti-gaming               | M7, M10           | M7, M8, M10        | M10/ops                       | Yes       | pending                         |
| P-X-017 | M6/M8               | Economy due item, journal atomicity and wake integration             | M6, M8            | M6, M8, M10        | M6/Kernel                     | Yes       | not formal                      |
| P-X-018 | M4/M7/M10           | Memory/relationship fact vs projection/retrieval boundary            | M4, M7, M10       | M4, M7, M10        | M4/domain                     | Yes       | not formal                      |
| P-X-019 | M7/M9               | Place identity, asset identity, geometry and embodiment versions     | M7, M9            | M7, M9             | M7/M9                         | No        | pending                         |
| P-X-020 | Ops/all             | Cross-world isolation, shared quota/cache keying and negative tests  | M7, M8, M9, M10   | all four           | Ops/each domain               | Yes       | proposed invariant              |

## Count

`20` deduplicated unresolved contract groups. Resolved current-main scheduler facts are recorded in `16_PRE_AL_07_DEPENDENCY_REGISTER.md`, not counted as open contracts.
