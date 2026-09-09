# DOWNTIME-POLICY

## Critical Distinction

| Concept | Meaning | World Time |
| ------- | ------- | ---------- |
| **Intentional World Pause** | Product/ops sets `PAUSED` | Does **not** advance (ADR-0002) |
| **Maintenance** | Controlled `MAINTENANCE` | Per policy; default no domain advance |
| **Unexpected Infrastructure Downtime** | Crash, power loss, deploy gap while intended RUNNING | **Policy-driven** — not auto-pause |

> 服务器断电不得自动改变世界设定。

If the world was intended RUNNING, infrastructure failure is not a narrative freeze unless policy says so.

## Candidate Policies

### A. `CONTINUE_ELAPSED`

World Time advances by mapped offline wall elapsed (typically 1:1).

| Dimension | Assessment |
| --------- | ---------- |
| Product experience | Strong continuity — “the world kept living” |
| Compute cost | Highest (must catch up) |
| Determinism | Good if event-jump exact |
| Realism | High for Second Human World |

### B. `FREEZE_ON_DOWNTIME`

World Time freezes for infrastructure downtime (like pause).

| Dimension | Assessment |
| --------- | ---------- |
| Product experience | Weaker; world “stopped” without user intent |
| Compute cost | Lowest |
| Determinism | Easy |
| Realism | Low for stated product vision |

### C. `CAPPED_CATCHUP`

Advance by elapsed up to a cap; remainder stays as lag or requires staged catch-up.

| Dimension | Assessment |
| --------- | ---------- |
| Product experience | Mostly continuous; lag visible after disasters |
| Compute cost | Bounded bursts |
| Determinism | Good |
| Realism | Good with honest lag UX |

### D. `SCENARIO_DEFINED`

World/scenario metadata defines downtime behavior (story events, seasonal pauses).

| Dimension | Assessment |
| --------- | ---------- |
| Product experience | Flexible |
| Compute cost | Varies |
| Determinism | Requires versioned scenario policy |
| Realism | Authorial control |

## Recommendation for 第二人类世界

**Default: `CONTINUE_ELAPSED` with operational `CAPPED_CATCHUP` horizon.**

Rationale:

1. Product principle: USER OFFLINE ≠ WORLD PAUSED.
2. Intentional PAUSE already exists and is explicit.
3. Infra downtime should not silently rewrite world rules.
4. Cap protects against multi-year one-shot catch-up cost while keeping truth exact (chunked, not fabricated).

Formal shape:

```text
DowntimePolicy = {
  mode: CONTINUE_ELAPSED | FREEZE_ON_DOWNTIME | CAPPED_CATCHUP | SCENARIO_DEFINED,
  maxImmediateCatchupWorldDuration,
  chunkWorldDuration,
  version
}
```

Not frozen in this research.

## PAUSED vs MAINTENANCE vs DOWN

| | PAUSED | MAINTENANCE | INFRA_DOWN |
| - | ------ | ----------- | ---------- |
| Intentional? | Yes | Yes | No |
| World Time | No advance | Policy (default no) | DowntimePolicy |
| User access | Restricted/read | Restricted | None while down |
| Scheduled work | Held | Held | Catch-up on recovery |
| Events | None domain | Ops-only if any | Resume commits |

## Implementation Note (current system)

Today: `PAUSED`/`MAINTENANCE` re-anchor wall clock so resume does **not** backfill. That correctly implements intentional pause.

Infra downtime while RUNNING is currently indistinguishable from “clock wasn’t synced” — M8 formal work must record last successful anchor / downtime windows if `CONTINUE_ELAPSED` needs precise accounting. Research only.

## Anti-Goals

- Do not treat every restart as pause
- Do not let wall downtime directly mutate Needs without World Time advance
- Do not fabricate “quiet hours” narrative to avoid catch-up cost
