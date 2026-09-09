# 23 Performance Evidence Contract

## Status

Existing experiment numbers are **not** formal M7 PASS evidence.

This document defines a future evidence matrix with TARGET/PROPOSED only.

## Evidence classes

| Class             | Meaning                                |
| ----------------- | -------------------------------------- |
| LAB_POC           | isolated experiment sample             |
| TARGET            | proposed goal, not measured            |
| REQUIRED_EVIDENCE | must be measured before formal M7 gate |
| UNVERIFIED        | not measured / physical device missing |

## Matrix (PROPOSED)

### Devices

- Desktop mid GPU browser (Chrome + Safari if macOS target)
- Mid-range laptop integrated GPU
- Physical mobile phone (iOS and/or Android — choose at implementation)
- Optional low-end stress device

### Metrics

| Metric                | Definition                                                  | v1 TARGET (proposed)                        | Evidence status      |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------- | -------------------- |
| FPS                   | sustained street view with 30 world residents in AOI policy | desktop ≥ 55 avg; mobile ≥ 30 avg           | UNVERIFIED           |
| Frame time P95        | presentation frame                                          | desktop < 20 ms; mobile < 33 ms             | UNVERIFIED           |
| JS heap               | after 10 min soak                                           | no unbounded growth; budget TBD             | UNVERIFIED           |
| GPU VRAM estimate     | scene budget estimator + browser tooling where possible     | under device profile budget                 | UNVERIFIED           |
| Initial load          | first interactive street                                    | desktop < 5 s; mobile < 10 s on mid network | UNVERIFIED           |
| Asset payload         | first street kit compressed                                 | budget TBD after asset lock                 | UNVERIFIED           |
| Network bandwidth     | projection stream steady state                              | 30-resident AOI case documented             | LAB_POC only         |
| Projection latency    | commit → client apply                                       | p95 target TBD (e.g. < 500 ms local)        | UNVERIFIED           |
| Reconnect time        | drop → snapshot applied                                     | target TBD (e.g. < 3 s warm)                | LAB_POC pattern only |
| Avatar count stress   | V1/V2/V3 mix                                                | remain interactive at policy max            | UNVERIFIED           |
| Realtime client scale | concurrent observers                                        | 30 first; 100 stretch                       | LAB_POC dummy only   |

## Required formal runs (future)

1. Desktop soak 30+ minutes with real projection from Kernel
2. Physical mobile thermal soak
3. Weak network / packet loss reconnect
4. Asset missing degradation
5. Realtime process restart under load
6. Client tampering security tests
7. Catch-up return UX with synthetic lag (if M8 available)

## Prohibited

- Promoting EXP FPS numbers to Gate PASS
- Filling this matrix with fabricated measurements
- Claiming mobile verified while only emulators/sim used

## Recording format for future evidence

Each measurement must include:

- commit SHA
- device model / OS / browser
- scene config (residents visible, LOD policy, asset versions)
- duration
- raw metrics file
- pass/fail vs frozen thresholds
