# First Street UE Greybox — Design Extraction Prompt

来源：`docs/client/first-street/`（C2 冻结设计）  
用途：驱动 C3 UE 灰盒表现，**不是 World Truth**。

## 一句话提示词（制作指令）

> 在 UE5 中构建一条 **~180m 东西向 First Street** 灰盒：北侧 12 个 12×14m 住宅单元，南侧 office/cafe/store 三栋 24×18m 商业体块，东端 40×30m 公园与街边 transit 站；道路 12m、人行道 3m/侧、两处斑马线；近未来现实主义，干净克制，低干扰；30 个占位居民按 mock projection 落在 place anchor 上；UI 仅 MOCK 观察 HUD。

## 空间提示词（严格坐标）

```
轴：+X 东，+Y 南，+Z 上；单位 cm
街道脊：X 轴，约 -20m ~ +180m
道路：宽 12m，沿 X
人行道：宽 3m，Y=±7.5m（道路边）
北侧住宅：12 × (12m×14m×8m)，Y=+25m，X 间距 12m，起点 X=-16m
南侧商业：office X=20m / cafe X=60m / store X=100m，Y=-28m，footprint 24m×18m
公园：X=160m，Y=0，40m×30m 绿色地垫
Transit：X=130m，Y=-8m，小型站体
斑马线：X≈40m 与 X≈80m，横跨道路
```

## 视觉气质提示词

```
Near-future realism
clean restrained street
light tech, human life
not cyberpunk metropolis, not MMORPG hub
greybox masses with place-type colors:
  HOME warm beige
  OFFICE cool blue-grey
  CAFE warm orange
  STORE green
  PARK green pad
  TRANSIT yellow accent
  ROAD dark asphalt
  GROUND mid grey
```

## 居民提示词

```
30 placeholder cylinders (~1.8m)
deterministic color from residentId
stable anchor = hash(residentId|placeId)
activity shown as debug text only
no MetaHuman, no dialogue
```

## 相机提示词

```
Observer free-fly camera (not player resident)
default overview: elevated 3/4 view along street spine
see both residential north row and commercial south blocks
```

## 非目标

Player body、realtime、full interiors、high-fidelity art、M7 realtime service。
