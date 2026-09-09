# 24 · Port Plan

本研究完成后如何安全进入正式主线（仍不自动执行）。

## Phase 0 · Freeze

1. Research commit on `research/m10-intelligence-lod-population-scaling-v1`
2. Push branch
3. `FREEZE = ON`
4. 无声修改禁止；更新需新 revision 或 ADR

## Phase 1 · Compatibility Review（未来，独立任务）

- 对照当时 main（可能已前进）
- 确认 PRE-AL-07 / M3 / M5 / M8 / M9 状态
- 产出 compatibility notes，不改代码

## Phase 2 · Architecture ADR（未来）

建议 ADR 主题：

1. Intelligence LOD 编号与权威边界（含与 M5 I-LOD 统一）
2. Cognition Budget ownership（M10 vs M5）
3. Cognition Envelope 与 Replay 缺失语义
4. Attention bonus 边界

## Phase 3 · Formal M10 Task Breakdown（未来）

按 `20_FORMAL_M10_SCOPE_PROPOSAL.md` 的 C1–C12 拆任务；一次一个任务。

## Phase 4 · Implementation Order（建议）

```text
C1 policy contract (pure)
C2 triggers (subset)
C9 zero-LLM harness
C3/C4 budget+fairness
C5 promotion/demotion
C7 envelope
C8 replay degradation
C6 attention
C10 harness 300/1000
C11 observability
C12 gates
```

## 移植纪律

| 允许 | 禁止 |
| ---- | ---- |
| 复制研究结论到正式 ADR 草案 | 直接改 main schema |
| 引用本包路径 | cherry-pick 半成品 runtime |
| 在正式任务中重做验证 | 把 UNVERIFIED 当实测 |
| 与主线新事实重新对齐 | 静默改 FREEZE 文档 |

## 回滚

本研究分支无生产依赖；可直接弃用而不影响 main。
