# DORMANCY-CONTRACT

## Definition

**Dormant** = resident not currently consuming continuous cognition/presentation resources.

**Dormant ≠ non-existent.**

## Dormant Resident Still Has

| Property | Source |
| -------- | ------ |
| Identity | Seed / durable identity |
| Durable state | `resident_runtime_states`, events |
| Relationships (future M4) | Projections from interactions |
| History | Event Ledger slices |
| Reconstructible Needs | Anchor + World Time + policy |
| Schedule | Work edges, activity dues |
| Ability to complete scheduled facts | Kernel completion at due time |

## Dormant Resident Does Not Need

- Active Agent Runtime process
- LLM session
- Renderer / WebSocket
- Per-second updates
- Continuous social feed

## Recovery Inputs

To resume a dormant resident correctly:

```text
World Time + durable runtime anchors + seed/profile + policy versions + relevant events
  → current Needs
  → overdue scheduled facts (catch-up completions)
  → next wake boundary
```

No “replay the LLM’s thoughts.”

## Dormancy Levels (aligned with Execution LOD)

| Level | Cognition | Facts |
| ----- | --------- | ----- |
| W0 nearby | Higher I possible | Continuous presentation, discrete facts |
| W1 background | I0/I1 | Scheduled + lazy needs |
| W2 catch-up | I0 | Event-jump completions |

## Dormant Social Interactions (high-risk future)

Question: can two dormant residents still meet, talk, change relationships?

**Product answer for 第二人类世界: eventually yes.**

M8 v1 answer: **layer, don’t boil the ocean.**

| Layer | Mechanism | Owner |
| ----- | --------- | ----- |
| L0 scheduled co-presence facts | Work/home shared schedules → location overlap boundaries | M3/M8 |
| L1 deterministic routine interactions | Rule-based TALK opportunities at boundaries | M3/M5 I0/I1 |
| L2 high-fidelity agent interactions | LLM sessions when budget/LOD allows | M5 |
| L3 relationship projection | From committed interaction facts | M4 |

M8 only requires: interaction facts can occur offline and still project later. Full social AI offline is not M8 scope.

## Contract Rules

1. Never delete dormant residents to save compute.
2. Never skip due completions because “nobody watched.”
3. Never require client connection for sleep to finish.
4. Cognition LOD may be zero; world LOD still processes due work.

## Anti-Pattern

```text
if (!userOnline) resident.exists = false;  # forbidden
```
