# 36 Sources and Evidence Index

## Baseline

- `origin/main` @ `b3229aef5b820fc261443c7f6d8a50f9c3b473c6`
- Worktree: `/Users/alin/AI项目/mirror-world-m7-first-street-integration-research`
- Branch: `research/m7-first-street-integration-projection-v1`

## Mainline source files consulted

- `docs/PROJECT_STATE.md`
- `docs/adr/ADR-0002..0010` (clock, action, ledger, checkpoint, needs, outcome, MOVE/SLEEP, replan)
- `packages/db/src/schema.ts`
- `packages/db/src/resident-seed.ts`
- `packages/db/src/resident-runtime-state.ts`
- `packages/contracts/src/action-contract.ts`
- `packages/contracts/src/action-outcome-contract.ts`
- `packages/contracts/src/runtime-state-contract.ts`
- `packages/contracts/src/observation-contract.ts`
- `packages/world-kernel/src/world-clock.ts`
- `packages/world-kernel/src/world-events-store.ts`
- `packages/world-kernel/src/action-semantics.ts`
- `packages/world-kernel/src/resident-action-executor.ts`
- `packages/world-kernel/src/world-replay.ts`
- `apps/api/src/app.ts`
- `apps/web/app/world/page.tsx`

## Research inputs (sibling worktrees)

- RES-M8-001: `/Users/alin/AI项目/mirror-world-m8-persistent-world-research/docs/research/RES-M8-001/` especially `M8-TO-M7-CONTRACT.md`, `WORLD-LAG-FRESHNESS.md`, `MULTI-RATE-WORLD.md`
- RES-M9-001: `/Users/alin/AI项目/mirror-world-m9-digital-identity-proxy-v1/docs/research/RES-M9-001/README.md` and root `M9-TO-M7-CONTRACT.md` if present
- RES-M3-003: replay taxonomy on `research/m3-full-replay-30x30-gate`
- RES-M5-001/002: agent authority + `M5-TO-M7-CONTRACT.md`
- RES-M4-002: relationship projection boundary
- RES-M6-002: economy compatibility
- RES-M2-OSS-001: spatial grid/AOI reference

## Experiment inputs

- EXP-REALTIME-001: `/Users/alin/AI项目/mirror-world-realtime-poc/experiments/realtime-projection-poc/{RESULT,DECISION,AOI-BENCHMARK,FAILURE-RECOVERY}.md`
- EXP-3D-001: `/Users/alin/AI项目/mirror-world-first-street/experiments/first-street-3d/{RESULT,DECISION}.md`
- EXP-3D-002: `/Users/alin/AI项目/mirror-world-realistic-street/experiments/realistic-street-performance/{RESULT,DECISION}.md`
- EXP-AVATAR-001: `/Users/alin/AI项目/mirror-world-avatar-poc/experiments/avatar-browser-poc/{RESULT,DECISION}.md`
- EXP-ASSET-001: `/Users/alin/AI项目/mirror-world-avatar-asset-pipeline/experiments/avatar-asset-pipeline/{RESULT,DECISION}.md`
- EXP-M7-003: `/Users/alin/AI项目/mirror-world-exp-m7-browser-avatar-runtime/docs/experiments/EXP-M7-003/{RESULT,DECISION}.md` (+ hardening worktree copy)
- EXP-M7-004: `/Users/alin/AI项目/mirror-world-exp-m7-browser-avatar-runtime/docs/experiments/EXP-M7-004/output/benchmark-results.json` (no formal README/RESULT; cite carefully)

## Classification reminder

| Class                 | Use                      |
| --------------------- | ------------------------ |
| CURRENT MAIN FACT     | implementation contracts |
| EXPERIMENTALLY PROVEN | design input only        |
| RESEARCH PROPOSAL     | this package             |
| UNVERIFIED            | gaps                     |
| PENDING CONTRACT      | dependencies             |

## Citation rule

When citing numbers, always include source experiment ID and say lab/PoC-boundary. Never write them as formal M7 gates.
