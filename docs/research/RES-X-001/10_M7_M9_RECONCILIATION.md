# 10 M7 × M9 Reconciliation

## Projection input

M7 should consume an identity-safe, public projection rather than `AuthPrincipal`, full DigitalIdentity, Proxy Charter, private proof or raw audit. Minimum candidate fields are `worldId`, stable opaque `residentId`, public alias, `EmbodimentRef`/presentation profile, committed runtime activity and optional policy-approved attribution label.

| Item                                                 | Classification                                         | Why                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `residentId` / stable world resident reference       | `PUBLIC_PROJECTION_CANDIDATE`                          | needed to keep scene identity continuous; disclosure format still policy-owned        |
| `EmbodimentRef`, `AvatarAssetId`, visual profile     | `PUBLIC_PROJECTION_CANDIDATE`                          | presentation identity, not resident authority                                         |
| `locationId`, activity, world event outcome          | `PUBLIC_PROJECTION_CANDIDATE`                          | committed world projection, subject to AOI/privacy policy                             |
| `ResidentOrigin`                                     | `UNDEFINED` / policy candidate                         | M9 says internal provenance and configurable public disclosure; M7 must not decide    |
| `ControlAuthority`                                   | `AUDIT_ONLY` by default                                | full grants/priority/private principal are not render data                            |
| Proxy activity/“代理执行” label                      | `AUDIT_ONLY` or redacted `PUBLIC_PROJECTION_CANDIDATE` | public honesty may require a label, but exact disclosure belongs to M9/product policy |
| `delegationRef`, `charterVersion`, private principal | `PRIVATE` / `AUDIT_ONLY`                               | never sent to untrusted renderer by default                                           |
| raw auth/biometric/consent/proof                     | `PRIVATE`                                              | renderer has no need or authority                                                     |

## Proxy behavior display

M7 may display “this committed behavior was performed under an approved proxy mode” only when a future identity-safe projection explicitly supplies that redacted fact. It must not infer proxy activity from `requestedBy=PROXY`, client claims, avatar, voice or LLM use. A proxy attribution label is UI/presentation metadata; it is not a substitute for World Event Truth.

## Finding

`PARTIALLY_ALIGNED` with `OWNERSHIP_AMBIGUITY`。M7 correctly refuses to define Charter/privacy, while M9 leaves public disclosure policy configurable. Future M9 must provide a bounded projection port and M7 must consume only that port.
