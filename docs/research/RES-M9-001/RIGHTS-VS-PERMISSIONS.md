# Rights vs Proxy Permissions

## Three distinct questions

| 层                | 问题                                                                         |
| ----------------- | ---------------------------------------------------------------------------- |
| Resident Rights   | 这个 Resident 在 world/institution policy 下可以做什么、拥有什么、表达什么？ |
| Control Authority | 当前哪个主体/机制可以尝试代表 resident？                                     |
| Proxy Permission  | 被授权的 delegate 在什么边界内代 resident 做什么？                           |

推荐约束：`ProxyPermission ⊆ ResidentRights`。Charter 不能给 resident 没有的权利；Resident 有权买房，也不代表 proxy 能买房。

## Admin separation

Operator/Admin 可以维护服务器、修复数据、观察运行状态，但 admin credential 不自动授予其 resident 在世界中的无限资产、越权 action 或其他居民控制权。Kernel 仍是唯一事实 commit authority。

## Native rights

Native resident 的 future rights 通过 `RightsPolicy` 处理；本研究不把 native 硬编码成无权 NPC，也不宣称其具有现实法律人格。技术模型只保留 capability slots：CanAct、CanOwn、CanCommunicate、CanDelegate、CanBeRepresented、CanControlEmbodiment。
