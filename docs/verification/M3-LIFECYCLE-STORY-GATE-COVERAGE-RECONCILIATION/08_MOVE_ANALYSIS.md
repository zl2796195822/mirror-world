# 08 MOVE Analysis

## Finding

The four residents without MOVE completion are:

```text
42ebab5a-5da4-5d0e-95c1-baf6db8d8bf6
53857cc8-114a-5877-af02-14da434bc1d1
764ec258-67d8-507c-ab11-ab283991c9fa
d619e1bc-e025-59b4-a103-82cb5945aec6
```

All four are unemployed, have no workplace, and have no formal MOVE
obligation. They still complete SLEEP and, where food exists, EAT. There is no
evidence in run-08 of a required work commute, return-home obligation, or
other formal MOVE necessity for them.

Decision: `VALID_NO_ACTION_NEEDED` for these four cases. The current
every-resident MOVE predicate is not an appropriate autonomy coverage
predicate. The fix is to require a resident with a formal MOVE necessity/goal
to respond, not to add random walks or Gate-only travel.

The 26 residents with workplace obligations each have workplace and home
commute evidence. That existence check passes, but WORK timing is separately
handled in the Work review.
