# 06-RESIDENT-VISUAL-ENTITY-SPEC-v0

## ResidentVisualEntity

```ts
type ResidentVisualEntityV0 = {
  residentId: string;
  displayName?: string;
  currentPlaceId: string;
  currentActivity:
    | "IDLE"
    | "TRAVELING"
    | "SLEEPING"
    | "EATING"
    | "WORKING"
    | "TALKING"
    | "UNKNOWN_ACTIVITY";
  targetPlaceId?: string | null;
  participantId?: string | null;
  activityInstanceId?: string | null;
  startedAtWorldTime?: string | null;
  dueAtWorldTime?: string | null;
  lastProjectionSeq: string;
  visualState: string; // idle / walk / sleep / eat / work / talk / debug
};
```

禁止写入 authoritative hunger / resource / employment truth。

## ResidentVisualRegistry

- `residentId → MirrorResidentActor`
- C2 仅 spec，不接 server spawn
- C3 Greybox 使用 mock `client-projection-v0` snapshot

## Placeholder Resident

- capsule / simple mannequin
- 30 人可区分
- 不用 MetaHuman

## Visual Identity V0

允许 presentation-only variation：

- 颜色
- 简单 outfit variant
- 谨慎 height scale

不可升级为正式 Identity。

## Stable Anchor Selection

同一 snapshot 尽量稳定选 visual anchor：

```text
anchorIndex = hash(residentId + placeId) % place.residentAnchors.length
```

只影响表现，不写回服务器。

## Activity Visual Mapping

| Activity         | Visual               |
| ---------------- | -------------------- |
| IDLE             | idle                 |
| TRAVELING        | walking              |
| SLEEPING         | sleep pose           |
| EATING           | eat anim             |
| WORKING          | work anim            |
| TALKING          | paired social + icon |
| UNKNOWN_ACTIVITY | debug pose + warning |

## TALK 备注

C1.1 TALK = `NOT_OBSERVED`。C2 只规划 paired anchors，不声称 3D runtime 已验证 TALK。
