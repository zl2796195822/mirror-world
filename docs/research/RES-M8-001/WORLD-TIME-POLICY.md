# WORLD-TIME-POLICY

## 1. Four Times (Never Collapse Them)

| Time | Definition | Authority |
| ---- | ---------- | --------- |
| **Wall Clock** | Real-world time | Ops / caller (`now` argument) |
| **World Time** | In-world time fact | `worlds.world_time` via World Kernel |
| **Event Time** | When a fact occurred in-world | `world_events.occurred_at` = World Time at commit |
| **Offline Elapsed Time** | Wall-clock duration while process/user absent | Measured from anchors; **not automatically World Time delta** |

### Inherited invariant (ADR-0007)

> 现实中离开 8 小时不能使居民自动饿 8 小时；只有世界时间实际推进 8 小时才会产生对应变化。

Needs, obligations, and activity completion follow **World Time**, never raw wall elapsed.

## 2. Current Formal World Clock (Baseline)

Implemented in `packages/world-kernel/src/world-clock.ts`:

- Status: `RUNNING | PAUSED | MAINTENANCE`
- Scale: `1 | 10 | 100` (development); production forced `1`
- `worldTime` + `clockAnchorAt` stored separately
- Explicit `now` input; no `Date.now()` in core
- Wall rollback: keep monotonic non-decreasing
- `PAUSED`/`MAINTENANCE`: do not advance World Time; re-anchor so resume does not backfill pause window
- Actual advances recorded as `WORLD_TIME_ADVANCED` events in Kernel transaction

## 3. Research: World Time Policy Modes

Names are **research candidates**, not frozen.

| Mode | wall : world | World advances? | User interactive writes? | Typical use |
| ---- | ------------ | --------------- | ------------------------ | ----------- |
| `REALTIME` | 1 : 1 | Yes | Yes | Production default |
| `ACCELERATED` | 1 : N (dev/test) | Yes (N×) | Dev only | Simulation tests, demos |
| `PAUSED` | — | No | Read-only / admin | Intentional world stop |
| `MAINTENANCE` | Policy-defined | Policy-defined | Restricted | Controlled ops |
| `SIMULATION_TEST` | Deterministic injected `now` | Yes, driven by harness | Harness only | Replay / 30×30 / equivalence |

### Mapping to current status values

| Current `worlds.status` | Research mode |
| ----------------------- | ------------- |
| `RUNNING` | `REALTIME` (prod) or `ACCELERATED`/`SIMULATION_TEST` (dev) |
| `PAUSED` | `PAUSED` |
| `MAINTENANCE` | `MAINTENANCE` |

M8 v1 should **not** add new status values unless Compatibility Review requires it. Policy can be expressed as:

```
WorldTimePolicy = {
  mode,
  scale,                 // effective wall:world ratio numerator
  downtimePolicy,        // see DOWNTIME-POLICY.md
  catchupHorizonCap,     // max immediate catch-up world duration
  version
}
```

## 4. Offline Elapsed → Target World Time

```
OfflineElapsedMs = max(0, wallNow - lastClockAnchorOrOfflineStart)
WorldDeltaMs     = WorldTimePolicy.map(OfflineElapsedMs, worldStatusHistory)
TargetWorldTime  = lastPersistedWorldTime + WorldDeltaMs
```

### Critical rules

1. **`OfflineElapsed` alone never mutates domain facts.** It only feeds the World Time authority through policy.
2. **PAUSED intervals contribute 0 World Delta**, even if wall clock advanced 8 hours.
3. **MAINTENANCE** follows its own policy (usually 0 or capped).
4. **Unexpected infrastructure downtime** uses `downtimePolicy`, not silent pause.
5. Target World Time is computed once per catch-up planning step, then advanced in bounded Kernel commits.

## 5. Who May Advance World Time

| Actor | May advance? |
| ----- | ------------ |
| UI / Renderer | No |
| Agent / LLM | No |
| Resident logic | No |
| World Kernel Clock entry | Yes |
| PRE-AL-07 Scheduler/Driver | Requests via Kernel only |
| M8 Catch-up Planner | Requests via Kernel only |

Hard rule: no component writes `worlds.world_time` directly.

## 6. World Time Advance Must Be an Event

Inherited from M2-T04:

Every real World Time advance appends `WORLD_TIME_ADVANCED` in the same transaction, with `occurred_at = new World Time`.

Catch-up is therefore:

1. Compute next jump boundary `T_next ≤ TargetWorldTime`
2. Advance World Time to `T_next` via Kernel (event)
3. Complete due activities / process due decisions via Kernel
4. Repeat until `persistedWorldTime ≥ TargetWorldTime`

## 7. Time Scale and Catch-Up

| Scale | Implication |
| ----- | ----------- |
| 1 (prod) | 1 real minute → 1 world minute while RUNNING |
| 10/100 (dev) | World moves faster; catch-up math still World-Time based |
| PAUSED | 0 |

Accelerated mode is **not** the same as catch-up. Catch-up is discrete event-jump after a lag; acceleration is continuous faster mapping while running.

## 8. Explicit Non-Goals

- Do not implement new clock modes in this research
- Do not change ADR-0002 production 1x gate
- Do not let wall clock directly drive Hunger/Rest/Social
- Do not invent per-user world clocks

## 9. Recommendation Summary

1. Keep three formal times; add Offline Elapsed as a **derived input**, never a domain authority.
2. Default production policy: `REALTIME` 1:1 + `CONTINUE_ELAPSED` downtime (see `DOWNTIME-POLICY.md`).
3. World Time advances only when status is RUNNING (or policy-explicit maintenance advance — not default).
4. All domain due times stay in World Time (`activityDueAtWorldTime`, need threshold times, work edges).
5. Catch-up planner consumes Target World Time; it does not own clock authority.
