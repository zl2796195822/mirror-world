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
  capabilities?: readonly DecisionLocationCapability[];
}>;

export type DecisionActivityKind = "IDLE" | "TRAVELING" | "SLEEPING";
export type DecisionRuntimeActivityKind =
  | DecisionActivityKind
  | "EATING"
  | "WORKING"
  | "TALKING";
export type DecisionLocationCapability = "EAT" | "WORK" | "SLEEP";

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

export const RULE_DECISION_POLICY_VERSION_V2 = "m3-rule-decision-v2" as const;

export type DecisionFoodItem = Readonly<{
  itemId: string;
  locationId: string;
  foodUnits: number;
  resourceVersion?: number;
  version?: number;
  worldId?: string;
  residentId?: string;
}>;

export type DecisionNearbyResident = Readonly<{
  residentId: string;
  actorId: string;
  locationId: string;
  active: boolean;
  activityKind: DecisionRuntimeActivityKind;
  worldId?: string;
}>;

export type DecisionResourceSnapshot = Readonly<{
  itemId?: string;
  locationId?: string;
  foodUnits: number;
  version: number;
  worldId?: string;
  residentId?: string;
}>;

export type DecisionResourceObservation =
  | DecisionResourceSnapshot
  | Readonly<{
      status: "AVAILABLE";
      snapshot: DecisionResourceSnapshot;
    }>
  | Readonly<{
      status: "UNAVAILABLE";
      reasonCode: string;
    }>;

export type DecisionWorkObligationV2 = Readonly<{
  status: "NO_CURRENT_OBLIGATION" | "NOT_DUE" | "DUE" | "LATE" | "COMPLETED";
  workplaceId: string | null;
  deadline?: Date;
  startsAtWorldTime?: Date | null;
  endsAtWorldTime?: Date | null;
  completedWorkShiftKeys?: readonly string[];
}>;

export type DecisionLocalContext = Readonly<
  | {
      status: "AVAILABLE";
      foodItems: readonly DecisionFoodItem[];
      nearbyResidents: readonly DecisionNearbyResident[];
    }
  | {
      status: "UNAVAILABLE";
      reasonCode: string;
    }
>;

export type RuleDecisionV2Input = Readonly<{
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
    activity: Readonly<{ kind: DecisionRuntimeActivityKind }>;
    workObligation?: DecisionWorkObligationV2;
    eatCapable?: boolean;
    workCapable?: boolean;
    foodItems?: readonly DecisionFoodItem[];
    resources?: DecisionResourceObservation;
    nearbyResidents?: readonly DecisionNearbyResident[];
    localContext?: DecisionLocalContext;
  }>;
  needs:
    | NeedState
    | Readonly<{
        residentId: string;
        hungerPressure: number;
        restPressure: number;
        socialPressure: number;
      }>;
  selectedGoal: RuleDecisionInput["selectedGoal"];
  locations: readonly DecisionLocationRef[];
  completedWorkShiftKeys?: readonly string[];
  policy?: RuleDecisionPolicy;
}>;

export type HardConstraintCodeV2 =
  | HardConstraintCode
  | "FOOD_AVAILABLE"
  | "EAT_CAPABLE"
  | "WORK_OBLIGATION_DUE"
  | "WORKPLACE_MATCH"
  | "SHIFT_START_BOUNDARY"
  | "SHIFT_NOT_COMPLETED"
  | "WORK_CAPABLE"
  | "PARTICIPANT_KNOWN"
  | "PARTICIPANT_ACTIVE"
  | "PARTICIPANT_SAME_WORLD"
  | "PARTICIPANT_DIFFERENT"
  | "PARTICIPANT_SAME_LOCATION"
  | "PARTICIPANT_IDLE";

export type HardConstraintResultV2 = Readonly<{
  code: HardConstraintCodeV2;
  passed: boolean;
  detail?: string;
}>;

export type CandidateActionTypeV2 =
  | CandidateActionType
  | "EAT"
  | "WORK"
  | "TALK";

export type CandidateActionParametersV2 =
  | Readonly<{ actionType: "MOVE"; destinationId: string }>
  | Readonly<{ actionType: "SLEEP" }>
  | Readonly<{ actionType: "EAT"; itemId: string; quantity: 1 }>
  | Readonly<{ actionType: "WORK"; workplaceId: string }>
  | Readonly<{ actionType: "TALK"; participantId: string }>;

export type CandidateActionV2 = Readonly<{
  id: string;
  goalType: GoalType | null;
  actionType: CandidateActionTypeV2;
  parameters: CandidateActionParametersV2;
  targetLocationId: string | null;
  sourceLocationId: string;
  itemId?: string;
  participantId?: string;
  expectedResourceVersion?: number;
  reasonCode: string;
  hardConstraints: readonly HardConstraintResultV2[];
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

export type ActionRequestDraftV2 = Readonly<{
  actionType: CandidateActionTypeV2;
  parameters: CandidateActionParametersV2;
  requestedBy: "RULE";
  expectedActorVersion?: number;
  expectedResourceVersion?: number;
  stableRequestSeed: string;
  stableIdempotencySeed: string;
}>;

export type RuleDecisionV2 = Readonly<{
  policyVersion: string;
  worldId: string;
  residentId: string;
  worldTime: Date;
  decisionEpoch: number;
  sourceWorldSeq: string;
  selectedGoal: RuleDecisionV2Input["selectedGoal"];
  candidates: readonly CandidateActionV2[];
  feasibleCandidates: readonly CandidateActionV2[];
  selectedCandidate: CandidateActionV2 | null;
  actionRequestDraft: ActionRequestDraftV2 | null;
  noActionReason: NoActionReasonCode | null;
  idleReconsiderationWorldMinutes: number;
}>;

export const RULE_DECISION_POLICY_V2: RuleDecisionPolicy = {
  ...RULE_DECISION_POLICY_V1,
  version: RULE_DECISION_POLICY_VERSION_V2,
};

function compareStableIds(left: string, right: string): number {
  const leftHex = left.replaceAll("-", "").toLowerCase();
  const rightHex = right.replaceAll("-", "").toLowerCase();
  const leftIsUuid = /^[0-9a-f]{32}$/.test(leftHex);
  const rightIsUuid = /^[0-9a-f]{32}$/.test(rightHex);
  const leftKey = leftIsUuid ? leftHex : left.toLowerCase();
  const rightKey = rightIsUuid ? rightHex : right.toLowerCase();
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function v2Constraint(
  code: HardConstraintCodeV2,
  passed: boolean,
  detail?: string,
): HardConstraintResultV2 {
  return detail === undefined ? { code, passed } : { code, passed, detail };
}

function locationHasCapability(
  input: RuleDecisionV2Input,
  capability: DecisionLocationCapability,
): boolean {
  const location = input.locations.find(
    ({ id }) => id === input.observation.locationId,
  );
  if (!location) return false;
  const observedCapability =
    capability === "EAT"
      ? input.observation.eatCapable
      : capability === "WORK"
        ? input.observation.workCapable
        : undefined;
  if (typeof observedCapability === "boolean") return observedCapability;
  return location.capabilities?.includes(capability) ?? false;
}

function v2FoodItems(input: RuleDecisionV2Input): readonly DecisionFoodItem[] {
  if (input.observation.foodItems) return input.observation.foodItems;
  if (input.observation.localContext?.status === "AVAILABLE") {
    return input.observation.localContext.foodItems;
  }
  const resourceObservation = input.observation.resources;
  if (!resourceObservation) return [];
  const resource =
    "status" in resourceObservation
      ? resourceObservation.status === "AVAILABLE"
        ? resourceObservation.snapshot
        : null
      : resourceObservation;
  if (!resource || !resource.itemId || !resource.locationId) return [];
  return [
    {
      itemId: resource.itemId,
      locationId: resource.locationId,
      foodUnits: resource.foodUnits,
      resourceVersion: resource.version,
      ...(resource.worldId ? { worldId: resource.worldId } : {}),
      ...(resource.residentId ? { residentId: resource.residentId } : {}),
    },
  ];
}

function v2NearbyResidents(
  input: RuleDecisionV2Input,
): readonly DecisionNearbyResident[] {
  if (input.observation.nearbyResidents) {
    return input.observation.nearbyResidents;
  }
  if (input.observation.localContext?.status === "AVAILABLE") {
    return input.observation.localContext.nearbyResidents;
  }
  return [];
}

function isExactShiftStart(value: Date): boolean {
  return (
    value.getUTCHours() === 9 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  );
}

function shiftKey(residentId: string, startsAtWorldTime: Date): string {
  return `${residentId}|${startsAtWorldTime.toISOString()}`;
}

function v2NeedUrgency(
  input: RuleDecisionV2Input,
  goalType: GoalType | null,
): number {
  return needUrgency(input.needs, goalType);
}

function makeV2Candidate(
  input: RuleDecisionV2Input,
  policy: RuleDecisionPolicy,
  details: Readonly<{
    goalType: GoalType;
    actionType: CandidateActionTypeV2;
    targetLocationId: string | null;
    itemId?: string;
    participantId?: string;
    expectedResourceVersion?: number;
    reasonCode: string;
    constraints: readonly HardConstraintResultV2[];
  }>,
): CandidateActionV2 {
  const goal = input.selectedGoal;
  const urgency = v2NeedUrgency(input, details.goalType);
  const targetKind = details.targetLocationId
    ? input.locations.find(({ id }) => id === details.targetLocationId)?.kind
    : undefined;
  const feasible = details.constraints.every(({ passed }) => passed);
  const penalty = feasible ? 0 : policy.scoreWeights.alreadyAtTargetPenalty;
  const locationAffinity = targetKind
    ? affinityFor(policy, targetKind, details.goalType)
    : 0;
  const score = roundScore(
    policy.scoreWeights.goalScore * (goal?.score ?? 0) +
      policy.scoreWeights.needUrgency * (urgency / 10) +
      policy.scoreWeights.locationAffinity * locationAffinity -
      penalty,
  );
  const stableKey = [
    details.actionType,
    details.targetLocationId ?? "",
    details.itemId ?? "",
    details.participantId ?? "",
    details.reasonCode,
  ].join("|");
  const parameters: CandidateActionParametersV2 =
    details.actionType === "MOVE"
      ? {
          actionType: "MOVE",
          destinationId: details.targetLocationId ?? "",
        }
      : details.actionType === "SLEEP"
        ? { actionType: "SLEEP" }
        : details.actionType === "EAT"
          ? {
              actionType: "EAT",
              itemId: details.itemId ?? "",
              quantity: 1,
            }
          : details.actionType === "WORK"
            ? {
                actionType: "WORK",
                workplaceId: details.targetLocationId ?? "",
              }
            : {
                actionType: "TALK",
                participantId: details.participantId ?? "",
              };

  return {
    id: stableDigest(
      [
        "candidate",
        policy.version,
        input.worldId,
        input.resident.residentId,
        input.currentWorldTime.toISOString(),
        input.decisionEpoch,
        stableKey,
      ].join("|"),
    ),
    goalType: details.goalType,
    actionType: details.actionType,
    parameters,
    targetLocationId: details.targetLocationId,
    sourceLocationId: input.observation.locationId,
    ...(details.itemId ? { itemId: details.itemId } : {}),
    ...(details.participantId ? { participantId: details.participantId } : {}),
    ...(details.expectedResourceVersion !== undefined
      ? { expectedResourceVersion: details.expectedResourceVersion }
      : {}),
    reasonCode: details.reasonCode,
    hardConstraints: details.constraints,
    feasible,
    score,
    scoreBreakdown: {
      goalScore: goal?.score ?? 0,
      needUrgency: urgency,
      locationAffinity,
      penalty,
    },
    stableKey,
  };
}

function compareV2Candidates(
  left: CandidateActionV2,
  right: CandidateActionV2,
): number {
  if (left.feasible !== right.feasible) return left.feasible ? -1 : 1;
  if (left.score !== right.score) return right.score - left.score;
  if (left.scoreBreakdown.needUrgency !== right.scoreBreakdown.needUrgency) {
    return right.scoreBreakdown.needUrgency - left.scoreBreakdown.needUrgency;
  }
  const leftPriority = inputGoalPriority(
    left.goalType,
    left.scoreBreakdown.goalScore,
  );
  const rightPriority = inputGoalPriority(
    right.goalType,
    right.scoreBreakdown.goalScore,
  );
  if (leftPriority !== rightPriority) return rightPriority - leftPriority;
  return compareStableIds(left.stableKey, right.stableKey);
}

function inputGoalPriority(goalType: GoalType | null, score: number): number {
  if (goalType === "FULFILL_WORK_OBLIGATION") return 100;
  if (goalType === "REST") return 90;
  if (goalType === "SATISFY_HUNGER") return 80;
  if (goalType === "MAKE_SOCIAL_CONTACT") return 70;
  if (goalType === "RETURN_HOME") return 130;
  return score;
}

function baseV2Constraints(
  input: RuleDecisionV2Input,
): HardConstraintResultV2[] {
  return [
    v2Constraint("WORLD_RUNNING", input.status === "RUNNING", input.status),
    v2Constraint(
      "RESIDENT_IDLE",
      input.observation.activity.kind === "IDLE",
      input.observation.activity.kind,
    ),
    v2Constraint("GOAL_PRESENT", input.selectedGoal !== null),
  ];
}

function generateV2Candidates(
  input: RuleDecisionV2Input,
  policy: RuleDecisionPolicy,
): CandidateActionV2[] {
  const goal = input.selectedGoal;
  if (!goal) return [];
  const candidates: CandidateActionV2[] = [];
  const push = (details: Parameters<typeof makeV2Candidate>[2]): void => {
    if (candidates.length < policy.maxCandidates) {
      candidates.push(makeV2Candidate(input, policy, details));
    }
  };
  const common = baseV2Constraints(input);

  switch (goal.type) {
    case "SATISFY_HUNGER": {
      const items = [...v2FoodItems(input)].sort((left, right) =>
        compareStableIds(left.itemId, right.itemId),
      );
      const localItem = items.find(
        (item) =>
          item.locationId === input.observation.locationId &&
          item.foodUnits >= 1 &&
          (item.worldId === undefined || item.worldId === input.worldId) &&
          (item.residentId === undefined ||
            item.residentId === input.resident.residentId),
      );
      if (localItem) {
        const itemWorldMatches =
          localItem.worldId === undefined ||
          localItem.worldId === input.worldId;
        const itemResidentMatches =
          localItem.residentId === undefined ||
          localItem.residentId === input.resident.residentId;
        push({
          goalType: goal.type,
          actionType: "EAT",
          targetLocationId: input.observation.locationId,
          itemId: localItem.itemId,
          expectedResourceVersion:
            localItem.resourceVersion ?? localItem.version,
          reasonCode: goal.reasonCode,
          constraints: [
            ...common,
            v2Constraint(
              "FOOD_AVAILABLE",
              itemWorldMatches &&
                itemResidentMatches &&
                localItem.foodUnits >= 1,
              `${localItem.foodUnits}`,
            ),
            v2Constraint(
              "EAT_CAPABLE",
              itemWorldMatches &&
                itemResidentMatches &&
                locationHasCapability(input, "EAT"),
              input.observation.locationId,
            ),
          ],
        });
      } else {
        const remote = items.find((item) => {
          const location = input.locations.find(
            ({ id }) => id === item.locationId,
          );
          return (
            item.foodUnits >= 1 &&
            (item.worldId === undefined || item.worldId === input.worldId) &&
            (item.residentId === undefined ||
              item.residentId === input.resident.residentId) &&
            Boolean(location?.capabilities?.includes("EAT"))
          );
        });
        if (remote) {
          push({
            goalType: goal.type,
            actionType: "MOVE",
            targetLocationId: remote.locationId,
            reasonCode: goal.reasonCode,
            constraints: [
              ...common,
              v2Constraint(
                "DESTINATION_KNOWN",
                input.locations.some(({ id }) => id === remote.locationId),
                remote.locationId,
              ),
              v2Constraint(
                "DESTINATION_DIFFERS",
                remote.locationId !== input.observation.locationId,
                "same-location",
              ),
            ],
          });
        }
      }
      break;
    }
    case "REST": {
      if (input.observation.locationId === input.resident.homeLocationId) {
        push({
          goalType: goal.type,
          actionType: "SLEEP",
          targetLocationId: null,
          reasonCode: goal.reasonCode,
          constraints: [
            ...common,
            v2Constraint(
              "SLEEP_HOME_ONLY",
              input.observation.locationKind === "HOME",
              input.observation.locationKind,
            ),
          ],
        });
      } else {
        push({
          goalType: goal.type,
          actionType: "MOVE",
          targetLocationId: input.resident.homeLocationId,
          reasonCode: goal.reasonCode,
          constraints: [
            ...common,
            v2Constraint(
              "DESTINATION_KNOWN",
              input.locations.some(
                ({ id }) => id === input.resident.homeLocationId,
              ),
              input.resident.homeLocationId,
            ),
            v2Constraint(
              "DESTINATION_DIFFERS",
              input.resident.homeLocationId !== input.observation.locationId,
              "same-location",
            ),
          ],
        });
      }
      break;
    }
    case "FULFILL_WORK_OBLIGATION": {
      const obligation = input.observation.workObligation;
      const workplaceId = goal.targetLocationId ?? input.resident.workplaceId;
      if (
        !workplaceId ||
        input.resident.workplaceId === null ||
        !obligation ||
        obligation.status === "LATE" ||
        obligation.status === "NO_CURRENT_OBLIGATION"
      )
        break;
      const atWorkplace = input.observation.locationId === workplaceId;
      if (!atWorkplace) {
        if (obligation.status === "DUE" || obligation.status === "NOT_DUE") {
          push({
            goalType: goal.type,
            actionType: "MOVE",
            targetLocationId: workplaceId,
            reasonCode: goal.reasonCode,
            constraints: [
              ...common,
              v2Constraint(
                "DESTINATION_KNOWN",
                input.locations.some(({ id }) => id === workplaceId),
                workplaceId,
              ),
              v2Constraint("DESTINATION_DIFFERS", true),
            ],
          });
        }
        break;
      }
      const startsAt = obligation.startsAtWorldTime ?? input.currentWorldTime;
      const completedKey = shiftKey(input.resident.residentId, startsAt);
      const completedKeys = [
        ...(input.completedWorkShiftKeys ?? []),
        ...(obligation.completedWorkShiftKeys ?? []),
      ];
      const notCompleted = !completedKeys.includes(completedKey);
      push({
        goalType: goal.type,
        actionType: "WORK",
        targetLocationId: workplaceId,
        reasonCode: goal.reasonCode,
        constraints: [
          ...common,
          v2Constraint(
            "WORK_OBLIGATION_DUE",
            obligation.status === "DUE",
            obligation.status,
          ),
          v2Constraint(
            "WORKPLACE_MATCH",
            input.resident.workplaceId === workplaceId &&
              obligation.workplaceId === workplaceId,
            workplaceId,
          ),
          v2Constraint(
            "SHIFT_START_BOUNDARY",
            isExactShiftStart(input.currentWorldTime) &&
              startsAt.getTime() === input.currentWorldTime.getTime(),
            input.currentWorldTime.toISOString(),
          ),
          v2Constraint("SHIFT_NOT_COMPLETED", notCompleted, completedKey),
          v2Constraint(
            "WORK_CAPABLE",
            locationHasCapability(input, "WORK"),
            input.observation.locationId,
          ),
        ],
      });
      break;
    }
    case "MAKE_SOCIAL_CONTACT": {
      const participants = [...v2NearbyResidents(input)].sort(
        (left, right) =>
          compareStableIds(left.residentId, right.residentId) ||
          compareStableIds(left.actorId, right.actorId),
      );
      for (const participant of participants) {
        const known =
          participant.residentId.trim().length > 0 &&
          participant.actorId.trim().length > 0;
        push({
          goalType: goal.type,
          actionType: "TALK",
          targetLocationId: input.observation.locationId,
          participantId: participant.actorId,
          reasonCode: goal.reasonCode,
          constraints: [
            ...common,
            v2Constraint("PARTICIPANT_KNOWN", known),
            v2Constraint("PARTICIPANT_ACTIVE", participant.active),
            v2Constraint(
              "PARTICIPANT_SAME_WORLD",
              participant.worldId === undefined ||
                participant.worldId === input.worldId,
              participant.worldId ?? input.worldId,
            ),
            v2Constraint(
              "PARTICIPANT_DIFFERENT",
              participant.residentId !== input.resident.residentId &&
                participant.actorId !== input.resident.actorId,
            ),
            v2Constraint(
              "PARTICIPANT_SAME_LOCATION",
              participant.locationId === input.observation.locationId,
              participant.locationId,
            ),
            v2Constraint(
              "PARTICIPANT_IDLE",
              participant.activityKind === "IDLE",
              participant.activityKind,
            ),
          ],
        });
      }
      break;
    }
    case "RETURN_HOME": {
      if (input.observation.locationId !== input.resident.homeLocationId) {
        push({
          goalType: goal.type,
          actionType: "MOVE",
          targetLocationId: input.resident.homeLocationId,
          reasonCode: goal.reasonCode,
          constraints: [
            ...common,
            v2Constraint(
              "DESTINATION_KNOWN",
              input.locations.some(
                ({ id }) => id === input.resident.homeLocationId,
              ),
              input.resident.homeLocationId,
            ),
            v2Constraint("DESTINATION_DIFFERS", true),
          ],
        });
      }
      break;
    }
  }
  return candidates.sort(compareV2Candidates).slice(0, policy.maxCandidates);
}

function validateV2Input(
  input: RuleDecisionV2Input,
  policy: RuleDecisionPolicy,
): void {
  validateInput(
    {
      ...input,
      observation: {
        locationId: input.observation.locationId,
        locationKind: input.observation.locationKind,
        activity: {
          kind: input.observation.activity.kind as DecisionActivityKind,
        },
      },
    },
    policy,
  );
  if (!input.resident.actorId.trim()) {
    throw new Error("Decision resident actorId must be non-empty");
  }
  for (const item of v2FoodItems(input)) {
    if (!Number.isInteger(item.foodUnits) || item.foodUnits < 0) {
      throw new Error("Decision foodUnits must be a non-negative integer");
    }
    if (
      item.resourceVersion !== undefined &&
      (!Number.isInteger(item.resourceVersion) || item.resourceVersion < 0)
    ) {
      throw new Error(
        "Decision resourceVersion must be a non-negative integer",
      );
    }
  }
}

export function evaluateRuleDecisionV2(
  input: RuleDecisionV2Input,
): RuleDecisionV2 {
  const policy = input.policy ?? RULE_DECISION_POLICY_V2;
  validateV2Input(input, policy);
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
  const candidates = generateV2Candidates(input, policy);
  const feasibleCandidates = candidates.filter(({ feasible }) => feasible);
  const selectedCandidate = feasibleCandidates[0] ?? null;
  if (!selectedCandidate) {
    return {
      ...base,
      candidates,
      feasibleCandidates,
      selectedCandidate: null,
      actionRequestDraft: null,
      noActionReason: "NO_FEASIBLE_CANDIDATE",
    };
  }
  const actionRequestDraft: ActionRequestDraftV2 = {
    actionType: selectedCandidate.actionType,
    parameters: selectedCandidate.parameters,
    requestedBy: "RULE",
    ...(typeof input.resident.stateVersion === "number"
      ? { expectedActorVersion: input.resident.stateVersion }
      : {}),
    ...(selectedCandidate.expectedResourceVersion !== undefined
      ? { expectedResourceVersion: selectedCandidate.expectedResourceVersion }
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
        selectedCandidate.stableKey,
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
        selectedCandidate.stableKey,
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
