import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COVERAGE_CONTRACT_VERSION,
  CoverageV2Collector,
  evaluateCoverageV2,
} from "./m3-story-gate-coverage-v2.mjs";

const WORLD_ID = "00000000-0000-4000-8000-000000000001";
const RESIDENT_A = "00000000-0000-4000-8000-000000000002";
const RESIDENT_B = "00000000-0000-4000-8000-000000000003";
const POLICY_VERSIONS = { decision: "m3-rule-decision-v2" };
const WORLD_TIME = "2026-09-07T08:45:00.000Z";

function input(action, residentId, overrides = {}) {
  return {
    worldId: WORLD_ID,
    residentId,
    action,
    episodeId: `${action}|${residentId}|0`,
    worldTime: WORLD_TIME,
    sourceObservationId: `observation|${residentId}|0`,
    policyVersions: POLICY_VERSIONS,
    ...overrides,
  };
}

function talkDecision(selectedActionType = "TALK") {
  return {
    candidates: [{ actionType: "TALK", reasonCode: "SOCIAL_HIGH", score: 10 }],
    selectedCandidate: { actionType: selectedActionType },
  };
}

function committedTalk(requestId = "00000000-0000-4000-8000-000000000004") {
  return {
    request: { id: requestId, actionType: "TALK" },
    outcome: { status: "COMMITTED" },
  };
}

test("Coverage v2 preserves TALK action count and initiator/participant union", () => {
  const collector = new CoverageV2Collector();
  collector.recordActionLoopDecision({
    ...input("TALK", RESIDENT_A),
    eligible: true,
    feasible: true,
    opportunity: true,
    decision: talkDecision(),
    submission: committedTalk(),
  });
  collector.recordCompletion({
    ...input("TALK", RESIDENT_A),
    actionInstanceId: "00000000-0000-4000-8000-000000000004",
    initiatorResidentId: RESIDENT_A,
    participantResidentId: RESIDENT_B,
  });
  collector.recordActionLoopDecision({
    ...input("TALK", RESIDENT_B),
    eligible: true,
    feasible: false,
    opportunity: false,
    reason: "NO_LEGAL_OPPORTUNITY",
  });

  const result = evaluateCoverageV2({
    contractVersion: COVERAGE_CONTRACT_VERSION,
    worldId: WORLD_ID,
    rows: collector.rows(),
    denominators: {
      TALK: {
        totalResidentIds: [RESIDENT_A, RESIDENT_B],
        eligibleResidentIds: [RESIDENT_A, RESIDENT_B],
        feasibleResidentIds: [RESIDENT_A],
      },
    },
  });
  const talk = result.actions.TALK;

  assert.equal(talk.actionCount, 1);
  assert.deepEqual(talk.uniqueInitiatorIds, [RESIDENT_A]);
  assert.deepEqual(talk.uniqueParticipantIds, [RESIDENT_B]);
  assert.deepEqual(talk.uniqueContactIds, [RESIDENT_A, RESIDENT_B]);
  assert.equal(talk.passes, true);
});

test("Coverage v2 reports missing negative rows as UNKNOWN and fails", () => {
  const result = evaluateCoverageV2({
    contractVersion: COVERAGE_CONTRACT_VERSION,
    worldId: WORLD_ID,
    rows: [
      {
        ...input("TALK", RESIDENT_A),
        stage: "TOTAL",
        outcomeReason: "DECISION_BOUNDARY",
      },
    ],
    denominators: {
      TALK: {
        totalResidentIds: [RESIDENT_A, RESIDENT_B],
        eligibleResidentIds: [],
        feasibleResidentIds: [],
      },
    },
  });

  assert.deepEqual(result.unknown, [RESIDENT_A, RESIDENT_B]);
  assert.equal(result.passes, false);
});

test("Coverage v2 keeps truthful EAT and MOVE terminal denominators", () => {
  const collector = new CoverageV2Collector();
  collector.recordActionLoopDecision({
    ...input("EAT", RESIDENT_A),
    eligible: true,
    feasible: false,
    opportunity: false,
    reason: "UNAVAILABLE_RESOURCE",
  });
  collector.recordActionLoopDecision({
    ...input("MOVE", RESIDENT_B),
    eligible: false,
    feasible: false,
    opportunity: false,
    reason: "NO_FORMAL_NECESSITY",
  });
  const result = evaluateCoverageV2({
    contractVersion: COVERAGE_CONTRACT_VERSION,
    worldId: WORLD_ID,
    rows: collector.rows(),
    denominators: {
      EAT: {
        totalResidentIds: [RESIDENT_A],
        eligibleResidentIds: [RESIDENT_A],
        feasibleResidentIds: [],
      },
      MOVE: {
        totalResidentIds: [RESIDENT_B],
        eligibleResidentIds: [],
        feasibleResidentIds: [],
      },
    },
  });

  assert.equal(result.actions.EAT.passes, true);
  assert.equal(result.actions.MOVE.passes, true);
  assert.equal(result.actions.EAT.stageResidentIds.FEASIBLE.length, 0);
  assert.equal(result.actions.MOVE.stageResidentIds.ELIGIBLE.length, 0);
});

test("Coverage v2 fails a feasible candidate that was never selected", () => {
  const collector = new CoverageV2Collector();
  collector.recordActionLoopDecision({
    ...input("TALK", RESIDENT_A),
    eligible: true,
    feasible: true,
    opportunity: true,
    decision: talkDecision("EAT"),
  });
  const result = evaluateCoverageV2({
    contractVersion: COVERAGE_CONTRACT_VERSION,
    worldId: WORLD_ID,
    rows: collector.rows(),
    denominators: {
      TALK: {
        totalResidentIds: [RESIDENT_A],
        eligibleResidentIds: [RESIDENT_A],
        feasibleResidentIds: [RESIDENT_A],
      },
    },
  });

  assert.deepEqual(result.actions.TALK.unknownResidentIds, []);
  assert.deepEqual(result.actions.TALK.feasibleMissingCompletion, [RESIDENT_A]);
  assert.equal(result.passes, false);
});

test("Coverage v2 records TALK opportunity and candidate-negative evidence", () => {
  const collector = new CoverageV2Collector();
  collector.recordActionLoopDecision({
    ...input("TALK", RESIDENT_A),
    eligible: true,
    feasible: true,
    opportunity: true,
    decision: talkDecision(),
    evidence: { partnerAvailability: 1, locationId: "home-a" },
  });
  collector.recordActionLoopDecision({
    ...input("TALK", RESIDENT_B),
    eligible: true,
    feasible: false,
    opportunity: false,
    reason: "NO_LEGAL_OPPORTUNITY",
    evidence: { partnerAvailability: 0, locationId: "home-b" },
  });
  const rows = collector.rows();
  assert.ok(
    rows.some(
      ({ residentId, stage }) =>
        residentId === RESIDENT_A && stage === "CANDIDATE_GENERATED",
    ),
  );
  assert.ok(
    rows.some(
      ({ residentId, terminalReason }) =>
        residentId === RESIDENT_B && terminalReason === "NO_LEGAL_OPPORTUNITY",
    ),
  );
});

test("Coverage v2 distinguishes TALK rejection and higher-priority selection", () => {
  const rejected = new CoverageV2Collector();
  rejected.recordActionLoopDecision({
    ...input("TALK", RESIDENT_A),
    eligible: true,
    feasible: true,
    opportunity: true,
    decision: talkDecision(),
    submission: {
      request: {
        id: "00000000-0000-4000-8000-000000000005",
        actionType: "TALK",
      },
      outcome: { status: "REJECTED", reasonCode: "KERNEL_CONFLICT" },
    },
  });
  assert.equal(rejected.rows().at(-1).terminalReason, "REQUEST_REJECTED");

  const notSelected = new CoverageV2Collector();
  notSelected.recordActionLoopDecision({
    ...input("TALK", RESIDENT_B),
    eligible: true,
    feasible: true,
    opportunity: true,
    decision: {
      candidates: [
        { actionType: "TALK", reasonCode: "SOCIAL_HIGH", score: 10 },
      ],
      selectedCandidate: { actionType: "EAT" },
    },
  });
  assert.equal(
    notSelected.rows().at(-1).terminalReason,
    "CANDIDATE_NOT_SELECTED",
  );
});
