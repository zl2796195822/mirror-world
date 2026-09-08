# EXP-3D-002 第三方依赖登记与审计 (Third-Party Register)

本文件记录本实验所使用的直接依赖项、版本、许可证类型及安全审计结果。所有依赖项仅在 `experiments/realistic-street-performance/` 独立作用域内使用，不污染正式产品包。

---

## 1. 运行时依赖 (Production Dependencies)

| 包名 (Package) | 版本 (Version) | 许可证 (License) | 角色与用途 | 审计状态 (Audit) |
|---|---|---|---|---|
| `@pixiv/three-vrm` | `3.5.5` | MIT | VRM 1.0 模型加载器、Humanoid 骨骼节点映射、表情系统 | 无已知漏洞 (Audit Clean) |
| `three` | `0.185.1` | MIT | WebGL 渲染引擎、场景图、PBR 材质、光照与相机系统 | 无已知漏洞 (Audit Clean) |
| `@react-three/fiber` | `9.7.0` | MIT | Three.js 的 React 19 声明式渲染层与生命周期调度 | 无已知漏洞 (Audit Clean) |
| `@react-three/drei` | `10.7.7` | MIT | R3F 辅助组件库 (Html 空间标注与视图辅助) | 无已知漏洞 (Audit Clean) |
| `@react-three/rapier` | `2.2.0` | MIT | Rapier3D 物理引擎的 R3F 封装 (刚体、碰撞体、地面检测) | 无已知漏洞 (Audit Clean) |
| `ecctrl` | `2.0.2` | MIT | 第三人称角色控制器封装 (移动速度、跳跃、浮动胶囊) | 无已知漏洞 (Audit Clean) |
| `react` | `19.2.8` | MIT | 声明式组件树与状态基础库 | 无已知漏洞 (Audit Clean) |
| `react-dom` | `19.2.8` | MIT | 浏览器 DOM 挂载入口 | 无已知漏洞 (Audit Clean) |

---

## 2. 开发与构建依赖 (Dev Dependencies)

| 包名 (Package) | 版本 (Version) | 许可证 (License) | 角色与用途 |
|---|---|---|---|
| `vite` | `8.2.2` | MIT | 独立实验本地 DevServer、模块热更与静态资源打包 |
| `@vitejs/plugin-react` | `6.1.1` | MIT | Vite 的 React JSX/TSX 转换插件 |
| `typescript` | `6.0.3` | Apache-2.0 | 静态类型检查 (`tsc --noEmit`) |
| `@types/three` | `0.163.0` | MIT | Three.js 类型声明 |
| `@types/react` | `19.2.2` | MIT | React 类型定义 |
| `@types/react-dom` | `19.2.2` | MIT | React DOM 类型定义 |
| `eslint` | `10.10.0` | MIT | 静态代码规范检查工具 |
| `@eslint/js` | `10.0.1` | MIT | ESLint 官方 JavaScript 推荐配置 |
| `@typescript-eslint/parser` | `8.70.0` | BSD-2-Clause | ESLint 的 TypeScript AST 解析器 |
| `globals` | `17.12.0` | MIT | 浏览器与 Node.js 全局变量表 |

---

## 3. 安全与合规审计证据

在 `experiments/realistic-street-performance/` 目录下执行：
```bash
pnpm audit --prod --registry=https://registry.npmjs.org
```
**审计输出**：
```text
No known vulnerabilities found
```
HIGH 严重漏洞：**0**；CRITICAL 严重漏洞：**0**。
