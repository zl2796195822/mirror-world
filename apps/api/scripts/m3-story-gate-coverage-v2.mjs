export const COVERAGE_CONTRACT_VERSION = "m3-story-gate-coverage-v2";

export const FUNNEL_STAGES = [
  "TOTAL",
  "ELIGIBLE",
  "FEASIBLE",
  "OPPORTUNITY",
  "CANDIDATE_GENERATED",
  "SELECTED",
  "REQUESTED",
  "COMMITTED",
  "COMPLETED",
];

const ACTIONS = ["SLEEP", "EAT", "WORK", "TALK", "MOVE"];
const TERMINAL_REASONS = new Set([
  "NOT_ELIGIBLE",
  "NO_FORMAL_NECESSITY",
  "UNAVAILABLE_RESOURCE",
  "NO_LEGAL_OPPORTUNITY",
  "NO_CANDIDATE",
  "CANDIDATE_NOT_SELECTED",
  "REQUEST_NOT_ISSUED",
  "REQUEST_REJECTED",
  "DEFERRED",
  "BUSY",
]);

function assertString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function assertDate(value, name) {
  assertString(value, name);
  if (Number.isNaN(new Date(value).getTime())) {
    throw new Error(`${name} must be an ISO World Time`);
  }
}

function assertAction(value) {
  if (!ACTIONS.includes(value)) throw new Error(`unsupported action ${value}`);
}

export function createCoverageRow(input) {
  assertString(input.worldId, "worldId");
  assertString(input.residentId, "residentId");
  assertAction(input.action);
  assertString(input.episodeId, "episodeId");
  assertDate(input.worldTime, "worldTime");
  assertString(input.sourceObservationId, "sourceObservationId");
  if (!FUNNEL_STAGES.includes(input.stage)) {
    throw new Error(`unsupported funnel stage ${input.stage}`);
  }
  assertString(input.outcomeReason, "outcomeReason");
  if (!input.policyVersions || typeof input.policyVersions !== "object") {
    throw new Error("policyVersions are required");
  }
  if (input.terminalReason !== undefined) {
    assertString(input.terminalReason, "terminalReason");
    if (!TERMINAL_REASONS.has(input.terminalReason)) {
      throw new Error(`unsupported terminal reason ${input.terminalReason}`);
    }
  }
  return {
    schemaVersion: COVERAGE_CONTRACT_VERSION,
    artifactKind: "verification-analysis-not-world-truth",
    worldId: input.worldId,
    residentId: input.residentId,
    action: input.action,
    episodeId: input.episodeId,
    worldTime: new Date(input.worldTime).toISOString(),
    sourceObservationId: input.sourceObservationId,
    stage: input.stage,
    outcomeReason: input.outcomeReason,
    policyVersions: { ...input.policyVersions },
    ...(input.terminalReason ? { terminalReason: input.terminalReason } : {}),
    ...(input.actionInstanceId
      ? { actionInstanceId: input.actionInstanceId }
      : {}),
    ...(input.initiatorResidentId
      ? { initiatorResidentId: input.initiatorResidentId }
      : {}),
    ...(input.participantResidentId
      ? { participantResidentId: input.participantResidentId }
      : {}),
    ...(input.evidence ? { evidence: { ...input.evidence } } : {}),
  };
}

function baseInput(input, action, episodeId) {
  return {
    worldId: input.worldId,
    residentId: input.residentId,
    action,
    episodeId,
    worldTime: input.worldTime,
    sourceObservationId: input.sourceObservationId,
    policyVersions: input.policyVersions,
  };
}

export class CoverageV2Collector {
  #rows = [];

  record(input) {
    this.#rows.push(createCoverageRow(input));
  }

  recordActionLoopDecision(input) {
    assertAction(input.action);
    const episodeId = input.episodeId;
    const base = baseInput(input, input.action, episodeId);
    const evidence = input.evidence ?? {};
    this.record({
      ...base,
      stage: "TOTAL",
      outcomeReason: "DECISION_BOUNDARY",
      evidence,
    });
    if (!input.eligible) {
      this.record({
        ...base,
        stage: "TOTAL",
        outcomeReason: input.reason ?? "NOT_ELIGIBLE",
        terminalReason: input.reason ?? "NOT_ELIGIBLE",
        evidence,
      });
      return;
    }
    this.record({
      ...base,
      stage: "ELIGIBLE",
      outcomeReason: "ELIGIBLE",
      evidence,
    });
    if (!input.feasible) {
      this.record({
        ...base,
        stage: "ELIGIBLE",
        outcomeReason: input.reason ?? "INFEASIBLE",
        terminalReason: input.reason ?? "UNAVAILABLE_RESOURCE",
        evidence,
      });
      return;
    }
    this.record({
      ...base,
      stage: "FEASIBLE",
      outcomeReason: "FEASIBLE",
      evidence,
    });
    if (!input.opportunity) {
      this.record({
        ...base,
        stage: "FEASIBLE",
        outcomeReason: input.reason ?? "NO_LEGAL_OPPORTUNITY",
        terminalReason: input.reason ?? "NO_LEGAL_OPPORTUNITY",
        evidence,
      });
      return;
    }
    this.record({
      ...base,
      stage: "OPPORTUNITY",
      outcomeReason: "OPPORTUNITY_VISIBLE",
      evidence,
    });
    const candidates = input.decision?.candidates ?? [];
    const candidate = candidates.find(
      ({ actionType }) => actionType === input.action,
    );
    if (!candidate) {
      this.record({
        ...base,
        stage: "OPPORTUNITY",
        outcomeReason: "NO_CANDIDATE",
        terminalReason: "NO_CANDIDATE",
        evidence,
      });
      return;
    }
    this.record({
      ...base,
      stage: "CANDIDATE_GENERATED",
      outcomeReason: "CANDIDATE_GENERATED",
      evidence: {
        ...evidence,
        candidateReason: candidate.reasonCode,
        constraintResults: candidate.hardConstraints,
        candidateScore: candidate.score,
      },
    });
    const selected = input.decision?.selectedCandidate;
    if (!selected || selected.actionType !== input.action) {
      this.record({
        ...base,
        stage: "CANDIDATE_GENERATED",
        outcomeReason: "CANDIDATE_NOT_SELECTED",
        terminalReason: "CANDIDATE_NOT_SELECTED",
        evidence: {
          ...evidence,
          selectedActionType: selected?.actionType ?? null,
        },
      });
      return;
    }
    this.record({
      ...base,
      stage: "SELECTED",
      outcomeReason: "SELECTED",
      evidence,
    });
    const submission = input.submission;
    if (!submission?.request) {
      this.record({
        ...base,
        stage: "SELECTED",
        outcomeReason: "REQUEST_NOT_ISSUED",
        terminalReason: "REQUEST_NOT_ISSUED",
        evidence,
      });
      return;
    }
    this.record({
      ...base,
      stage: "REQUESTED",
      outcomeReason: "REQUESTED",
      actionInstanceId: submission.request.id,
      evidence,
    });
    if (submission.outcome?.status !== "COMMITTED") {
      this.record({
        ...base,
        stage: "REQUESTED",
        outcomeReason: input.reason ?? "REQUEST_REJECTED",
        terminalReason: input.reason ?? "REQUEST_REJECTED",
        actionInstanceId: submission.request.id,
        evidence,
      });
      return;
    }
    this.record({
      ...base,
      stage: "COMMITTED",
      outcomeReason: "KERNEL_COMMITTED",
      actionInstanceId: submission.request.id,
      evidence,
    });
  }

  recordCompletion(input) {
    this.record({
      worldId: input.worldId,
      residentId: input.residentId,
      action: input.action,
      episodeId: input.episodeId,
      worldTime: input.worldTime,
      sourceObservationId: input.sourceObservationId,
      stage: "COMPLETED",
      outcomeReason: "LIFECYCLE_COMPLETED",
      policyVersions: input.policyVersions,
      actionInstanceId: input.actionInstanceId,
      ...(input.initiatorResidentId
        ? { initiatorResidentId: input.initiatorResidentId }
        : {}),
      ...(input.participantResidentId
        ? { participantResidentId: input.participantResidentId }
        : {}),
    });
  }

  rows({ clone = true } = {}) {
    return clone ? this.#rows.map((row) => structuredClone(row)) : this.#rows;
  }

  clear() {
    this.#rows = [];
  }
}

function unique(values) {
  return [...new Set(values)].sort();
}

function stageResidents(rows, stage) {
  return unique(
    rows.filter((row) => row.stage === stage).map((row) => row.residentId),
  );
}

function actionSummary(action, rows, denominator) {
  const actionRows = rows.filter(
    ({ action: rowAction }) => rowAction === action,
  );
  const stageResidentIds = Object.fromEntries(
    FUNNEL_STAGES.map((stage) => [stage, stageResidents(actionRows, stage)]),
  );
  const groups = new Map();
  for (const row of actionRows) {
    const key = `${row.residentId}|${row.episodeId}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  const unknownResidentIds = [];
  for (const residentId of denominator.totalResidentIds) {
    const residentGroups = [...groups.entries()].filter(([key]) =>
      key.startsWith(`${residentId}|`),
    );
    if (residentGroups.length === 0) {
      unknownResidentIds.push(residentId);
      continue;
    }
    if (
      residentGroups.some(([, episodeRows]) => {
        const terminal = episodeRows.some((row) => row.terminalReason);
        const complete = FUNNEL_STAGES.every((stage) =>
          episodeRows.some((row) => row.stage === stage),
        );
        return !terminal && !complete;
      })
    ) {
      unknownResidentIds.push(residentId);
    }
  }
  const completedRows = actionRows.filter(({ stage }) => stage === "COMPLETED");
  const completedActionIds = unique(
    completedRows
      .map(({ actionInstanceId }) => actionInstanceId)
      .filter(Boolean),
  );
  const initiators = unique(
    completedRows
      .map(({ initiatorResidentId }) => initiatorResidentId)
      .filter(Boolean),
  );
  const participants = unique(
    completedRows
      .map(({ participantResidentId }) => participantResidentId)
      .filter(Boolean),
  );
  const contacts = unique([...initiators, ...participants]);
  const completedResidentIds =
    action === "TALK" ? contacts : stageResidentIds.COMPLETED;
  const terminalReasonCounts = Object.fromEntries(
    unique(
      actionRows.map(({ terminalReason }) => terminalReason).filter(Boolean),
    ).map((reason) => [
      reason,
      actionRows.filter((row) => row.terminalReason === reason).length,
    ]),
  );
  const effectiveFeasibleResidentIds =
    denominator.feasibleResidentIds.length > 0
      ? denominator.feasibleResidentIds
      : stageResidentIds.FEASIBLE;
  const feasibleMissingCompletion = effectiveFeasibleResidentIds.filter(
    (residentId) => !completedResidentIds.includes(residentId),
  );
  return {
    totalResidentIds: [...denominator.totalResidentIds],
    eligibleResidentIds: [...denominator.eligibleResidentIds],
    feasibleResidentIds: unique(effectiveFeasibleResidentIds),
    stageResidentIds,
    actionCount: completedActionIds.length,
    uniqueInitiatorIds: initiators,
    uniqueParticipantIds: participants,
    uniqueContactIds: contacts,
    uniqueCompletedIds: completedResidentIds,
    terminalReasonCounts,
    unknownResidentIds: unique(unknownResidentIds),
    feasibleMissingCompletion: unique(feasibleMissingCompletion),
    passes:
      unknownResidentIds.length === 0 && feasibleMissingCompletion.length === 0,
  };
}

export function evaluateCoverageV2(input) {
  if (input.contractVersion !== COVERAGE_CONTRACT_VERSION) {
    throw new Error("Coverage evaluator requires Contract v2");
  }
  const rows = input.rowsAreNormalized
    ? input.rows
    : input.rows.map(createCoverageRow);
  const actions = Object.fromEntries(
    ACTIONS.map((action) => [
      action,
      actionSummary(
        action,
        rows.filter(({ worldId }) => worldId === input.worldId),
        input.denominators[action] ?? {
          totalResidentIds: [],
          eligibleResidentIds: [],
          feasibleResidentIds: [],
        },
      ),
    ]),
  );
  return {
    contractVersion: COVERAGE_CONTRACT_VERSION,
    worldId: input.worldId,
    actions,
    unknown: unique(
      Object.values(actions).flatMap(
        ({ unknownResidentIds }) => unknownResidentIds,
      ),
    ),
    passes: Object.values(actions).every(({ passes }) => passes),
  };
}
