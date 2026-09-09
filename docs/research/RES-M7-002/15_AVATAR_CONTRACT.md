# 15 Avatar Contract

## Positioning

Avatar is **visual body**, not resident identity.

```text
ResidentIdentity (truth)
   │ reference only
   ▼
AvatarInstance (presentation)
   owns mesh, materials, animation state, LOD, cache leases
```

## Minimum formal contract (PROPOSED)

```ts
type AvatarPresentationProfile = {
  residentId: string; // identity reference (truth id)
  avatarAssetId: string; // asset package id
  appearanceVersion: string; // visual version, not identity version
  defaultLod?: "V1" | "V2" | "V3";
};

type AvatarInstanceInput = {
  profile: AvatarPresentationProfile;
  activityHint:
    | { kind: "IDLE" }
    | { kind: "WALK"; progress?: number }
    | { kind: "SLEEP" }
    | { kind: "TALK" }
    | { kind: "WORK" }; // presentation hints only
  visualTransform?: {
    position: [number, number, number];
    rotationY: number;
  };
  sourceWorldSeq: string;
};
```

## Relationship fields

| Field               | Authority            | Notes                                       |
| ------------------- | -------------------- | ------------------------------------------- |
| `residentId`        | World                | stable                                      |
| `avatarAssetId`     | Presentation catalog | replaceable                                 |
| `appearanceVersion` | Asset pipeline       | bump on visual change                       |
| `animationState`    | Presentation         | derived from activity hint + local blending |
| `visualTransform`   | Presentation         | never written to Kernel                     |

## What avatar consumes

- resident identity reference
- presentation profile
- pose/action hints
- LOD policy
- shared asset cache

## What avatar must not own

- auth session
- digital identity proof
- proxy charter
- true location
- event history
- money
- memory/relationship truth

## VRM boundary

From EXP-AVATAR-001 / EXP-ASSET-001 / EXP-M7-003:

- VRM is a replaceable web representation format
- three-vrm is a renderer provider
- LOD2 may be a non-VRM visual proxy
- semantic preservation gate needed when transforming VRM assets
- face drive (MediaPipe) is optional local presentation experiment, not M7 v1 requirement

## Identity presentation

Current main only proves NATIVE residents.

If future HUMAN/PROXY labels appear:

- source must be projected identity fact
- details `PENDING_RES_M9_001`
- renderer never creates identity by asset choice

## Failure handling

| Failure              | Behavior                                                      |
| -------------------- | ------------------------------------------------------------- |
| avatar asset missing | fall back to V1 marker; keep resident visible in UI list      |
| animation fail       | freeze last valid pose / idle                                 |
| VRM parse fail       | proxy mesh; log; never delete resident                        |
| cache dispose race   | leases prevent cross-instance disposal (EXP-M7-003 candidate) |

## Gate

- swapping avatar asset does not change residentId or history
- asset failure still leaves world/projection correct
- no avatar code path writes runtime location
