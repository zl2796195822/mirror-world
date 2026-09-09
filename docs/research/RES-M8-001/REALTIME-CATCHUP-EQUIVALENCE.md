# REALTIME-CATCHUP-EQUIVALENCE

## Question

World A runs realtime for 7 World Days.  
World B is offline for the corresponding span, then catch-up.  

Same genesis, policy, and deterministic inputs — must final canonical state match?

## Research Answer

**Yes, under explicit deterministic assumptions.** This should be a future M8 Gate requirement.

If not strictly equal, the research must document *why* — but the product goal is equality.

## Assumptions Required

1. Same `SimulationManifest` (seed, policies, resident fixture hash, driver ordering version)
2. Same external inputs (none, or same recorded envelopes)
3. Same World Time Policy mapping (offline elapsed → world delta)
4. S0 exact fidelity only
5. Same deterministic due ordering
6. No LLM nondeterminism in the fact path (I0/I1 only, or LLM intents recorded as inputs)
7. Same Kernel semantics versions (`m3-action-semantics-v1`, replan, needs)

## What Must Match

| Artifact | Match? |
| -------- | ------ |
| `authoritativeProjectionHash` | **Required** |
| Event semantic sequence (type/actors/times/payloads) | **Required** |
| Outcome statuses/reasons/event refs | **Required** |
| Terminal `worldSeq`, `worldTime` | **Required** |
| `derivedDecisionDigest` | Required if decision path fully deterministic |
| Wall-clock execution metadata | Not compared |
| Process/thread IDs, logs | Not compared |

Aligns with RES-M3-003 CanonicalWorldStateV1 dual-hash approach:

- `authoritativeProjectionHash` — facts
- `derivedDecisionDigest` — decisions/needs/goals

## Test Design (do not implement here)

```text
Inputs:
  same SimulationManifest
  duration = 7 World Days
  faultProfile = none

Run A:
  realtime driver (or accelerated but continuous commits)

Run B:
  freeze process after T0
  advance wall clock by 7 days (or inject offlineElapsed)
  restart → catch-up event-jump to target

Compare:
  ledgerHash, projectionHash, decisionDigest, outcome stream digest
```

Variants:

- Pause in the middle (both runs) → still equal
- Crash mid catch-up → resume → still equal
- Queue loss before catch-up → rebuild → still equal

## Known Risk Points

| Risk | Mitigation |
| ---- | ---------- |
| Ordering nondeterminism | Stable sort key |
| Wall-clock leaks into decisions | Explicit `now`; no Date.now in core |
| Needs using wall elapsed | Must use World Time only |
| LLM in loop | Exclude or record intents |
| Coarse fidelity | Forbidden v1 |
| Missing due rebuild | Wake index contract |
| Different checkpoint usage | Checkpoints must not change semantics |

## Relationship to M2 Replay

M2 Replay proves event history digest determinism.  
This equivalence is **simulation path** determinism (realtime vs catch-up).  
Both needed; they are not the same proof (RES-M3-003 taxonomy).
