# 14 PRE-AL-GATE Rerun Decision

## Decision

`PRE-AL-GATE_HISTORICAL_PROFILE = RETAINED`

`M3-LIFECYCLE-STORY-GATE = REQUIRED`

This is a targeted regression of the old PRE-AL contracts plus a new full
equivalent M3 gate. It is not a new PRE-AL number and is not executed by this
specification task.

## Why the old PASS remains valid

The historical artifact declares `actionScope=[MOVE,SLEEP]`,
`resourceCapability=M3_FIXTURE_READONLY`, and proves 30 residents × 43,200
World Minutes with its own manifest/digest. Adding accepted EAT/WORK/TALK
facts would not retroactively change that run. Its PASS remains valid for that
profile only.

## Required new gate

After implementation, `M3-LIFECYCLE-STORY-GATE` must run on clean PostgreSQL
with:

- the same world-time, lease/fence, due/wake, idempotency, failure isolation,
  replay, checkpoint, and world/resident isolation checks;
- action scope `MOVE,SLEEP,EAT,WORK,TALK`;
- Kernel-owned consumable resource evidence;
- work obligation/attendance evidence;
- paired TALK lock/race evidence;
- causal Need → Goal → Candidate → ActionRequest → Outcome evidence;
- full 30×30 Story Sanity hard gates.

The old PRE-AL unit and integration suites remain targeted regression inputs;
they are not sufficient to close the new gate on their own.
