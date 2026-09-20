# CLIENT-RISK-REGISTER

| ID    | 风险                                  | 等级 | 缓解                                       |
| ----- | ------------------------------------- | ---- | ------------------------------------------ |
| CR-01 | Client becomes second truth           | P0   | 只读 projection；server wins；禁 DB        |
| CR-02 | Projection contract premature lock-in | P1   | `client-projection-v0` 临时、可替换        |
| CR-03 | M7 future incompatibility             | P1   | `IWorldProjectionSource`；版本化 DTO       |
| CR-04 | placeId vs Transform confusion        | P1   | Visual Manifest；逻辑/视觉分离             |
| CR-05 | realtime cursor ambiguity             | P1   | 明确 lastAppliedWorldSeq + gap resnapshot  |
| CR-06 | client prediction leaking into truth  | P0   | 无上传路径；reconnect snapshot             |
| CR-07 | Web/UE state divergence               | P1   | 同 snapshot 跨端一致性测试                 |
| CR-08 | binary asset repo explosion           | P1   | UE 独立 worktree/repo + LFS 策略           |
| CR-09 | UE build complexity                   | P2   | placeholder 资产；不做 AAA                 |
| CR-10 | macOS/Windows asset compatibility     | P2   | 固定引擎版本与内容规范                     |
| CR-11 | 提前实现未来能力伪造后端              | P0   | disabled/placeholder only                  |
| CR-12 | Observer 成 God Mode                  | P0   | 默认只读；admin 后移                       |
| CR-13 | 把 research 当 production authority   | P0   | M7/realtime/first-street 仅 research input |
| CR-14 | M3 未关闭却合入 production client     | P0   | 当前 implementation authorized = NO        |

## 当前最关键风险

1. 把临时 Client Projection 误当正式 M7。
2. 在 M3 未 PASS 时开始主线实现。
3. 客户端本地行为污染世界语义。
