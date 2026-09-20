# 03-FIRST-STREET-SPATIAL-SPEC-v0

## 空间理念

小、紧凑、可观察。让 30 名居民的逻辑活动在同一街区视觉尺度下可读。

## Presentation Scale（非 Truth）

| 项                 | 建议值         |
| ------------------ | -------------- |
| 街区长度           | ~180 m         |
| 道路宽度           | 12 m           |
| 人行道宽度         | 3 m / 侧       |
| 住宅单元 footprint | 12 m × 14 m    |
| 商业建筑 footprint | 24 m × 18 m    |
| 公园               | 40 m × 30 m    |
| 坐标单位           | UE centimeters |

## Logical Distance vs Visual Distance

Server 决定 MOVE start / completion / duration。  
Client 只在视觉路径上插值，不得用 UE meters 重算正式 MOVE duration。

## 布局

- 街道沿 +X（东）
- 北侧：12 个住宅单元（home-unit-01..12）
- 南侧：office / cafe / store
- 东端：park
- 街边：transit stop

```
NORTH  [H01][H02]...[H12]
         |||||||||||||
       =================  FIRST STREET (X axis)
         ||   ||   ||
SOUTH  [OFFICE][CAFE][STORE]     [PARK]
                              [TRANSIT]
```

## 坐标约定

- Origin：街道西端中心 `(0,0,0)`
- +X east
- +Y south
- +Z up
- 详细坐标见 `first-street-place-mapping-v0.json`

## Observer Camera

- Free Fly：WASD + mouse look + zoom
- Place focus（future）
- Resident follow（future）

C2 不实现 Player Character。

## Resident Routing（future）

- NavMesh 只决定视觉路径
- Server duration 仍权威
- Route length 与 World Time 不一致时，按时间插值并对齐终点

## 扩展方向

未来向 +X 东侧扩街区 / 新 district，不改 place identity 模型。
