# 01 Baseline and Authority

## Git baseline

| Field                                | Result                                                          |
| ------------------------------------ | --------------------------------------------------------------- |
| `CURRENT_ORIGIN_MAIN`                | `590d19d000fc04723028556e267cdbed362b4da8`                      |
| Review `HEAD`                        | `590d19d000fc04723028556e267cdbed362b4da8`                      |
| Branch                               | `review/m3-story-gate-coverage`                                 |
| Worktree                             | `/Users/alin/AI项目/mirror-world-m3-story-gate-coverage-review` |
| Worktree at review start             | clean                                                           |
| `HEAD == origin/main`                | yes                                                             |
| Gate source worktree                 | `/Users/alin/AI项目/镜界`                                       |
| Gate source worktree at review start | had uncommitted run-08 report/script/artifacts; not modified    |

`git fetch origin` was executed before this review. The review is anchored to
the fetched `origin/main`, not to the older baseline mentioned by planning
documents.

## Authority order

1. latest `origin/main`;
2. Accepted ADR-0011 and ADR-0012;
3. frozen lifecycle/story specification;
4. registered Gate and T05 task definitions;
5. `docs/PROJECT_STATE.md`;
6. run-08 formal verification report and artifacts;
7. production source, only to explain causal execution;
8. older planning/research, only as context.

## Evidence custody

The historical failed run is not regenerated or renamed. Source files were
read from the sibling Gate worktree and SHA-256 checked:

| Source                          | SHA-256                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `manifest.json`                 | `8c7758e9d90c654594f79370ecf500699c98413789315e2e3ec58d6b81248c62` |
| `run-summary.json`              | `ca5ffaa7d36bdcec9c9c6e06f5dc55c41c8476daa2f089a7acd911c90`        |
| `hard-gates.json`               | `91c22597295cb76d309e00f063b6e57b3bb5971ccc4f6774c01be02a5f26e254` |
| `diagnostics.json`              | `f40e5c9e75e8f4e0bb1307f32c6d14e6cdef8be8910200659c7b9aec3833c12d` |
| `action-statistics.json`        | `b5e363a904e8d7da8dd92320d31bfbda7286876300843dd1e0eb2be00cb430ac` |
| `resident-summary.json`         | `4f68aeeaf993e655e777d9e95bc144f170add7ea55f486012c6bb674c21928b4` |
| `causal-evidence.json`          | `0c8b5ec98d9ea37e09a0fdfa3de352a6d44e3d7ced6d9c7d74391ca4bd94df4f` |
| `failure-recovery-summary.json` | `2dbf95585eeef62e5d264c0e11eb592333b7b8456fbbcf1d048c538c7c6d6ce5` |
| `replay-summary.json`           | `084f31ba6142bf73b310f7ca3d5b38de32d0fbf3c7a04da604dc8efc55b46c1b` |
| `determinism-comparison.json`   | `b67ebda26d395fee74ea90b87850d0d308d51c67b943e5f0c5d02de831c37367` |
| `checksums.json`                | `e86307af0f5f57aa95d71b3328e2765530895e49489d0f67c191e1779f57102a` |
| `event-summary.json`            | `b5e09416eb6387ddbd68fe3b3557247db8cf640be73db8ed0bc013a07e5b9baf` |
| Gate report                     | `ed51a919a9a262ac299e0cf4b364449581c3987eb7fae47965be522dab2a8faf` |

The run manifest hash is
`af1b1f0aa120a1c66e777a6ec23686f63317a8cf0b1c66ca9aff8cf2952963c2`.
The compact review JSON files are analysis artifacts, not World Truth and not
replacement Gate evidence.

## Scope stop

No production code, schema, migration, fixture, test, ADR, frozen spec,
`PROJECT_STATE`, `MEMORY`, database state, Gate script, or run-08 file is
changed by this review.
