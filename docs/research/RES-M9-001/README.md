# RES-M9-001

## Digital Identity, Resident Origin & Proxy Charter Architecture

状态：`RESEARCH ONLY` · `READY_WITH_PENDING_CONTRACTS` · `FREEZE = ON`

本目录是架构研究输入，不是正式 M9 实现。它没有新增代码、schema、migration、依赖、认证、代理 runtime、生物识别、摄像头或真人敏感数据。

## Baseline and isolation

- baseline：`origin/main@b3229aef5b820fc261443c7f6d8a50f9c3b473c6`
- branch：`research/m9-digital-identity-proxy-v1`
- worktree：`/Users/alin/AI项目/mirror-world-m9-digital-identity-proxy-v1`
- allowed write scope：`docs/research/RES-M9-001/`
- `PROJECT_STATE.md`、`MEMORY.md`、main、formal runtime 与 migration 未修改

## Current formal status

`M0/M1/M2 = PASS`；`M3 = IN_PROGRESS`；`PRE-AL-00..06 = PASS`；`M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE`；`PRE-AL-07`、M4、M5、M6、M7、M8、M9 formal runtime 尚未完成。

## Core decision

```text
AuthPrincipal != DigitalIdentity != WorldResidentIdentity != ActorRef
Resident != AgentRuntime != LLMSession
Embodiment != Identity
Memory/Relationship/Account != ResidentIdentity
ProxyPermission ⊆ ResidentRights
WorldAttribution != ControlAttribution
```

镜界中的“人”首先是具有持续 `ResidentIdentity` 和世界历史连续性的存在。真人通过 `DigitalIdentity` 连接居民；原生数字居民从世界内部建立居民身份；代理只是受限、可撤销、可审计的控制/认知机制。

## Decision index

| 文档                                                               | 主题                       |
| ------------------------------------------------------------------ | -------------------------- |
| [DECISION.md](./DECISION.md)                                       | 40 项问题的收敛裁决        |
| [CURRENT-IDENTITY-AUDIT.md](./CURRENT-IDENTITY-AUDIT.md)           | 当前代码与正式报告事实     |
| [IDENTITY-LAYER-MODEL.md](./IDENTITY-LAYER-MODEL.md)               | 分层模型与关系基数         |
| [PROXY-CHARTER.md](./PROXY-CHARTER.md)                             | 授权代理宪章               |
| [PROXY-PERMISSION-MODEL.md](./PROXY-PERMISSION-MODEL.md)           | 最小机器权限模型           |
| [ACTION-ATTRIBUTION.md](./ACTION-ATTRIBUTION.md)                   | 行为归属与审计             |
| [PRIVACY-DATA-CLASSIFICATION.md](./PRIVACY-DATA-CLASSIFICATION.md) | 数据分域                   |
| [M9-FORMAL-SCOPE.md](./M9-FORMAL-SCOPE.md)                         | Formal M9 最小范围与 DEFER |
| [M9-GATE-PROPOSAL.md](./M9-GATE-PROPOSAL.md)                       | 未来 Gate 提案             |
| [RESULT.md](./RESULT.md)                                           | 状态与未决条件             |

其余文档分别描述 origin、authority、cognition、revocation、continuity、embodiment、consent、M4–M8 合同、风险与 port plan。

## Evidence rule

当前事实只来自 baseline worktree 的代码、ADR、`docs/PROJECT_STATE.md` 和已存在的 verification report。兄弟 worktree 的 M4/M5/M6/M7/M8 研究只作为研究输入，不覆盖当前 main，也不代表 formal capability。

## Freeze

完成本研究后不得进入 `M9-T01`、identity migration、Proxy Runtime、biometric scan 或 camera integration。未来正式 M9 必须对当时最新 main 的 M3/M4/M5/M6/M8 contract 重新做 Compatibility Review，再走 ADR → Formal Tasks → TDD → Migration → Gate。
