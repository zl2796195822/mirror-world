# CLIENT-C1.1 REAL-LIFECYCLE OBSERVER VERIFICATION

Status: `PASS_WITH_PARTIAL_LIFECYCLE_COVERAGE` / `CLIENT BRANCH ONLY`

## 1. Baseline

| Field                    | Value                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------- |
| origin/main              | `b7745336e00a6636fb8a53a23b1dfe75e214a0ea`                                         |
| Client starting SHA      | `b7745336e00a6636fb8a53a23b1dfe75e214a0ea` (uncommitted C0/C1 work in worktree)    |
| Client final SHA         | `b7745336e00a6636fb8a53a23b1dfe75e214a0ea` + uncommitted C1.1 verification changes |
| Branch                   | `task/client-v0-observer`                                                          |
| Worktree                 | `/Users/alin/AI项目/mirror-world-client-v0`                                        |
| M3 status                | `IN_PROGRESS` (unchanged)                                                          |
| Projection contract      | `client-projection-v0`                                                             |
| Schema changed?          | NO                                                                                 |
| Kernel changed?          | NO                                                                                 |
| World semantics changed? | NO                                                                                 |
| Main merge executed?     | NO                                                                                 |
| Main merge allowed?      | NO until M3 PASS                                                                   |

## 2. Environment

| Field       | Value                                                                                |
| ----------- | ------------------------------------------------------------------------------------ |
| Node.js     | `v24.11.1`                                                                           |
| pnpm        | `9.15.4`                                                                             |
| PostgreSQL  | `18.6` disposable container `mirror-c11-smoke` on `55433`                            |
| Driver path | formal `@mirror/db` + `@mirror/life-engine` + `@mirror/world-kernel` production path |

## 3. World run

| Field                              | Value                                                          |
| ---------------------------------- | -------------------------------------------------------------- |
| worldId                            | `ae8bd0ce-c3bb-40e7-a60c-17287878804f`                         |
| seed                               | `mirror-client-c1-1-real-lifecycle-v1`                         |
| Resident count                     | 30                                                             |
| Place count                        | 17                                                             |
| Horizon                            | 3 World Days (`2026-09-07T00:00:00Z` → `2026-09-10T00:00:00Z`) |
| Start World Time                   | `2026-09-07T00:00:00.000Z`                                     |
| Final World Time                   | `2026-09-10T00:00:00.000Z`                                     |
| Final worldSeq                     | `284`                                                          |
| Event count                        | `284`                                                          |
| Unique event ids                   | `284`                                                          |
| Duplicate event ids                | `0`                                                            |
| Event ordering strictly increasing | `true`                                                         |

## 4. Snapshot captures

| Snapshot  | World Time             | worldSeq | Activity distribution |
| --------- | ---------------------- | -------- | --------------------- |
| A         | `2026-09-07T00:00:00Z` | 0        | IDLE 30               |
| B         | `2026-09-07T06:00:00Z` | 24       | SLEEPING 12, IDLE 18  |
| C         | `2026-09-07T14:00:00Z` | 125      | WORKING 7, IDLE 23    |
| D (extra) | `2026-09-08T02:00:00Z` | 156      | IDLE 30               |

Consistency:

- worldId stable across snapshots
- worldTime advances
- worldSeq monotonic
- resident count stable at 30
- place identities stable at 17
- activity changes match formal runtime state
- no invented unknown places (`residentsWithUnknownPlace = 0`)

## 5. Action evidence table

| Action | Observed?             | Started | Completed | Total events | Example resident                       |
| ------ | --------------------- | ------- | --------- | ------------ | -------------------------------------- |
| MOVE   | YES                   | 26      | 26        | 52           | `3370a3bf-c0bb-54b4-82d6-ddb67faf2455` |
| SLEEP  | YES                   | 12      | 12        | 24           | `0c8e28ed-a7d0-5431-95c6-50d7e511e899` |
| EAT    | YES                   | 6       | 6         | 12           | `2bbd936d-ef84-51d6-996d-cbe45fd17b2c` |
| WORK   | YES                   | 25      | 25        | 50           | `3370a3bf-c0bb-54b4-82d6-ddb67faf2455` |
| TALK   | **NO / NOT_OBSERVED** | 0       | 0         | 0            | —                                      |

TALK note:

- Bounded maximum horizon = 3 World Days.
- Policy was **not** modified to force TALK.
- This matches known Story Gate social-starvation class behavior, not a Client Projection fabrication issue.
- `REAL_LIFECYCLE_COVERAGE = PARTIAL`

WORK evidence includes commute MOVE → workplace → exact WORK start (`09:00`) → WORKING → completion (`17:00`). Observer does not treat MOVE-to-work as WORKING.

## 6. API results

| Check                       | Result                                                |
| --------------------------- | ----------------------------------------------------- |
| contract handshake          | PASS (`client-projection-v0`, `realtime=unavailable`) |
| snapshot                    | PASS (30 residents / 17 places / RUNNING)             |
| events world-level query    | PASS (284 events)                                     |
| events pagination           | PASS (`afterSeq` cursor, strictly increasing)         |
| events resident filter      | PASS                                                  |
| resident detail consistency | PASS (matches snapshot for selected resident)         |
| unknown resident            | FAIL-CLOSED (`WORLD_NOT_FOUND`)                       |
| no fabricated state         | PASS                                                  |

## 7. Web results

Browser verification via system Chrome (Playwright channel `chrome`).

| Route        | Result                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------ |
| `/world`     | PASS — LIVE, World Date `2026-09-10`, 30 residents, place distribution, recent real events |
| `/residents` | PASS — live table with place/activity/target                                               |
| `/events`    | PASS — real Event Ledger projection, read-only                                             |

Screenshots:

- `docs/verification/screenshots/CLIENT-C1.1/world.png`
- `docs/verification/screenshots/CLIENT-C1.1/residents.png`
- `docs/verification/screenshots/CLIENT-C1.1/events.png`
- `docs/verification/screenshots/CLIENT-C1.1/world-stale.png` (same as live due to SSR fetch note below)

## 8. STALE / RECONNECTING / refresh

| Check                                   | Result                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------- |
| STALE/RECONNECTING when API unreachable | PASS via unit test `loadClientObserverBundle` (connection=`RECONNECTING`) |
| Authoritative refresh after recovery    | PASS (browser reload returns LIVE snapshot from server)                   |
| Fabricated client state count           | `0`                                                                       |

Limitation:

- Next.js pages fetch projection **server-side**, so Playwright `page.route` abort does not simulate API outage for SSR.
- Unreachable-API behavior is covered by `apps/web/scripts/client-c1-1-projection-unit.test.mjs`.

## 9. Performance observations (not a gate)

| Metric                      | Value                     |
| --------------------------- | ------------------------- |
| Snapshot payload            | ~15.7 KB                  |
| Events payload (`limit=50`) | ~24.0 KB                  |
| Local snapshot latency      | 4–31 ms                   |
| Local events latency        | 4–24 ms                   |
| Lifecycle harness elapsed   | ~4–5 s for 2–3 world days |

## 10. Automated tests

| Suite                                                 | Result   |
| ----------------------------------------------------- | -------- |
| Workspace unit tests (`pnpm test`)                    | PASS     |
| C1.1 integration (`client-c1-1.integration.test.mjs`) | PASS 7/7 |
| Projection unit tests                                 | PASS 4/4 |
| typecheck                                             | PASS     |
| lint                                                  | PASS     |
| build                                                 | PASS     |

## 11. Causal evidence

`CAUSAL_VIEW_PENDING_CLIENT_API`

- Structured causal chain UI/API is not yet part of `client-projection-v0`.
- Basic event sequence evidence is available via Event Feed (`STARTED`/`COMPLETED` pairs).
- Did not expose internal DB or invent causal fields.

## 12. Known limitations

1. TALK not naturally observed within 3-day horizon (`PARTIAL` coverage).
2. SSR stale simulation limited; covered by unit test instead.
3. Formal causal evidence API not implemented.
4. Replay Viewer out of scope for C1.1.
5. Worktree intentionally not merged to main.

## 13. Final client state

| Item             | Status                                                                   |
| ---------------- | ------------------------------------------------------------------------ |
| C0               | `IMPLEMENTED / VERIFIED`                                                 |
| C1               | `IMPLEMENTED / REAL-LIFECYCLE-VERIFIED`                                  |
| C2               | `NOT_STARTED`                                                            |
| MAIN INTEGRATION | `WAITING_FOR_M3_PASS`                                                    |
| NEXT_CLIENT_TASK | `CLIENT-C2 FIRST STREET STATIC 3D DESIGN & PROJECT SCAFFOLD PREPARATION` |

## 14. Artifact paths

- Summary JSON: `docs/verification/artifacts/CLIENT-C1.1/real-lifecycle-summary.json`
- Harness: `apps/api/scripts/client-c1-1-lifecycle-harness.mjs`
- Runner: `apps/api/scripts/client-c1-1-run.mjs`
- Integration: `apps/api/scripts/client-c1-1.integration.test.mjs`
- Browser verify: `apps/web/scripts/client-c1-1-browser-verify.mjs`
- Projection unit tests: `apps/web/scripts/client-c1-1-projection-unit.test.mjs`
