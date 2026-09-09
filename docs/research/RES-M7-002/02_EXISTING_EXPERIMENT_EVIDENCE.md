# 02 Existing Experiment Evidence

Classification key:

- PROVEN = experiment measured/executed successfully under stated boundary
- CONDITIONAL = usable only with explicit constraints
- UNVERIFIED = not measured or not on physical target devices
- NOT PRODUCTION = must not be treated as formal M7 gate

## Inventory

| ID               | Branch / path                               | Status                       | Relevant to M7                                      |
| ---------------- | ------------------------------------------- | ---------------------------- | --------------------------------------------------- |
| EXP-REALTIME-001 | `exp/realtime-projection-poc`               | PASS / CONDITIONAL recommend | Projection, AOI, snapshot, reconnect, realtime loss |
| EXP-3D-001       | `exp/first-street-3d`                       | completed bounded PoC        | Street placeholder, R3F/Three/Rapier/Ecctrl         |
| EXP-3D-002       | `exp/realistic-street-performance`          | PASS_WITH_BOUNDARY           | Realistic street, LOD, instancing, weather          |
| EXP-AVATAR-001   | `exp/avatar-browser-poc`                    | PASS_WITH_BOUNDARY           | VRM browser load + face drive                       |
| EXP-ASSET-001    | `exp/avatar-asset-pipeline`                 | PASS_WITH_BOUNDARY           | LOD pipeline, KTX2/Meshopt, budget gate             |
| EXP-M7-003       | `exp/m7-browser-avatar-runtime` / hardening | PASS_WITH_BOUNDARY           | Asset cache leases, policy LOD, budget estimates    |
| EXP-M7-004       | same avatar runtime branch                  | experimental                 | Browser avatar runtime extension                    |
| RES-M8-001       | `research/m8-persistent-world-offline-v1`   | READY_WITH_PENDING_CONTRACTS | Persistence, lag, catch-up, M8→M7 contract          |
| RES-M9-001       | `research/m9-digital-identity-proxy-v1`     | READY_WITH_PENDING_CONTRACTS | Identity presentation boundary                      |

## EXP-REALTIME-001 (high value)

Source: `experiments/realtime-projection-poc/{README,RESULT,DECISION,AOI-BENCHMARK,FAILURE-RECOVERY}.md`

PROVEN / CONDITIONAL:

- Colyseus as **read-only projection layer** is feasible and light for 30–100 entities.
- 30 entities @20Hz: 1 client CPU ~4.5%, heap ~21.9MB, outbound ~10.9 KB/s (lab machine).
- 100 clients lab: ~1963 msg/s, ~1.07 MB/s outbound, P95 ~4.65ms (lab machine).
- AOI spatial grid vs global broadcast: ~89.4% outbound savings in experiment setup.
- Reconnect via token + **fresh snapshot** is simpler and safer than long delta buffers.
- Server process crash: memory room state dies; rebuild from authoritative source; world truth unaffected.
- Late join = current snapshot, not history replay.
- Stale/out-of-order version guard required on client.

HARD DECISION extracted:

- Colyseus ABSOLUTELY NOT durable truth.
- Spatial grid code stays in projection layer, not Kernel.

NOT PRODUCTION:

- Lab numbers are not formal gates.
- Dummy entities, not real Kernel residents.
- No PostgreSQL-first projection store integration proven in that PoC.

## EXP-3D-001 (first street placeholder)

Source: `experiments/first-street-3d/RESULT.md`

PROVEN (bounded):

- ~300m×300m placeholder street with home/office/cafe/store/park/transit landmarks loads in desktop and 390×844 mobile viewport.
- R3F + Three.js + Rapier recommended base.
- Ecctrl usable as controller start with explicit input adapter.
- Yuka usable in PoC but **not recommended** as formal nav dependency (maintenance risk).

BOUNDARY:

- Dummy visual actors, no resident identity, no Kernel coupling.
- No long-run stability / physical mobile GPU / network jitter proof.

## EXP-3D-002 (realistic street performance)

Source: `experiments/realistic-street-performance/RESULT.md`

CONDITIONAL PROVEN:

- Realistic Qinghe street assets + PBR + day/night/rain + VRM residents + Visual LOD + instancing can hold ~60–74 FPS on tested desktop/mobile-sim.
- Visual LOD (LOD0/1/2) prevents 30 full VRM collapse.
- Hardware instancing reduces draw calls.
- Thin colliders can tunnel on frame spikes; thickened foundation needed.

BOUNDARY:

- Native high-poly VRM (~700k tris) cannot ship as 30× full fidelity.
- Physical mobile hardware still UNVERIFIED for production budgets.
- Fixed path actors, not Kernel-driven life.

## EXP-AVATAR-001

Source: `experiments/avatar-browser-poc/RESULT.md`

PROVEN (bounded):

- VRM 1.0 loads in browser via `@pixiv/three-vrm`.
- Programmatic idle/walk via humanoid bones.
- MediaPipe face landmarks can drive head/blink/mouth on local camera.
- No raw biometric persistence in that experiment.

BOUNDARY:

- No identity authorization, no Proxy Charter, no world writes.
- Face drive is presentation only.

## EXP-ASSET-001

Source: `experiments/avatar-asset-pipeline/RESULT.md`

PROVEN (bounded):

- Automated asset inspector + budget gate concepts work.
- LOD0/1/2 deterministic pipeline reduces triangles/textures dramatically.
- KTX2/Meshopt compression useful with map-type dependent policy.
- Balanced 30-avatar mix can reach 60 FPS in experiment viewer.

BOUNDARY:

- Physical mobile device UNVERIFIED.
- Not M7 production approval.
- Metric definitions must stay strict (intrinsic vs runtime triangles).

## EXP-M7-003 / hardening

Source: `docs/experiments/EXP-M7-003/RESULT.md`

PROVEN as **design candidates**:

- Asset cache keyed by `assetKey#LOD` with leases prevents cross-avatar disposal.
- Policy-driven LOD with hysteresis is preferable to hard-coded thresholds.
- Shared/clone ownership table needed for VRM materials/textures.
- Scene budget must sum visible avatar representations, not single-asset gate.

DISCARD / RE-PROVE:

- Synthetic resident instances, Node benchmark timings, old 20m/40m thresholds, 30-avatar estimates as production FPS/VRAM.
- LOD2 is a visual proxy, not a VRM semantic-preserving asset.

## RES-M8-001 (research, not experiment)

Key extracts used by M7:

- World exists without browsers.
- Lag states: CURRENT / MINOR_LAG / CATCHING_UP / SEVERELY_BEHIND.
- Interactive writes recommended only when world CURRENT (or MINOR_LAG in epsilon).
- Rebuild path: durable Truth → observation/projection → network snapshot → client render.
- Visual LOD ≠ Execution LOD.
- M7 must not own World Clock or freeze on tab hide.

## RES-M9-001 (research, not experiment)

Key extracts used by M7:

- `AuthPrincipal != DigitalIdentity != WorldResidentIdentity != ActorRef`
- Embodiment ≠ Identity
- Proxy presentation must stay honest and pending formal M9 charter
- M7 may show identity **kind labels** only as projection of existing facts; must not invent identity authority

## Evidence boundary summary

### EXPERIMENTALLY PROVEN (usable as design input)

- Read-only realtime projection can be lightweight
- AOI reduces bandwidth materially
- Snapshot+reconnect recovery pattern works
- Web 3D street placeholder and realistic street both render
- VRM avatar representation works in browser
- LOD + compression + asset cache design patterns are viable
- Realtime process can die without corrupting truth **if** it is non-durable

### UNVERIFIED / PENDING

- Formal projection from real `resident_runtime_states` through Colyseus to R3F
- Physical mobile performance matrix
- 30 Kernel-driven residents continuously visible
- Catch-up honesty UX under real M8 lag
- Projection rebuild gate from pure PostgreSQL truth
- Security under adversarial clients
- Full MOVE semantic visualization with real travel durations

### Must not promote to formal gate

Any FPS, ms, KB/s, draw-call, or VRAM number from experiments without a fresh formal evidence matrix (see doc 23).
