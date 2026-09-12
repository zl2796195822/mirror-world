# 09-FIRST-STREET-REPO-STRATEGY

## 正式结论

**推荐：SEPARATE UE REPO**

| 组件                                 | 仓库                                          |
| ------------------------------------ | --------------------------------------------- |
| Web Observer + Client Projection API | Mirror World monorepo（当前 client branches） |
| UE First Street Client               | 独立 `mirror-world-client-ue`                 |

## 理由

1. Unreal binary assets（`.uasset` / `.umap`）会显著膨胀 monorepo clone
2. UE DerivedData / Intermediate / Saved 与 TS/Node CI 体系不兼容
3. Codex / agent context 会被大量二进制与 UE 噪声污染
4. Server/backend release 与 client visual release 节奏不同
5. 通过 versioned `client-projection-v0` 仍可保持契约同步

## 不推荐 monorepo `apps/client-ue` 作为正式长期方案

短期 prototype 可用 worktree，但正式 UE 轨道应独立 repo。

## 建议 UE repo 结构

```text
mirror-world-client-ue/
  Config/
  Content/MirrorWorld/
  Source/MirrorWorldClient/
  Plugins/
  Scripts/
  Docs/
```

## Contract 共享策略

禁止长期 `manual copy`。

推荐顺序：

1. 从 `@mirror/contracts` 导出 JSON Schema / OpenAPI artifact
2. UE 侧用 codegen 或 schema validation 消费
3. `client-projection-v0` 版本化 handshake
4. 未来可升级 `client-projection-v1`

C2 不实现大型生成器，只规定策略。
