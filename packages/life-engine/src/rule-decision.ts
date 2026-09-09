import { createHash } from "node:crypto";
import type { GoalCandidate, GoalType } from "./goals.js";
import type { NeedState } from "./needs.js";

export const RULE_DECISION_POLICY_VERSION = "m3-rule-decision-v1" as const;

export const DECISION_LOCATION_KINDS = [
  "HOME",
  "OFFICE",
  "CAFE",
  "STORE",
  "PARK",
  "TRANSIT",
] as const;

export type DecisionLocationKind = (typeof DECISION_LOCATION_KINDS)[number];

export type DecisionLocationRef = Readonly<{
  id: string;
  kind: DecisionLocationKind;
}>;

export type DecisionActivityKind = "IDLE" | "TRAVELING" | "SLEEPING";

export type DecisionWorkObligation = Readonly<{
  status: "NOT_DUE" | "DUE" | "LATE" | "COMPLETED";
  workplaceId: string;
  deadline?: Date;
}>;

export type RuleDecisionResident = Readonly<{
  residentId: string;
  worldId: string;
  actorId: string;
  homeLocationId: string;
  workplaceId: string | null;
  stateVersion: number;
  profile: Readonly<{
    personality: Readonly<{
      conscientiousness: number;
      extraversion: number;
    }>;
    routine: Readonly<{
      sleepPhase: "EARLY" | "STANDARD" | "LATE";
      mealPhase: "EARLY" | "STANDARD" | "LATE";
      socialWindow: "MORNING" | "AFTERNOON" | "EVENING";
    }>;
  }>;
}>;

export type RuleDecisionPolicy = Readonly<{
  version: string;
  maxCandidates: number;
  scoreWeights: Readonly<{
    goalScore: number;
    needUrgency: number;
    locationAffinity: number;
    alreadyAtTargetPenalty: number;
  }>;
  locationAffinity: Readonly<
    Record<DecisionLocationKind, Readonly<Record<GoalType, number>>>
  >;
  idleReconsiderationWorldMinutes: number;
}>;

export const RULE_DECISION_POLICY_V1: RuleDecisionPolicy = {
  version: RULE_DECISION_POLICY_VERSION,
  maxCandidates: 8,
  scoreWeights: {
    goalScore: 1,
    needUrgency: 1,
    locationAffinity: 5,
    alreadyAtTargetPenalty: 1_000,
  },
  locationAffinity: {
    HOME: {
      SATISFY_HUNGER: 0,
      REST: 12,
      FULFILL_WORK_OBLIGATION: 0,
      MAKE_SOCIAL_CONTACT: 2,
      RETURN_HOME: 12,
    },
    OFFICE: {
      SATISFY_HUNGER: 0,
      REST: 0,
      FULFILL_WORK_OBLIGATION: 14,
      MAKE_SOCIAL_CONTACT: 4,
      RETURN_HOME: 0,
    },
    CAFE: {
      SATISFY_HUNGER: 8,
      REST: 0,
      FULFILL_WORK_OBLIGATION: 0,
      MAKE_SOCIAL_CONTACT: 6,
      RETURN_HOME: 0,
    },
    STORE: {
      SATISFY_HUNGER: 2,
      REST: 0,
      FULFILL_WORK_OBLIGATION: 0,
      MAKE_SOCIAL_CONTACT: 2,
      RETURN_HOME: 0,
    },
    PARK: {
      SATISFY_HUNGER: 0,
      REST: 2,
      FULFILL_WORK_OBLIGATION: 0,
      MAKE_SOCIAL_CONTACT: 5,
      RETURN_HOME: 0,
    },
    TRANSIT: {
      SATISFY_HUNGER: 0,
      REST: 0,
      FULFILL_WORK_OBLIGATION: 0,
      MAKE_SOCIAL_CONTACT: 0,
      RETURN_HOME: 0,
    },
  },
  idleReconsiderationWorldMinutes: 30,
};

export type RuleDecisionInput = {
  worldId: string;
  seed: string;
  currentWorldTime: Date;
  status: "RUNNING" | "PAUSED" | "MAINTENANCE";
  sourceWorldSeq: string;
  decisionEpoch: number;
  resident: Readonly<{
    residentId: string;
    worldId: string;
    actorId: string;
    homeLocationId: string;
    workplaceId: string | null;
    stateVersion?: number;
  }>;
  observation: Readonly<{
    locationId: string;
    locationKind: DecisionLocationKind;
    activity: Readonly<{ kind: DecisionActivityKind }>;
    workObligation?: DecisionWorkObligation;
  }>;
  needs:
    | NeedState
    | Readonly<{
        residentId: string;
        hungerPressure: number;
        restPressure: number;
        socialPressure: number;
      }>;
  selectedGoal:
    | (Pick<GoalCandidate, "type" | "score" | "priority" | "reasonCode"> &
        Partial<Pick<GoalCandidate, "targetLocationId">>)
    | null;
  locations: readonly DecisionLocationRef[];
  policy?: RuleDecisionPolicy;
};

export type HardConstraintCode =
  | "WORLD_RUNNING"
  | "RESIDENT_IDLE"
  | "DESTINATION_KNOWN"
  | "DESTINATION_DIFFERS"
  | "SLEEP_HOME_ONLY"
  | "GOAL_PRESENT"
  | "GOAL_HAS_ACTION_PATH";

export type HardConstraintResult = Readonly<{
  code: HardConstraintCode;
  passed: boolean;
  detail?: string;
}>;

export type CandidateActionType = "MOVE" | "SLEEP";

export type CandidateActionParameters =
  | Readonly<{ actionType: "MOVE"; destinationId: string }>
  | Readonly<{ actionType: "SLEEP"; destinationId?: undefined }>;

export type CandidateAction = Readonly<{
  id: string;
  goalType: GoalType | null;
  actionType: CandidateActionType;
  parameters: CandidateActionParameters;
  targetLocationId: string | null;
  sourceLocationId: string;
  reasonCode: string;
  hardConstraints: readonly HardConstraintResult[];
  feasible: boolean;
  score: number;
  scoreBreakdown: Readonly<{
    goalScore: number;
    needUrgency: number;
    locationAffinity: number;
    penalty: number;
  }>;
  stableKey: string;
}>;

export type ActionRequestDraft = Readonly<{
  actionType: CandidateActionType;
  parameters: CandidateActionParameters;
  requestedBy: "RULE";
  expectedActorVersion?: number;
  stableRequestSeed: string;
  stableIdempotencySeed: string;
}>;

export type NoActionReasonCode =
  | "WORLD_NOT_RUNNING"
  | "RESIDENT_BUSY"
  | "NO_SELECTED_GOAL"
  | "NO_FEASIBLE_CANDIDATE"
  | "ALREADY_SATISFIED";

export type RuleDecision = Readonly<{
  policyVersion: string;
  worldId: string;
  residentId: string;
  worldTime: Date;
  decisionEpoch: number;
  sourceWorldSeq: string;
  selectedGoal: RuleDecisionInput["selectedGoal"];
  candidates: readonly CandidateAction[];
  feasibleCandidates: readonly CandidateAction[];
  selectedCandidate: CandidateAction | null;
  actionRequestDraft: ActionRequestDraft | null;
  noActionReason: NoActionReasonCode | null;
  idleReconsiderationWorldMinutes: number;
}>;

function roundScore(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function stableDigest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function candidateStableKey(candidate: {
  actionType: CandidateActionType;
  targetLocationId: string | null;
  reasonCode: string;
}): string {
  return `${candidate.actionType}|${candidate.targetLocationId ?? ""}|${candidate.reasonCode}`;
}

function constraint(
  code: HardConstraintCode,
  passed: boolean,
  detail?: string,
): HardConstraintResult {
  return detail === undefined ? { code, passed } : { code, passed, detail };
}

function needUrgency(
  needs: RuleDecisionInput["needs"],
  goalType: GoalType | null,
): number {
  if (goalType === "REST") return needs.restPressure;
  if (goalType === "SATISFY_HUNGER") return needs.hungerPressure;
  if (goalType === "MAKE_SOCIAL_CONTACT") return needs.socialPressure;
  if (goalType === "FULFILL_WORK_OBLIGATION") return 80;
  if (goalType === "RETURN_HOME") return 60;
  return 0;
}

function affinityFor(
  policy: RuleDecisionPolicy,
  kind: DecisionLocationKind,
  goalType: GoalType | null,
): number {
  if (!goalType) return 0;
  return policy.locationAffinity[kind][goalType];
}

function makeCandidate(
  input: RuleDecisionInput,
  policy: RuleDecisionPolicy,
  details: Readonly<{
    goalType: GoalType | null;
    actionType: CandidateActionType;
    targetLocationId: string | null;
    reasonCode: string;
  }>,
): CandidateAction {
  const { observation, resident, needs, selectedGoal } = input;
  const targetKind =
    details.targetLocationId === null
      ? null
      : (input.locations.find(({ id }) => id === details.targetLocationId)
          ?.kind ?? null);

  const constraints: HardConstraintResult[] = [
    constraint("WORLD_RUNNING", input.status === "RUNNING", input.status),
    constraint(
      "RESIDENT_IDLE",
      observation.activity.kind === "IDLE",
      observation.activity.kind,
    ),
    constraint("GOAL_PRESENT", selectedGoal !== null),
  ];

  if (details.actionType === "MOVE") {
    const destinationKnown =
      details.targetLocationId !== null &&
      input.locations.some(({ id }) => id === details.targetLocationId);
    constraints.push(
      constraint(
        "DESTINATION_KNOWN",
        destinationKnown,
        details.targetLocationId ?? "missing",
      ),
      constraint(
        "DESTINATION_DIFFERS",
        details.targetLocationId !== observation.locationId,
        "same-location",
      ),
    );
  } else {
    constraints.push(
      constraint(
        "SLEEP_HOME_ONLY",
        observation.locationKind === "HOME" &&
          observation.locationId === resident.homeLocationId,
        observation.locationKind,
      ),
    );
  }

  if (details.goalType === "REST" && details.actionType === "MOVE") {
    constraints.push(
      constraint(
        "GOAL_HAS_ACTION_PATH",
        details.targetLocationId === resident.homeLocationId,
      ),
    );
  }
  if (details.goalType === "RETURN_HOME") {
    constraints.push(
      constraint(
        "GOAL_HAS_ACTION_PATH",
        details.actionType === "MOVE" &&
          details.targetLocationId === resident.homeLocationId &&
          observation.locationId !== resident.homeLocationId,
      ),
    );
  }
  if (details.goalType === "FULFILL_WORK_OBLIGATION") {
    constraints.push(
      constraint(
        "GOAL_HAS_ACTION_PATH",
        details.actionType === "MOVE" &&
          resident.workplaceId !== null &&
          details.targetLocationId === resident.workplaceId &&
          observation.locationId !== resident.workplaceId,
      ),
    );
  }
  if (
    details.goalType === "SATISFY_HUNGER" ||
    details.goalType === "MAKE_SOCIAL_CONTACT"
  ) {
    // EAT/WORK/TALK are not executable by current Kernel resident lifecycle.
    constraints.push(
      constraint(
        "GOAL_HAS_ACTION_PATH",
        false,
        "no executable kernel action for goal in m3-rule-decision-v1",
      ),
    );
  }

  const feasible = constraints.every(({ passed }) => passed);
  const goalScore = selectedGoal?.score ?? 0;
  const urgency = needUrgency(needs, details.goalType);
  const locationAffinity =
    targetKind === null ? 0 : affinityFor(policy, targetKind, details.goalType);
  const penalty = feasible ? 0 : policy.scoreWeights.alreadyAtTargetPenalty;
  const score = roundScore(
    policy.scoreWeights.goalScore * goalScore +
      policy.scoreWeights.needUrgency * (urgency / 10) +
      policy.scoreWeights.locationAffinity * locationAffinity -
      penalty,
  );

  const parameters: CandidateActionParameters =
    details.actionType === "MOVE"
      ? {
          actionType: "MOVE",
          destinationId: details.targetLocationId as string,
        }
      : { actionType: "SLEEP" };

  return {
    id: stableDigest(
      [
        "candidate",
        policy.version,
        input.worldId,
        resident.residentId,
        input.currentWorldTime.toISOString(),
        input.decisionEpoch,
        details.actionType,
        details.targetLocationId ?? "",
        details.reasonCode,
      ].join("|"),
    ),
    goalType: details.goalType,
    actionType: details.actionType,
    parameters,
    targetLocationId: details.targetLocationId,
    sourceLocationId: observation.locationId,
    reasonCode: details.reasonCode,
    hardConstraints: constraints,
    feasible,
    score,
    scoreBreakdown: {
      goalScore,
      needUrgency: urgency,
      locationAffinity,
      penalty,
    },
    stableKey: candidateStableKey({
      actionType: details.actionType,
      targetLocationId: details.targetLocationId,
      reasonCode: details.reasonCode,
    }),
  };
}

function compareCandidates(
  left: CandidateAction,
  right: CandidateAction,
): number {
  if (left.feasible !== right.feasible) {
    return left.feasible ? -1 : 1;
  }
  if (left.score !== right.score) {
    return right.score - left.score;
  }
  return left.stableKey < right.stableKey
    ? -1
    : left.stableKey > right.stableKey
      ? 1
      : 0;
}

function generateCandidates(
  input: RuleDecisionInput,
  policy: RuleDecisionPolicy,
): CandidateAction[] {
  const goal = input.selectedGoal;
  if (!goal) return [];

  const { observation, resident } = input;
  const candidates: CandidateAction[] = [];

  const push = (details: Parameters<typeof makeCandidate>[2]): void => {
    if (candidates.length >= policy.maxCandidates) return;
    candidates.push(makeCandidate(input, policy, details));
  };

  switch (goal.type) {
    case "REST": {
      if (observation.locationId === resident.homeLocationId) {
        push({
          goalType: "REST",
          actionType: "SLEEP",
          targetLocationId: null,
          reasonCode: goal.reasonCode,
        });
      } else {
        push({
          goalType: "REST",
          actionType: "MOVE",
          targetLocationId: resident.homeLocationId,
          reasonCode: goal.reasonCode,
        });
      }
      break;
    }
    case "RETURN_HOME": {
      if (observation.locationId !== resident.homeLocationId) {
        push({
          goalType: "RETURN_HOME",
          actionType: "MOVE",
          targetLocationId: resident.homeLocationId,
          reasonCode: goal.reasonCode,
        });
      }
      break;
    }
    case "FULFILL_WORK_OBLIGATION": {
      const workplaceId = goal.targetLocationId ?? resident.workplaceId ?? null;
      if (workplaceId && observation.locationId !== workplaceId) {
        push({
          goalType: "FULFILL_WORK_OBLIGATION",
          actionType: "MOVE",
          targetLocationId: workplaceId,
          reasonCode: goal.reasonCode,
        });
      }
      break;
    }
    case "SATISFY_HUNGER":
    case "MAKE_SOCIAL_CONTACT": {
      push({
        goalType: goal.type,
        actionType: "MOVE",
        targetLocationId:
          input.locations.find(({ kind }) => kind === "CAFE")?.id ?? null,
        reasonCode: goal.reasonCode,
      });
      break;
    }
  }

  candidates.sort(compareCandidates);
  return candidates.slice(0, policy.maxCandidates);
}

function validateInput(
  input: RuleDecisionInput,
  policy: RuleDecisionPolicy,
): void {
  if (input.worldId.trim().length === 0 || input.seed.trim().length === 0) {
    throw new Error("Rule decision requires worldId and seed");
  }
  if (Number.isNaN(input.currentWorldTime.getTime())) {
    throw new Error("currentWorldTime must be a valid world-time Date");
  }
  if (input.resident.worldId !== input.worldId) {
    throw new Error("Decision resident belongs to a different world");
  }
  if (input.needs.residentId !== input.resident.residentId) {
    throw new Error("Decision needs belong to a different resident");
  }
  if (!Number.isInteger(input.decisionEpoch) || input.decisionEpoch < 0) {
    throw new Error("decisionEpoch must be a non-negative integer");
  }
  if (
    !Number.isInteger(policy.maxCandidates) ||
    policy.maxCandidates <= 0 ||
    policy.maxCandidates > 32
  ) {
    throw new Error("Rule decision maxCandidates is invalid");
  }
  if (
    !Number.isInteger(policy.idleReconsiderationWorldMinutes) ||
    policy.idleReconsiderationWorldMinutes <= 0
  ) {
    throw new Error("Rule decision idle reconsideration is invalid");
  }
  const locationIds = new Set(input.locations.map(({ id }) => id));
  if (locationIds.size !== input.locations.length) {
    throw new Error("Decision locations must be unique");
  }
  if (!locationIds.has(input.observation.locationId)) {
    throw new Error("Observation location is missing from location directory");
  }
}

export function evaluateRuleDecision(input: RuleDecisionInput): RuleDecision {
  const policy = input.policy ?? RULE_DECISION_POLICY_V1;
  validateInput(input, policy);

  const base = {
    policyVersion: policy.version,
    worldId: input.worldId,
    residentId: input.resident.residentId,
    worldTime: new Date(input.currentWorldTime.getTime()),
    decisionEpoch: input.decisionEpoch,
    sourceWorldSeq: input.sourceWorldSeq,
    selectedGoal: input.selectedGoal,
    idleReconsiderationWorldMinutes: policy.idleReconsiderationWorldMinutes,
  };

  if (input.status !== "RUNNING") {
    return {
      ...base,
      candidates: [],
      feasibleCandidates: [],
      selectedCandidate: null,
      actionRequestDraft: null,
      noActionReason: "WORLD_NOT_RUNNING",
    };
  }

  if (input.observation.activity.kind !== "IDLE") {
    return {
      ...base,
      candidates: [],
      feasibleCandidates: [],
      selectedCandidate: null,
      actionRequestDraft: null,
      noActionReason: "RESIDENT_BUSY",
    };
  }

  if (!input.selectedGoal) {
    return {
      ...base,
      candidates: [],
      feasibleCandidates: [],
      selectedCandidate: null,
      actionRequestDraft: null,
      noActionReason: "NO_SELECTED_GOAL",
    };
  }

  const candidates = generateCandidates(input, policy);
  const feasibleCandidates = candidates.filter(({ feasible }) => feasible);
  const selectedCandidate = feasibleCandidates[0] ?? null;

  if (!selectedCandidate) {
    const alreadyHome =
      input.selectedGoal.type === "RETURN_HOME" &&
      input.observation.locationId === input.resident.homeLocationId;
    return {
      ...base,
      candidates,
      feasibleCandidates,
      selectedCandidate: null,
      actionRequestDraft: null,
      noActionReason: alreadyHome
        ? "ALREADY_SATISFIED"
        : "NO_FEASIBLE_CANDIDATE",
    };
  }

  const actionRequestDraft: ActionRequestDraft = {
    actionType: selectedCandidate.actionType,
    parameters: selectedCandidate.parameters,
    requestedBy: "RULE",
    ...(typeof input.resident.stateVersion === "number"
      ? { expectedActorVersion: input.resident.stateVersion }
      : {}),
    stableRequestSeed: stableDigest(
      [
        "action-request",
        policy.version,
        input.worldId,
        input.resident.residentId,
        input.resident.actorId,
        input.currentWorldTime.toISOString(),
        input.decisionEpoch,
        selectedCandidate.actionType,
        selectedCandidate.targetLocationId ?? "",
        selectedCandidate.id,
      ].join("|"),
    ),
    stableIdempotencySeed: stableDigest(
      [
        "idempotency",
        policy.version,
        input.worldId,
        input.resident.residentId,
        input.currentWorldTime.toISOString(),
        input.decisionEpoch,
        selectedCandidate.id,
      ].join("|"),
    ),
  };

  return {
    ...base,
    candidates,
    feasibleCandidates,
    selectedCandidate,
    actionRequestDraft,
    noActionReason: null,
  };
}
