# 04-FIRST-STREET-VISUAL-TOPOLOGY-v0

权威级别：`VISUAL_ONLY_ADJACENCY` / `NON_AUTHORITATIVE`

正式 server topology：当前 **不可用**。  
本图只服务 presentation routing，不修改 World topology。

## 邻接图

```text
home-unit-01 ↔ home-unit-02 ↔ ... ↔ home-unit-12
     ↕ sidewalk
FIRST STREET spine
     ↕
office ↔ cafe ↔ store
     ↕
transit ↔ park
```

## 主要步行路径

1. 任意 home-unit → 人行道 → FIRST STREET → office/cafe/store
2. office/cafe/store → street → park
3. street spine → transit stop

## Crossing

- 单条主街 + 两处斑马线即可满足 V0
- 不需要复杂立交

## Entry routes

| Place        | Entry from            |
| ------------ | --------------------- |
| home-unit-\* | north sidewalk        |
| office       | south sidewalk west   |
| cafe         | south sidewalk center |
| store        | south sidewalk east   |
| park         | east plaza            |
| transit      | south curb            |

## 与 World 权威关系

| 问题                                                    | 答案 |
| ------------------------------------------------------- | ---- |
| Visual topology authoritative?                          | NO   |
| World topology modified?                                | NO   |
| Client may use visual adjacency to justify server MOVE? | NO   |
