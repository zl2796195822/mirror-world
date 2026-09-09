# 13 M8 Persistent World Compatibility

## Source

Primary: RES-M8-001 (`research/m8-persistent-world-offline-v1`), status READY_WITH_PENDING_CONTRACTS.

This research does **not** re-litigate M8. It freezes M7-facing constraints.

## Non-negotiables from M8

1. World exists before user enters.
2. No browser ≠ world pause.
3. Renderer/avatars optional for continuity.
4. Visual LOD ≠ World Execution LOD ≠ Intelligence LOD.
5. After offline, rebuild from Truth, not client frame replay.
6. Never present severely behind world as current.

## W0 / W1 / W2 vs Visual LOD

| World execution LOD | Meaning                                   | Visual implication                       |
| ------------------- | ----------------------------------------- | ---------------------------------------- |
| W0 ACTIVE           | full continuous-ish presentation interest | full stream / higher fidelity candidates |
| W1 BACKGROUND       | reduced compute for distant/unobserved    | may still need status; less streaming    |
| W2 DORMANT_CATCHUP  | event-jump catch-up                       | clients may be absent; on return, lag UI |

Important:

- A resident in W2 is still a real resident.
- Sleeping resident is not deleted.
- Dormant world section is not empty world.

Visual LOD (V0–V3, doc 14) is independent. A W0 resident may still render as V1 icon if far.

## Lag states to display honestly

From M8 research:

- `CURRENT`
- `MINOR_LAG`
- `CATCHING_UP`
- `SEVERELY_BEHIND`

M7 recommendation:

- include `lagState` in projection header when available
- while `CATCHING_UP`:
  - prefer read-only observation
  - disable or clearly gate interactive embodied writes (depends on M8 freshness contract)
- while `SEVERELY_BEHIND`:
  - show explicit status
  - do not fake a seamless "live" street that then jumps

## If world is catching up, what should client show?

Recommended honesty ladder:

1. Show last committed truth snapshot at known seq
2. Show lag banner / world status
3. Optionally show catch-up progress if M8 exposes it
4. When catch-up completes, apply newer snapshot
5. Never invent intermediate narrative as if user watched it live

## Freshness and user actions

M8 recommendation: interactive writes require CURRENT (or MINOR_LAG in epsilon).

M7 implication:

- "Enter cafe" / embodied MOVE intent from user should fail closed if world not fresh enough
- UI must explain, not silently queue forever in v1
- no timeline fork

## Multi-rate alignment

| Rate layer         | Owner       | Value                                                     |
| ------------------ | ----------- | --------------------------------------------------------- |
| Client render      | M7          | ~60 FPS target (not truth)                                |
| Network projection | M7 realtime | 10–20 Hz continuous transforms if any; event-driven state |
| World facts        | Kernel      | discrete commits                                          |
| Catch-up           | M8          | event-jump, not FPS                                       |

## PENDING CONTRACTS

- Exact lag thresholds
- Catch-up progress API shape
- Digest UX
- Whether street scene can render while catch-up active (read-only yes/no product decision)

Mark: `PENDING_RES_M8_001` for any threshold not frozen there.
