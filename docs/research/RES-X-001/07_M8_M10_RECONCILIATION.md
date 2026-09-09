# 07 M8 × M10 Reconciliation

## Overall result

`PARTIALLY_ALIGNED` with `PENDING_CONTRACT` for new cognition during catch-up.

| Question                                                          | Finding                                                                                                                                                                                                                                                   | Classification      |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| W2 allows I2/I3?                                                  | No for new provider cognition. W2 has no presentation and should use I0; deterministic I1 fallback is unresolved because M8 says I0 while M10 says I0/I1. Existing I2/I3 may be consumed only from recorded frozen envelope.                              | `PENDING_CONTRACT`  |
| Past high-cognition boundary + provider unavailable               | Do not stop world. First use deterministic I0/I1 path if policy makes it semantically valid; otherwise defer to a bounded World-Time wake. Resident STOP is poison/permanent-failure isolation, not provider-default; world STOP is only integrity-fatal. | `PARTIALLY_ALIGNED` |
| Historical I2/I3                                                  | M10 requires/recommends frozen output envelope for decision replay; M8 requires recorded external inputs and no live API. The envelope schema, retention and missing-envelope behavior remain formal pending.                                             | `PARTIALLY_ALIGNED` |
| M8 “LLM not needed” vs M10 “catch-up may meet cognition boundary” | No contradiction if “meet” means apply an existing envelope or choose deterministic fallback, never create new LLM history. Without that guard the two statements conflict.                                                                               | `CONFLICT / C3`     |

## Recommended future state (not a formal decision)

```text
W2 catch-up boundary
  ├─ committed I2/I3 envelope exists → replay recorded structured result
  ├─ no envelope + deterministic path allowed → I0 (and possibly bounded I1)
  ├─ no envelope + deterministic path not allowed → World-Time DEFER
  └─ integrity failure → stop this world and preserve facts
```

Provider availability must not determine whether the world exists. M10 degradation `I3 → I2 → I1 → I0 → DEFER → STOP` needs M8 to define which branches are allowed in W2 and which are resident-only.

## Affected contracts

`m3-replan-v1` supplies bounded directives and no world writes; it does not persist a defer wake. M8 `WAKE-INDEX.md` explicitly leaves that gap open. M10 `P-M10-004`, `P-M10-011`, `P-M10-012` remain pending.
