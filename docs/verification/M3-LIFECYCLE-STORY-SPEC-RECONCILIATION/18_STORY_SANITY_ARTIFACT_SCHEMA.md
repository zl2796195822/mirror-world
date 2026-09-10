# 18 Story Sanity Artifact Schema

The implementation must emit one manifest and one report bundle. The exact
storage format may be JSON files in a disposable verification directory; the
fields below are the machine contract.

```text
manifest
  manifestVersion, scenarioId, logicalWorldId, worldSeed
  initialWorldTime, durationWorldMinutes=43200, stepResolutionWorldMinutes
  residentCount=30, residentFixtureHash, initialSnapshotHash
  policyVersions, actionScope=[MOVE,SLEEP,EAT,WORK,TALK]
  resourceCapability, faultProfile, codeCommit, dbSchemaVersion
  checkpointSchemaVersion, manifestHash

runSummary
  status, worldTimeReached, worldMinutesReached, finalWorldSeq
  actionAttempts, committed, rejected, conflicts, replans, deferred
  liveProjectionHash, fullReplayProjectionHash
  suffixReplayProjectionHash, genesisRebuildProjectionHash
  deterministicDigest, repeatDeterministicDigest

perResident[]
  residentId, worldId, actorId, actionsByType
  completedByType, needExtrema, timeOverThreshold
  workObligations, causalEvidenceCount, recoveryCounters
  anomalyClasses, finalProjection

causalEvidence[]
  evidenceId, residentId, worldTime, sourceWorldSeq
  needState, selectedGoal, candidates, actionRequest
  kernelOutcome, eventRefs, nextObservation

eventSummary
  total, byType, actionRequestToEventRefs, finalWorldSeq

replaySummary
  live/full/suffix/genesis hashes, checkpoint prefix/suffix, history hashes

failureSummary
  classifications, budgets, retry/replan/defer decisions, fault injections

anomalySummary
  countsByClass, residentOccurrences, diagnostics, humanReviewNotes

checksums
  manifestHash, fixtureHash, initialSnapshotHash, historyHash
  liveProjectionHash, replayProjectionHash, storyDigest
```

The report must preserve `worldId`, `residentId`, `actionRequestId`,
`activityInstanceId`, `worldSeq`, and policy versions on every evidence link.
The report is not imported by the runtime and cannot be a source of World
Truth.
