# 11 TALK Opportunity Matrix

Run-08 has 203 completed paired TALK actions. The source diagnostic's `19/30` counts unique initiators. A resident-level contact measure must use the union of initiators and participants: 24/30. Five residents are participant-only. Six have no observed contact.

Candidate generation, co-location snapshots, participant-busy rejections, score suppression, and bounded no-action rows were not persisted. Therefore `legal opportunity`, `candidate`, `no opportunity`, and `opportunity but no action` remain `UNAVAILABLE` for the six no-contact residents.

| Resident                               | Employed | Initiated | Participant | Contact observed | Decision                                         |
| -------------------------------------- | -------- | --------: | ----------: | ---------------- | ------------------------------------------------ |
| `49177b40-dd6c-5237-9bb8-46c1c5aa8c61` | yes      |        16 |          16 | yes              | accepted paired path                             |
| `2487e7e5-6e4d-5916-8aae-c0f76e352889` | yes      |         0 |          38 | yes              | participant-only                                 |
| `e7e4bcca-7843-5ba2-b110-a59403756e43` | yes      |         2 |           0 | yes              | accepted paired path                             |
| `a5d97bf2-f351-529d-8f8d-d7a63ad4404d` | yes      |        24 |           0 | yes              | accepted paired path                             |
| `508ffd23-ce5d-5234-a542-bb83360a004b` | yes      |         0 |           0 | no               | insufficient evidence; zero-food overlap         |
| `33a1cd64-a71c-539e-92d6-8d7fa6bce1d3` | yes      |         0 |          19 | yes              | participant-only                                 |
| `91083903-25db-5ac8-a6d6-273c6568e8f3` | yes      |         1 |           0 | yes              | accepted paired path                             |
| `5fc82ac5-57cd-5919-96c7-5c6e33a9efa6` | yes      |        16 |           0 | yes              | accepted paired path                             |
| `390f66d0-33ce-5737-9509-a90ae6ba81e8` | yes      |        25 |          10 | yes              | accepted paired path                             |
| `c7e630d4-2930-5aea-a5d9-661e541a53fd` | yes      |         2 |           0 | yes              | accepted paired path                             |
| `6a97e582-c8b4-5152-b50f-b45135bfce0f` | yes      |         0 |           0 | no               | insufficient evidence; zero-food overlap         |
| `a605e5bd-c171-52d0-ab28-b6e7efc33540` | yes      |        15 |           0 | yes              | accepted paired path                             |
| `3c0e06be-b909-58d9-8c05-891dbe0bcf36` | yes      |        16 |          24 | yes              | accepted paired path                             |
| `849cf567-2fdf-56f1-a262-4e2c5bdb7585` | yes      |        23 |           0 | yes              | accepted paired path                             |
| `62700369-80e1-5b74-93e5-7235b9b856d3` | yes      |         1 |           0 | yes              | accepted paired path                             |
| `dcb67974-fc44-517e-8b5e-09e7a4c54aad` | yes      |        16 |           0 | yes              | accepted paired path                             |
| `9a07aa36-6468-53b5-b444-804086cbf903` | yes      |         0 |           0 | no               | insufficient evidence; zero-food overlap         |
| `bdb2a3a2-7873-5314-b409-7a10cfe34250` | yes      |         1 |           0 | yes              | accepted paired path                             |
| `7bdde7d3-206d-501f-bf01-c1807b04dade` | yes      |         2 |           0 | yes              | accepted paired path                             |
| `2302ff23-6e93-56ea-a573-e5eb4fb28143` | yes      |         0 |          16 | yes              | participant-only                                 |
| `2d49951e-bb02-5ee7-b983-dc0ccff0a789` | yes      |         9 |          25 | yes              | accepted paired path                             |
| `a1001696-d8f9-5036-945b-4d8e0ec53633` | yes      |         2 |           0 | yes              | accepted paired path                             |
| `e20b7ac0-101b-5a79-9170-9766e3d383e1` | yes      |         0 |           0 | no               | insufficient evidence; zero-food overlap         |
| `247ca98f-ac49-5a24-a149-9ef21721f898` | yes      |         0 |          15 | yes              | participant-only                                 |
| `511c9af3-f08b-55b2-a2da-d9fbfbf95d47` | yes      |         1 |           0 | yes              | accepted paired path                             |
| `ddbefbb3-9aa6-5f95-81ec-8f2dc920f9fa` | yes      |        15 |           0 | yes              | accepted paired path                             |
| `764ec258-67d8-507c-ab11-ab283991c9fa` | no       |         0 |           0 | no               | insufficient evidence; no-MOVE overlap           |
| `42ebab5a-5da4-5d0e-95c1-baf6db8d8bf6` | no       |         0 |          40 | yes              | participant-only                                 |
| `53857cc8-114a-5877-af02-14da434bc1d1` | no       |         0 |           0 | no               | insufficient evidence; zero-food/no-MOVE overlap |
| `d619e1bc-e025-59b4-a103-82cb5945aec6` | no       |        16 |           0 | yes              | accepted paired path                             |

## Decision

`INSUFFICIENT_EVIDENCE` is the only supported classification for the six no-contact rows. The paired lock and legality implementation is not implicated: the TALK legality/atomicity hard gate passed. The next fix must persist the negative funnel and then inspect social decision priority; it must not force day-one TALK or alter topology without evidence.
