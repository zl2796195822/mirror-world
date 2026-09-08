# EXP-3D-002 资产登记册 (Asset Register)

本文件记录 EXP-3D-002 性能实验所使用的所有外部 3D 模型、纹理、压缩测试样件及运行时解码器。严禁任何来源不明资产、盗版游戏素材或无商用许可模型进入代码库。

---

## 1. 3D 人物模型 (VRM)

| 资产名称 | 存储路径 | 来源 (Source) | 许可证 (License) | 作者 (Author) | 用途 (Usage) | 哈希 (SHA-256) |
|---|---|---|---|---|---|---|
| `VRM1_Constraint_Twist_Sample.vrm` | `public/models/` | [pixiv/three-vrm 官方样例库](https://github.com/pixiv/three-vrm/blob/release/packages/three-vrm-animation/examples/models/VRM1_Constraint_Twist_Sample.vrm) | MIT | pixiv Inc. | 骨骼蒙皮动画、VRM 解析、1~30 人物性能与 Visual LOD 压力测试 | `12c2b97e95e700783a6a550dc0eee2d7880aeedccef9ae67bc4c5a2f0f2631a2` |

- **内嵌元数据验证**：`allowRedistribution=true`、`commercialUsage=corporation`、`avatarPermission=everyone`、`creditNotation=unnecessary`、`licenseUrl=https://vrm.dev/licenses/1.0/`。
- **隐私边界**：非真人、非生物识别样本；不包含真人面部、声音或私有扫描素材。

---

## 2. 场景与 PBR 纹理 (Textures)

| 纹理名称 | 规格 | 存储路径 | 来源 | 许可证 | 作者 | 用途 |
|---|---|---|---|---|---|---|
| `asphalt_diffuse.png` | 512×512 RGBA8 | `public/textures/` | `scripts/generate-textures.mjs` 程序化合成 | CC0 / MIT (Self-generated) | 镜界团队 | 主干道沥青路面漫反射 |
| `asphalt_normal.png` | 512×512 RGBA8 | `public/textures/` | `scripts/generate-textures.mjs` 程序化合成 | CC0 / MIT (Self-generated) | 镜界团队 | 沥青路面微观凹凸法线 |
| `sidewalk_diffuse.png` | 512×512 RGBA8 | `public/textures/` | `scripts/generate-textures.mjs` 程序化合成 | CC0 / MIT (Self-generated) | 镜界团队 | 人行道地砖与黄色导盲盲道 |
| `facade_coffee_diffuse.png` | 512×512 RGBA8 | `public/textures/` | `scripts/generate-textures.mjs` 程序化合成 | CC0 / MIT (Self-generated) | 镜界团队 | 青禾咖啡木纹外立面 |
| `facade_store_diffuse.png` | 512×512 RGBA8 | `public/textures/` | `scripts/generate-textures.mjs` 程序化合成 | CC0 / MIT (Self-generated) | 镜界团队 | 拾光便利店门头雨棚与冷柜货架 |
| `facade_residential_diffuse.png` | 512×512 RGBA8 | `public/textures/` | `scripts/generate-textures.mjs` 程序化合成 | CC0 / MIT (Self-generated) | 镜界团队 | 居民楼水泥抹灰墙与窗户 |
| `facade_office_diffuse.png` | 512×512 RGBA8 | `public/textures/` | `scripts/generate-textures.mjs` 程序化合成 | CC0 / MIT (Self-generated) | 镜界团队 | 商务办公楼玻璃幕墙 |
| `ac_unit_diffuse.png` | 256×256 RGBA8 | `public/textures/` | `scripts/generate-textures.mjs` 程序化合成 | CC0 / MIT (Self-generated) | 镜界团队 | 建筑外墙空调室外机进风栅格 |
| `rain_streak.png` | 64×64 RGBA8 | `public/textures/` | `scripts/generate-textures.mjs` 程序化合成 | CC0 / MIT (Self-generated) | 镜界团队 | 雨天降雨粒子笔刷 |
| `manhole_diffuse.png` | 256×256 RGBA8 | `public/textures/` | `scripts/generate-textures.mjs` 程序化合成 | CC0 / MIT (Self-generated) | 镜界团队 | 道路铸铁雨水井盖与检修井 |

---

## 3. 压缩与解码测试样件 (Compression Samples)

| 资产名称 | 格式与体积 | 存储路径 | 来源 | 许可证 | 作者 | 用途 |
|---|---|---|---|---|---|---|
| `2d_uastc.ktx2` | KTX2 / UASTC (2.5 KB) | `public/samples/ktx2/` | [Three.js 官方示例库](https://github.com/mrdoob/three.js/tree/master/examples/textures/ktx2) | MIT | mrdoob & Three.js authors | 评估 KTX2 UASTC 纹理转码耗时与 GPU VRAM 显存收益 |
| `2d_etc1s.ktx2` | KTX2 / ETC1S (0.96 KB) | `public/samples/ktx2/` | [Three.js 官方示例库](https://github.com/mrdoob/three.js/tree/master/examples/textures/ktx2) | MIT | mrdoob & Three.js authors | 评估 KTX2 ETC1S 极限传输压缩比与解码开销 |
| `bunny.drc` | Draco (94 KB) | `public/samples/draco/` | [Google Draco 官方数据集](https://github.com/google/draco) (`draco3d@1.5.7`) | Apache-2.0 | Google LLC / Stanford Graphics Lab | 评估 Draco 几何网格 WASM 解码耗时与压缩比 |

---

## 4. 客户端解码器运行时依赖 (Decoders)

| 组件名称 | 文件清单 | 存储路径 | 来源 | 许可证 | 作用 |
|---|---|---|---|---|---|
| Basis Universal Transcoder | `basis_transcoder.js`, `basis_transcoder.wasm` | `public/basis/` | Binomial LLC / Three.js | Apache-2.0 | 在浏览器端将 KTX2 转码为显卡原生压缩格式 (BC7 / ASTC) |
| Draco Decoder | `draco_decoder.js`, `draco_decoder.wasm`, `draco_wasm_wrapper.js` | `public/draco/` | Google LLC (`three/examples/jsm/libs/draco`) | Apache-2.0 | 在浏览器端通过 WASM 解压 Draco 压缩几何体 |

---

## 5. 合规声明

本实验未从盗版游戏、商业闭源模型库或未经授权的网盘拉取任何资产。所有资产均具备明确的开源许可证或为团队自主代码合成，具备完全的代码库再分发权限。
