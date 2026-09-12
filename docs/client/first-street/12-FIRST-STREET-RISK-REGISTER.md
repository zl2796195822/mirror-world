# 12-FIRST-STREET-RISK-REGISTER

| ID    | 风险                                          | 等级 | 缓解                                           |
| ----- | --------------------------------------------- | ---- | ---------------------------------------------- |
| FS-01 | 3D becomes second truth                       | P0   | placeId authority + non-authoritative manifest |
| FS-02 | Place mapping drift                           | P1   | placeKey + validator 17/17                     |
| FS-03 | 17-place mapping incomplete                   | P0   | machine-readable JSON + validator              |
| FS-04 | Visual topology conflicts with world topology | P1   | mark VISUAL_ONLY; no world write               |
| FS-05 | UE repo explosion                             | P1   | separate UE repo + LFS                         |
| FS-06 | Binary asset growth                           | P1   | modular greybox first                          |
| FS-07 | Git LFS misuse                                | P1   | explicit LFS patterns + ignores                |
| FS-08 | Projection contract premature lock            | P1   | keep v0 replaceable                            |
| FS-09 | macOS UE performance                          | P2   | greybox budget, 30 residents                   |
| FS-10 | Apple Silicon compatibility                   | P2   | target UE 5.x native macOS                     |
| FS-11 | Future M7 changes                             | P1   | IWorldProjectionSource abstraction             |
| FS-12 | Resident anchor instability                   | P2   | deterministic hash selection                   |
| FS-13 | Visual route vs World duration mismatch       | P1   | interpolate by world time, server wins         |
| FS-14 | UE Editor/project created in C2               | P0   | hard non-goal this task                        |

## Critical

- FS-01
- FS-03
- FS-14
