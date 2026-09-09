# 26 ADR Candidate Register

| Candidate | Topic                               | Why formal decision may be needed                                                    | Priority | Assessment                           |
| --------- | ----------------------------------- | ------------------------------------------------------------------------------------ | -------- | ------------------------------------ |
| ADR-X-001 | W/I/V LOD namespace separation      | M5 I-LOD conflicts with M10 and M8/M7 axes                                           | P0       | `REQUIRED`                           |
| ADR-X-002 | Resident identity classification    | Replace single `HUMAN/PROXY/NATIVE` inference with M9 orthogonal model               | P0       | `REQUIRED`                           |
| ADR-X-003 | Unified wake/due ownership          | Prevent M8/M10/M5/M6 competing schedulers; extend current PRE-AL-07 boundary         | P0       | `REQUIRED` before multi-domain wake  |
| ADR-X-004 | Projection truth boundary           | Freeze source cursor, rebuildability, client write prohibition and realtime recovery | P0       | `REQUIRED` before M7 port            |
| ADR-X-005 | Stable Place Identity vs Geometry   | Keep logical place, asset and geometry version distinct                              | P1       | `LIKELY`                             |
| ADR-X-006 | Cognition Envelope Replay           | Define recorded inputs/output, schema, retention and missing-envelope behavior       | P0       | `REQUIRED` before M8/M10 acceptance  |
| ADR-X-007 | Proxy Revocation Linearization      | Define commit boundary, takeover priority and stale revoke behavior                  | P0       | `REQUIRED` before Proxy runtime      |
| ADR-X-008 | Human Attention Budget Boundary     | Bound visual attention bonus, quota and anti-gaming across residents/worlds          | P1       | `LIKELY`                             |
| ADR-X-009 | Downtime / Catch-up Provider Policy | Decide zero-LLM catch-up, deterministic fallback, defer and integrity stop           | P0       | `REQUIRED` before offline acceptance |

## Status rule

这些是候选，不是本任务创建的正式 ADR。`REQUIRED` 仅表示若未来要实现相关跨层能力，正式决策不可缺；最终是否创建、合并或拆分由 latest main 的 Compatibility Review 决定。
