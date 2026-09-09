# 01 Scope and Non-Goals

## Scope

- 对账 RES-M7-002、RES-M8-001、RES-M9-001、RES-M10-001 的冻结结论、pending contracts、source references 与跨研究术语。
- 只读核对当前 `origin/main` 的正式代码、ADR、verification 与 PROJECT_STATE；不把主 worktree 未提交内容当 authority。
- 引入 RES-M3-001、RES-M3-003、RES-M4-001、RES-M5-001、RES-M6-002 作为 older/relevant research input。
- 输出统一三轴 LOD、scheduler/wake ownership、authority classification、version namespace、failure、cross-world、port readiness 与未来 review 输入。

## Non-goals

- 不创建或修改正式 ADR、migration、schema、runtime、API、scheduler、cognition budget、Proxy Charter、Realtime 或 3D。
- 不裁决冻结研究谁“正确”，不把 recommendation 写回原研究，不以较新研究静默覆盖较旧研究。
- 不宣称 M7/M8/M9/M10 ready、implemented 或 compatibility-approved。
- 不读取 PRE-AL-07 未提交 worktree；只记录当前已提交 main 仍没有其正式事实。

## Evidence labels

`CURRENT_MAIN_FACT`、`FORMAL_ADR`、`FORMAL_VERIFICATION`、`FROZEN_RESEARCH`、`OLDER_RESEARCH`、`EXPERIMENT`、`UNVERIFIED`、`WORK_IN_PROGRESS_NOT_AUTHORITY`。

## Result vocabulary

`ALIGNED` 表示边界可同时成立；`PARTIALLY_ALIGNED` 表示方向一致但字段/阈值未定；`SEMANTIC_OVERLAP` 表示同词不同层；`OWNERSHIP_AMBIGUITY` 表示需要 owner/consumer/forbidden-owner 明确；`CONFLICT` 表示现有表述不能无条件同时实现；`PENDING_*` 表示需要后续正式输入。
