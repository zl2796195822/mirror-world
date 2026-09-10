# 21 Formal Verification Task Specification

The implementation task must be followed by a separately recorded
verification task. It must run, at minimum:

## Contract and unit checks

- strict ActionRequest and outcome compatibility;
- EAT resource compare-and-swap/idempotency;
- WORK exact boundary, obligation key, unemployed rejection;
- TALK same-world/distinct/active/co-located checks, stable participant order,
  reciprocal race and paired release;
- v2 candidate ordering and causal evidence;
- scheduler ordering, due coalescing, restart/requery, pause/maintenance;
- failure/replan budget conformance;
- event payload registry and reducer negative cases;
- full, suffix, and genesis replay equivalence.

## Integration and gate checks

- clean disposable PostgreSQL migration/seed and the current M2/PRE-AL
  regression suites;
- targeted old PRE-AL-GATE profile regression;
- full `M3-LIFECYCLE-STORY-GATE` at 30 residents × 43,200 World Minutes;
- fault profiles for stale lease, restart before wake acknowledgement,
  duplicate completion, resource exhaustion, reciprocal TALK, and poison
  resident; unaffected residents must continue;
- same-manifest repeat and different-seed digest comparison;
- cross-world/resident isolation and zero-LLM assertion;
- `pnpm install --frozen-lockfile`, lint, typecheck, test, build, official
  production audit, `git diff --check`, and CI Success.

The future report must distinguish local tests, fixture evidence, clean
database evidence, and CI. None may be described as provider, production, or
M6 Economy acceptance.
