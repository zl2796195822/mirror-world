# 32 Future Compatibility Review Input

## Review precondition

本文件是未来评审的输入清单，不是 Compatibility Review 结果。评审必须以当时 latest main、正式 ADR、verification、schema 与 committed code 为 authority，并重新验证本包引用的 frozen commits。

## Required review sequence

1. Record latest main SHA, each frozen research commit and any newer formal result.
2. Reconfirm no uncommitted worktree is being treated as authority.
3. Re-run the conflict register (`X-C001`–`X-C020`) and stale register.
4. Reconcile current M3/PRE-AL-07 driver boundary with M8 catch-up and M10 cognition wake; confirm no second scheduler.
5. Decide W/I/V namespace and W2/I1/frozen-envelope semantics.
6. Decide M9 identity/control/cognition/privacy fields and Proxy revoke linearization.
7. Decide M7 snapshot/afterSeq/freshness/visible cursor and write gate.
8. Verify world-local seq, event authority, rebuildability and cross-world negative tests.
9. Confirm typed event/reducer, resident projection replay, manifest/hash and full 30×30 evidence boundaries.
10. Only after the above, create or reject ADR candidates and define a separately authorized formal task.

## Exit labels allowed

`RECONCILIATION_COMPLETE_WITH_PENDING_FORMAL_DEPENDENCIES` or `RECONCILIATION_BLOCKED`.

Not allowed from this input alone: `PASS`, `IMPLEMENTED`, `COMPATIBILITY_APPROVED`, `READY_FOR_IMPLEMENTATION`.

## Minimum evidence bundle

- formal owner matrix with consumer/forbidden-owner columns;
- W/I/V legal combination tests;
- M8 offline/catch-up and M10 envelope/provider failure matrix;
- M9 identity/proxy/security/privacy and revocation evidence;
- M7 snapshot/freshness/realtime recovery evidence;
- world isolation and second-truth negative tests;
- replay manifest, typed reducers and bounded/full simulation evidence;
- explicit report of any unverified provider, device, production or business-flow claims.
