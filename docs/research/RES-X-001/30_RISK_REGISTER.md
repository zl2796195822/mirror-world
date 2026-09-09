# 30 Risk Register

| ID     | Risk                                | Severity | Trigger                                          | Impact                                         | Mitigation direction                                 | Status |
| ------ | ----------------------------------- | -------- | ------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------- | ------ |
| R-X001 | W/I/V collapse                      | P0       | one `lod` field or dormant=I0                    | wrong cognition, execution and visual behavior | ADR-X-001 and legal matrix                           | OPEN   |
| R-X002 | Competing scheduler                 | P0       | M5/M8/M10/M6 each owns due loop                  | duplicate/missed work, replay drift            | current PRE-AL-07 one driver; formal extension owner | OPEN   |
| R-X003 | Offline live-LLM history            | P0       | catch-up invokes provider                        | nondeterministic history and replay failure    | envelope/deterministic-only rule                     | OPEN   |
| R-X004 | Proxy privilege escalation          | P0       | Proxy requests I3 without charter/quota          | identity, cost and world-action risk           | rights subset + approval + Kernel check              | OPEN   |
| R-X005 | Stale revoke commit                 | P0       | auth checked before revoke but not at commit     | unauthorized in-flight action                  | commit-linearization ADR                             | OPEN   |
| R-X006 | Projection/Avatar second truth      | P0       | x/y/z or realtime state used as location         | Kernel bypass and divergent world              | source cursor; visual transform read-only            | OPEN   |
| R-X007 | Snapshot/freshness cursor confusion | P1       | afterSeq treated as worldSeq                     | duplicate/gap/writes while stale               | separate cursor fields and write gate                | OPEN   |
| R-X008 | Attention budget farming            | P1       | user rapidly observes residents                  | global quota leakage/unfair I3 access          | bounded per resident/world bonus, negative tests     | OPEN   |
| R-X009 | Cross-world service leakage         | P1       | shared cache/Provider/quota key lacks world      | budget, identity or projection bleed           | world-scoped keys and audit                          | OPEN   |
| R-X010 | Full replay overclaim               | P0       | scheduler 30-resident test called 30×30 proof    | false acceptance and non-reproducible history  | manifest, typed reducers, full evidence gate         | OPEN   |
| R-X011 | Stale frozen references             | P1       | reviewer uses old pending status as current fact | wrong dependency decisions                     | stale register + current-main timestamp              | OPEN   |
| R-X012 | Overexposed proxy/human metadata    | P1       | M7 shows raw origin/delegation/online            | privacy and social manipulation                | M9 privacy port, filtered projection                 | OPEN   |
