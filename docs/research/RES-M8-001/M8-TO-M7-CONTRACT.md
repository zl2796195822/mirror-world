# M8-TO-M7-CONTRACT

M7 = 3D renderer / presentation (experimental; not world truth).

## Decoupling Principle

> 无人打开网页，世界照样持续。

Renderer may be completely absent. Realtime projection rebuilds from current Truth.

## Layers

| Layer | Rate | Truth? | Owner |
| ----- | ---- | ------ |-------|
| Three.js / avatar / Colyseus client | 60 FPS / net 10–20 Hz | No | M7 |
| World Facts | Discrete commits | Yes | Kernel |
| Catch-up | Event-jump | Yes when committed | M8 |

## M8 Must Not

- Require Three.js / avatar assets for continuity
- Write presentation pose into world facts
- Pause world when zero WebSockets
- Use visual LOD as execution LOD

## M7 Must Not

- Mutate location/activity without ActionRequest
- Own World Clock
- Assume world freezes when tab hidden

## Rebuild Path

After offline catch-up:

```text
durable Truth → observation/projection → network snapshot → client render
```

No need to replay client frames.

## Visual LOD vs World Execution LOD

Correlated (visible → often W0) but independent. Background residents still complete sleep.

## Human Presence

| Signal | World Fact? |
| ------ |-------------|
| Tab focused | No |
| Scroll | No |
| Embodied MOVE submitted | Yes (via Kernel) |
