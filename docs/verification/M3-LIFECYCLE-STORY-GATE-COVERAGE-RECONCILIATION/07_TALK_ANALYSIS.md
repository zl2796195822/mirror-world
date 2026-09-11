# 07 TALK Analysis

## Finding

The source report's `19/30` is initiator coverage, not paired-contact resident
coverage. A TALK request has one initiator and one participant; the participant
must be included when asking whether a resident experienced a legal contact.

Run-08 contains 203 completed TALK actions, 19 unique initiators, and 24 unique
residents in the union of initiator and participant references. Five residents
are participant-only. Six residents have no observed contact at all:

```text
508ffd23-ce5d-5234-a542-bb83360a004b
53857cc8-114a-5877-af02-14da434bc1d1
6a97e582-c8b4-5152-b50f-b45135bfce0f
764ec258-67d8-507c-ab11-ab283991c9fa
9a07aa36-6468-53b5-b444-804086cbf903
e20b7ac0-101b-5a79-9170-9766e3d383e1
```

## What is proven

- Every observed TALK completion has a paired participant reference.
- Same-world, distinct, co-located, paired-lock and atomic completion checks
  passed in the Gate.
- TALK action count and paired completion evidence are deterministic and
  replay-equivalent.
- There is no evidence of a paired-lock implementation failure.

## What is not proven

The Gate harness persists causal rows for accepted actions only. It does not
persist every decision wake's co-location set, legal participant set, candidate
generation, score suppression, busy-participant rejection, or bounded no-action
reason. Consequently, for the six no-contact residents we cannot distinguish
`no opportunity` from `opportunity but no selection` from the run-08 bundle.

This is `INSUFFICIENT_EVIDENCE`, not permission to call the six cases valid and
not evidence for a topology change. The next verifier must preserve negative
funnel rows and then review social decision priority. A day-one forced TALK
script is prohibited.

See [11_TALK_OPPORTUNITY_MATRIX.md](./11_TALK_OPPORTUNITY_MATRIX.md).
