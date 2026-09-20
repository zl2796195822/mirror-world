# 08-FIRST-STREET-ASSET-STRATEGY

## 分类

| 类                     | 内容                                 |
| ---------------------- | ------------------------------------ |
| A Greybox primitives   | road, sidewalk, blocks, pads         |
| B Modular architecture | home units, office/cafe/store shells |
| C Environment props    | lamps, benches, bins                 |
| D Vegetation           | simple trees/bushes                  |
| E Characters           | placeholder capsule/mannequin        |
| F Animations           | idle/walk/sleep/eat/work/talk        |
| G Materials            | simple PBR placeholders              |
| UI                     | minimal overlay, world-first         |

## 来源策略

后续允许：

- Fab / Quixel
- 合法免费资产
- 自制 Blender
- 程序化资产

所有资产必须登记：

- source
- license
- commercial-use
- attribution
- version

## C2 不下载资产

只产出 acquisition plan。

## Git LFS（未来 UE repo）

LFS 候选：

- `*.uasset`
- `*.umap`
- 大体积 texture/mesh

Ignore：

- `Binaries/`
- `DerivedDataCache/`
- `Intermediate/`
- `Saved/`
- `.vs/`
- 平台临时文件

## Content 目录规划

```text
Content/MirrorWorld/
  Maps/
  Places/
  Residents/
  Materials/
  Environment/
  Animation/
  UI/
  Debug/
```
