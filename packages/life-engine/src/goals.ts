import { createHash } from "node:crypto";
import type { NeedState } from "./needs.js";

export const GOAL_POLICY_VERSION = "m3-goals-v1" as const;

type SleepPhase = "EARLY" | "STANDARD" | "LATE";
type SocialWindow = "MORNING" | "AFTERNOON" | "EVENING";

export type GoalType =
  | "SATISFY_HUNGER"
  | "REST"
  | "FULFILL_WORK_OBLIGATION"
  | "MAKE_SOCIAL_CONTACT"
  | "RETURN_HOME";

export type GoalSource = "NEED" | "ROUTINE" | "OBLIGATION" | "CONTEXT";

export type GoalReasonCode =
  | "HUNGER_HIGH"
  | "REST_HIGH"
  | "SOCIAL_HIGH"
  | "MEAL_WINDOW"
  | "SLEEP_WINDOW"
  | "SOCIAL_WINDOW"
  | "WORK_PREPARATION"
  | "WORK_OBLIGATION_DUE"
  | "WORK_OBLIGATION_LATE"
  | "RETURN_HOME_REQUIRED"
  | "SOCIAL_OPPORTUNITY";

export type GoalResident = Readonly<{
  residentId: string;
  worldId: string;
  homeLocationId: string;
  profile: Readonly<{
    personality: Readonly<{
      conscientiousness: number;
      extraversion: number;
    }>;
    routine: Readonly<{
      sleepPhase: SleepPhase;
      mealPhase: SleepPhase;
      socialWindow: SocialWindow;
    }>;
  }>;
  employment: Readonly<{
    status: "EMPLOYED" | "UNEMPLOYED";
    workplaceId: string | null;
  }>;
}>;

export type GoalWorkObligation = Readonly<{
  status: "NOT_DUE" | "DUE" | "LATE" | "COMPLETED";
  workplaceId: string;
  deadline?: Date;
  startsAtWorldTime?: Date;
}>;

export type GoalWorkPreparation = Readonly<{
  boundaryWorldTime: Date;
  travelDurationWorldMinutes: number;
}>;

export type GoalContext = Readonly<{
  event: "NONE" | "RETURN_HOME_REQUIRED" | "SOCIAL_OPPORTUNITY";
  currentLocationId?: string;
}>;

export type ActiveGoal = Readonly<{
  type: GoalType;
  status: "ACTIVE";
}>;

export type GoalPolicy = Readonly<{
  version: string;
  thresholds: Readonly<{
    hungerActivation: number;
    restActivation: number;
    socialActivation: number;
  }>;
  priorities: Readonly<{
    context: number;
    obligation: number;
    rest: number;
    hunger: number;
    social: number;
    routine: number;
  }>;
  routineStartHourUtc: Readonly<{
    meal: Readonly<Record<SleepPhase, number>>;
    sleep: Readonly<Record<SleepPhase, number>>;
    social: Readonly<Record<SocialWindow, number>>;
  }>;
  routineWindowMinutes: number;
  activeGoalSwitchMargin: number;
}>;

export const GOAL_POLICY_V1: GoalPolicy = {
  version: GOAL_POLICY_VERSION,
  thresholds: {
    hungerActivation: 80,
    restActivation: 80,
    socialActivation: 70,
  },
  priorities: {
    context: 130,
    obligation: 100,
    rest: 90,
    hunger: 80,
    social: 70,
    routine: 45,
  },
  routineStartHourUtc: {
    meal: { EARLY: 7, STANDARD: 8, LATE: 9 },
    sleep: { EARLY: 21, STANDARD: 22, LATE: 23 },
    social: { MORNING: 9, AFTERNOON: 14, EVENING: 19 },
  },
  routineWindowMinutes: 120,
  activeGoalSwitchMargin: 10,
};

export type GoalCandidate = Readonly<{
  id: string;
  residentId: string;
  worldId: string;
  type: GoalType;
  source: GoalSource;
  reasonCode: GoalReasonCode;
  trigger: GoalReasonCode;
  priority: number;
  score: number;
  createdAtWorldTime: Date;
  deadline?: Date;
  progress: number;
  status: "PROPOSED";
  targetLocationId?: string;
}>;

export type GoalEvaluationInput = Readonly<{
  worldId: string;
  seed: string;
  currentWorldTime: Date;
  status: "RUNNING" | "PAUSED" | "MAINTENANCE";
  resident: GoalResident;
  needs: NeedState;
  obligation?: GoalWorkObligation;
  workPreparation?: GoalWorkPreparation;
  context?: GoalContext;
  activeGoal?: ActiveGoal;
  policy?: GoalPolicy;
}>;

export type GoalEvaluation = Readonly<{
  residentId: string;
  policyVersion: string;
  worldTime: Date;
  candidates: readonly GoalCandidate[];
  selectedGoal: GoalCandidate | null;
}>;

export type ResidentGoalEvaluationInput = Readonly<{
  resident: GoalResident;
  needs: NeedState;
  obligation?: GoalWorkObligation;
  workPreparation?: GoalWorkPreparation;
  context?: GoalContext;
  activeGoal?: ActiveGoal;
}>;

export type BatchGoalEvaluationInput = Readonly<{
  worldId: string;
  seed: string;
  currentWorldTime: Date;
  status: GoalEvaluationInput["status"];
  residents: readonly ResidentGoalEvaluationInput[];
  policy?: GoalPolicy;
}>;

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_HOUR = 60;
const ROUTINE_SCORE_RANGE = 10;
const NEED_SCORE_RANGE = 20;

function assertValidDate(value: Date, name: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${name} must be a valid world-time Date`);
  }
}

function assertUnitInterval(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be between 0 and 1`);
  }
}

function assertPressure(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${name} must be between 0 and 100`);
  }
}

function validatePolicy(policy: GoalPolicy): void {
  const { thresholds, priorities, routineStartHourUtc } = policy;
  for (const [name, value] of Object.entries(thresholds)) {
    if (!Number.isFinite(value) || value < 0 || value >= 100) {
      throw new Error(`Goal policy threshold ${name} is invalid`);
    }
  }
  for (const [name, value] of Object.entries(priorities)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Goal policy priority ${name} is invalid`);
    }
  }
  for (const hours of [
    ...Object.values(routineStartHourUtc.meal),
    ...Object.values(routineStartHourUtc.sleep),
    ...Object.values(routineStartHourUtc.social),
  ]) {
    if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
      throw new Error("Goal policy routine start hour is invalid");
    }
  }
  if (
    !Number.isInteger(policy.routineWindowMinutes) ||
    policy.routineWindowMinutes <= 0 ||
    policy.routineWindowMinutes > MINUTES_PER_DAY
  ) {
    throw new Error("Goal policy routine window is invalid");
  }
  if (
    !Number.isFinite(policy.activeGoalSwitchMargin) ||
    policy.activeGoalSwitchMargin < 0
  ) {
    throw new Error("Goal policy active switch margin is invalid");
  }
}

function stableDigest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function roundScore(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function needUrgency(value: number, activation: number): number {
  if (value < activation) {
    return 0;
  }
  return roundScore(
    ((value - activation) / (100 - activation)) * NEED_SCORE_RANGE,
  );
}

function dayStart(value: Date): number {
  return Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
}

function routineProgress(
  currentWorldTime: Date,
  startHourUtc: number,
  windowMinutes: number,
): number | null {
  const current = currentWorldTime.getTime();
  const currentDayStart = dayStart(currentWorldTime);
  const candidateStarts = [
    currentDayStart + startHourUtc * MINUTES_PER_HOUR * 60_000,
    currentDayStart -
      24 * 60 * 60_000 +
      startHourUtc * MINUTES_PER_HOUR * 60_000,
  ];
  for (const start of candidateStarts) {
    const elapsedMinutes = (current - start) / 60_000;
    if (elapsedMinutes >= 0 && elapsedMinutes < windowMinutes) {
      return roundScore(elapsedMinutes / windowMinutes);
    }
  }
  return null;
}

function goalId(
  input: GoalEvaluationInput,
  type: GoalType,
  reason: GoalReasonCode,
): string {
  return stableDigest(
    [
      "goal",
      input.policy?.version ?? GOAL_POLICY_VERSION,
      input.seed,
      input.worldId,
      input.resident.residentId,
      input.currentWorldTime.toISOString(),
      type,
      reason,
    ].join("|"),
  );
}

function candidateKey(candidate: GoalCandidate): string {
  return `${candidate.type}|${candidate.source}|${candidate.reasonCode}|${candidate.targetLocationId ?? ""}`;
}

function makeCandidate(
  input: GoalEvaluationInput,
  details: Readonly<{
    type: GoalType;
    source: GoalSource;
    reasonCode: GoalReasonCode;
    priority: number;
    urgency?: number;
    progress?: number;
    deadline?: Date;
    targetLocationId?: string;
  }>,
): GoalCandidate {
  const progress = details.progress ?? 0;
  return {
    id: goalId(input, details.type, details.reasonCode),
    residentId: input.resident.residentId,
    worldId: input.worldId,
    type: details.type,
    source: details.source,
    reasonCode: details.reasonCode,
    trigger: details.reasonCode,
    priority: details.priority,
    score: roundScore(details.priority + (details.urgency ?? 0)),
    createdAtWorldTime: new Date(input.currentWorldTime.getTime()),
    ...(details.deadline
      ? { deadline: new Date(details.deadline.getTime()) }
      : {}),
    progress,
    status: "PROPOSED",
    ...(details.targetLocationId
      ? { targetLocationId: details.targetLocationId }
      : {}),
  };
}

function validateInput(input: GoalEvaluationInput, policy: GoalPolicy): void {
  if (input.worldId.trim().length === 0 || input.seed.trim().length === 0) {
    throw new Error("Goal evaluation requires worldId and seed");
  }
  if (input.resident.worldId !== input.worldId) {
    throw new Error("Goal resident belongs to a different world");
  }
  if (input.resident.residentId.trim().length === 0) {
    throw new Error("Goal residentId must be non-empty");
  }
  if (input.resident.homeLocationId.trim().length === 0) {
    throw new Error("Goal resident homeLocationId must be non-empty");
  }
  assertValidDate(input.currentWorldTime, "currentWorldTime");
  assertUnitInterval(
    input.resident.profile.personality.conscientiousness,
    "resident.profile.personality.conscientiousness",
  );
  assertUnitInterval(
    input.resident.profile.personality.extraversion,
    "resident.profile.personality.extraversion",
  );
  if (input.needs.residentId !== input.resident.residentId) {
    throw new Error("Goal needs belong to a different resident");
  }
  assertPressure(input.needs.hungerPressure, "needs.hungerPressure");
  assertPressure(input.needs.restPressure, "needs.restPressure");
  assertPressure(input.needs.socialPressure, "needs.socialPressure");
  if (input.obligation?.deadline) {
    assertValidDate(input.obligation.deadline, "obligation.deadline");
  }
  if (input.obligation?.startsAtWorldTime) {
    assertValidDate(
      input.obligation.startsAtWorldTime,
      "obligation.startsAtWorldTime",
    );
  }
  if (input.workPreparation) {
    assertValidDate(
      input.workPreparation.boundaryWorldTime,
      "workPreparation.boundaryWorldTime",
    );
    if (
      !Number.isInteger(input.workPreparation.travelDurationWorldMinutes) ||
      input.workPreparation.travelDurationWorldMinutes <= 0
    ) {
      throw new Error("workPreparation travel duration is invalid");
    }
    if (
      input.obligation?.startsAtWorldTime &&
      input.workPreparation.boundaryWorldTime.getTime() >=
        input.obligation.startsAtWorldTime.getTime()
    ) {
      throw new Error("workPreparation must precede the work obligation");
    }
  }
  validatePolicy(policy);
}

function addNeedCandidates(
  input: GoalEvaluationInput,
  policy: GoalPolicy,
  candidates: GoalCandidate[],
): void {
  const { thresholds } = policy;
  if (input.needs.hungerPressure >= thresholds.hungerActivation) {
    candidates.push(
      makeCandidate(input, {
        type: "SATISFY_HUNGER",
        source: "NEED",
        reasonCode: "HUNGER_HIGH",
        priority: policy.priorities.hunger,
        urgency: needUrgency(
          input.needs.hungerPressure,
          thresholds.hungerActivation,
        ),
      }),
    );
  }
  if (input.needs.restPressure >= thresholds.restActivation) {
    candidates.push(
      makeCandidate(input, {
        type: "REST",
        source: "NEED",
        reasonCode: "REST_HIGH",
        priority: policy.priorities.rest,
        urgency: needUrgency(
          input.needs.restPressure,
          thresholds.restActivation,
        ),
      }),
    );
  }
  if (input.needs.socialPressure >= thresholds.socialActivation) {
    candidates.push(
      makeCandidate(input, {
        type: "MAKE_SOCIAL_CONTACT",
        source: "NEED",
        reasonCode: "SOCIAL_HIGH",
        priority: policy.priorities.social,
        urgency: needUrgency(
          input.needs.socialPressure,
          thresholds.socialActivation,
        ),
      }),
    );
  }
}

function addRoutineCandidates(
  input: GoalEvaluationInput,
  policy: GoalPolicy,
  candidates: GoalCandidate[],
): void {
  const { routine } = input.resident.profile;
  const mealProgress = routineProgress(
    input.currentWorldTime,
    policy.routineStartHourUtc.meal[routine.mealPhase],
    policy.routineWindowMinutes,
  );
  if (mealProgress !== null) {
    candidates.push(
      makeCandidate(input, {
        type: "SATISFY_HUNGER",
        source: "ROUTINE",
        reasonCode: "MEAL_WINDOW",
        priority: policy.priorities.routine,
        progress: mealProgress,
        urgency: mealProgress * ROUTINE_SCORE_RANGE,
      }),
    );
  }

  const sleepProgress = routineProgress(
    input.currentWorldTime,
    policy.routineStartHourUtc.sleep[routine.sleepPhase],
    policy.routineWindowMinutes,
  );
  if (sleepProgress !== null) {
    candidates.push(
      makeCandidate(input, {
        type: "REST",
        source: "ROUTINE",
        reasonCode: "SLEEP_WINDOW",
        priority: policy.priorities.routine,
        progress: sleepProgress,
        urgency: sleepProgress * ROUTINE_SCORE_RANGE,
      }),
    );
  }

  const socialProgress = routineProgress(
    input.currentWorldTime,
    policy.routineStartHourUtc.social[routine.socialWindow],
    policy.routineWindowMinutes,
  );
  if (socialProgress !== null) {
    candidates.push(
      makeCandidate(input, {
        type: "MAKE_SOCIAL_CONTACT",
        source: "ROUTINE",
        reasonCode: "SOCIAL_WINDOW",
        priority: policy.priorities.routine,
        progress: socialProgress,
        urgency: socialProgress * ROUTINE_SCORE_RANGE,
      }),
    );
  }
}

function addObligationCandidate(
  input: GoalEvaluationInput,
  policy: GoalPolicy,
  candidates: GoalCandidate[],
): void {
  const obligation = input.obligation;
  if (
    input.resident.employment.status !== "EMPLOYED" ||
    !input.resident.employment.workplaceId ||
    !obligation
  ) {
    return;
  }
  if (obligation.status === "NOT_DUE") {
    const preparation = input.workPreparation;
    if (
      !preparation ||
      !obligation.startsAtWorldTime ||
      input.currentWorldTime.getTime() <
        preparation.boundaryWorldTime.getTime() ||
      input.currentWorldTime.getTime() >= obligation.startsAtWorldTime.getTime()
    ) {
      return;
    }
    candidates.push(
      makeCandidate(input, {
        type: "FULFILL_WORK_OBLIGATION",
        source: "OBLIGATION",
        reasonCode: "WORK_PREPARATION",
        priority: policy.priorities.obligation,
        urgency: NEED_SCORE_RANGE,
        deadline: obligation.deadline,
        targetLocationId: obligation.workplaceId,
      }),
    );
    return;
  }
  if (obligation.status !== "DUE" && obligation.status !== "LATE") return;
  const late = obligation.status === "LATE";
  candidates.push(
    makeCandidate(input, {
      type: "FULFILL_WORK_OBLIGATION",
      source: "OBLIGATION",
      reasonCode: late ? "WORK_OBLIGATION_LATE" : "WORK_OBLIGATION_DUE",
      priority: policy.priorities.obligation,
      urgency: late ? NEED_SCORE_RANGE + 10 : NEED_SCORE_RANGE,
      deadline: obligation.deadline,
      targetLocationId: obligation.workplaceId,
    }),
  );
}

function addContextCandidates(
  input: GoalEvaluationInput,
  policy: GoalPolicy,
  candidates: GoalCandidate[],
): void {
  const event = input.context?.event ?? "NONE";
  if (event === "RETURN_HOME_REQUIRED") {
    if (input.context?.currentLocationId === input.resident.homeLocationId) {
      return;
    }
    candidates.push(
      makeCandidate(input, {
        type: "RETURN_HOME",
        source: "CONTEXT",
        reasonCode: "RETURN_HOME_REQUIRED",
        priority: policy.priorities.context,
        urgency: NEED_SCORE_RANGE,
        targetLocationId: input.resident.homeLocationId,
      }),
    );
  }
  if (event === "SOCIAL_OPPORTUNITY") {
    candidates.push(
      makeCandidate(input, {
        type: "MAKE_SOCIAL_CONTACT",
        source: "CONTEXT",
        reasonCode: "SOCIAL_OPPORTUNITY",
        priority: policy.priorities.context,
        urgency: 0,
      }),
    );
  }
}

function compareCandidates(left: GoalCandidate, right: GoalCandidate): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }
  if (left.priority !== right.priority) {
    return right.priority - left.priority;
  }
  const leftKey = candidateKey(left);
  const rightKey = candidateKey(right);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function selectGoal(
  candidates: readonly GoalCandidate[],
  activeGoal: ActiveGoal | undefined,
  policy: GoalPolicy,
): GoalCandidate | null {
  const best = candidates[0] ?? null;
  if (!best || !activeGoal || activeGoal.status !== "ACTIVE") {
    return best;
  }
  const activeCandidate = candidates
    .filter(({ type }) => type === activeGoal.type)
    .sort(compareCandidates)[0];
  if (
    activeCandidate &&
    activeCandidate.score + policy.activeGoalSwitchMargin >= best.score
  ) {
    return activeCandidate;
  }
  return best;
}

export function evaluateGoals(input: GoalEvaluationInput): GoalEvaluation {
  const policy = input.policy ?? GOAL_POLICY_V1;
  validateInput(input, policy);
  if (input.status !== "RUNNING") {
    return {
      residentId: input.resident.residentId,
      policyVersion: policy.version,
      worldTime: new Date(input.currentWorldTime.getTime()),
      candidates: [],
      selectedGoal: null,
    };
  }

  const candidates: GoalCandidate[] = [];
  addNeedCandidates(input, policy, candidates);
  addRoutineCandidates(input, policy, candidates);
  addObligationCandidate(input, policy, candidates);
  addContextCandidates(input, policy, candidates);
  candidates.sort(compareCandidates);

  return {
    residentId: input.resident.residentId,
    policyVersion: policy.version,
    worldTime: new Date(input.currentWorldTime.getTime()),
    candidates,
    selectedGoal: selectGoal(candidates, input.activeGoal, policy),
  };
}

export function evaluateResidentsGoals(
  input: BatchGoalEvaluationInput,
): readonly GoalEvaluation[] {
  if (input.seed.trim().length === 0 || input.worldId.trim().length === 0) {
    throw new Error("Goal batch evaluation requires worldId and seed");
  }
  const residentIds = input.residents.map(
    ({ resident }) => resident.residentId,
  );
  if (new Set(residentIds).size !== residentIds.length) {
    throw new Error("Goal evaluation requires unique resident IDs");
  }

  return [...input.residents]
    .sort((left, right) =>
      left.resident.residentId < right.resident.residentId
        ? -1
        : left.resident.residentId > right.resident.residentId
          ? 1
          : 0,
    )
    .map(
      ({ resident, needs, obligation, workPreparation, context, activeGoal }) =>
        evaluateGoals({
          worldId: input.worldId,
          seed: input.seed,
          currentWorldTime: input.currentWorldTime,
          status: input.status,
          resident,
          needs,
          obligation,
          workPreparation,
          context,
          activeGoal,
          policy: input.policy,
        }),
    );
}
