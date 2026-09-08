import { createHash } from "node:crypto";

export type NeedActivity = "AWAKE" | "RESTING";

export type NeedPolicyVersion = string;

export const NEED_POLICY_VERSION = "m3-needs-v1" as const;
export const CORE_NEED_KEYS = [
  "hungerPressure",
  "restPressure",
  "socialPressure",
] as const;

type ActivityRates = Readonly<{
  awake: number;
  resting: number;
}>;

type NeedRates = Readonly<{
  hunger: ActivityRates;
  rest: ActivityRates;
  social: ActivityRates;
}>;

type BandThresholds = Readonly<{
  elevatedActivation: number;
  elevatedRelease: number;
  highActivation: number;
  highRelease: number;
  criticalActivation: number;
  criticalRelease: number;
}>;

type ProfileEffects = Readonly<{
  hungerFlexibility: number;
  restFlexibility: number;
  socialExtraversion: number;
}>;

export type ResidentNeedProfile = Readonly<{
  residentId: string;
  profile: Readonly<{
    personality: Readonly<{
      extraversion: number;
    }>;
    routine: Readonly<{
      flexibility: number;
    }>;
  }>;
}>;

export type NeedAnchor = Readonly<{
  worldTime: Date;
  activity: NeedActivity;
  hungerPressure: number;
  restPressure: number;
  socialPressure: number;
}>;

export type NeedPolicy = Readonly<{
  version: NeedPolicyVersion;
  ratesPerWorldHour: NeedRates;
  stableVariation: Readonly<{
    minMultiplier: number;
    maxMultiplier: number;
  }>;
  profileEffects: ProfileEffects;
  bands: BandThresholds;
}>;

export const NEED_POLICY_V1: NeedPolicy = {
  version: NEED_POLICY_VERSION,
  ratesPerWorldHour: {
    hunger: { awake: 0.45, resting: 0.15 },
    rest: { awake: 4, resting: -12 },
    social: { awake: 0.35, resting: 0.35 },
  },
  stableVariation: { minMultiplier: 0.96, maxMultiplier: 1.04 },
  profileEffects: {
    hungerFlexibility: 0.04,
    restFlexibility: 0.05,
    socialExtraversion: 0.1,
  },
  bands: {
    elevatedActivation: 40,
    elevatedRelease: 30,
    highActivation: 70,
    highRelease: 60,
    criticalActivation: 90,
    criticalRelease: 80,
  },
};

export type NeedEvaluationInput = Readonly<{
  worldId: string;
  currentWorldTime: Date;
  status: "RUNNING" | "PAUSED" | "MAINTENANCE";
  resident: ResidentNeedProfile;
  anchor: NeedAnchor;
  policy?: NeedPolicy;
  previousConditionBand?: ConditionBand;
}>;

export type ConditionBand = "STABLE" | "ELEVATED" | "HIGH" | "CRITICAL";

export type NeedState = Readonly<{
  residentId: string;
  policyVersion: NeedPolicyVersion;
  hungerPressure: number;
  restPressure: number;
  socialPressure: number;
  energyLevel: number;
  conditionBand: ConditionBand;
}>;

export type ResidentNeedEvaluationInput = Readonly<{
  resident: ResidentNeedProfile;
  anchor: NeedAnchor;
  previousConditionBand?: ConditionBand;
}>;

export type BatchNeedEvaluationInput = Readonly<{
  worldId: string;
  currentWorldTime: Date;
  status: NeedEvaluationInput["status"];
  residents: readonly ResidentNeedEvaluationInput[];
  policy?: NeedPolicy;
}>;

const WORLD_HOUR_MILLISECONDS = 3_600_000;
const VALUE_PRECISION = 1_000_000;

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

function clampPressure(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function roundValue(value: number): number {
  const rounded = Math.round(value * VALUE_PRECISION) / VALUE_PRECISION;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function stableUnit(seed: string): number {
  const digest = createHash("sha256").update(seed).digest("hex");
  return Number.parseInt(digest.slice(0, 8), 16) / 0xffffffff;
}

function stableVariation(
  input: NeedEvaluationInput,
  need: keyof NeedRates,
  policy: NeedPolicy,
): number {
  const { minMultiplier, maxMultiplier } = policy.stableVariation;
  const unit = stableUnit(
    `${policy.version}|${input.worldId}|${input.resident.residentId}|${need}`,
  );
  return minMultiplier + (maxMultiplier - minMultiplier) * unit;
}

function profileMultiplier(
  input: NeedEvaluationInput,
  need: keyof NeedRates,
  policy: NeedPolicy,
): number {
  const { extraversion } = input.resident.profile.personality;
  const { flexibility } = input.resident.profile.routine;

  assertUnitInterval(extraversion, "resident.profile.personality.extraversion");
  assertUnitInterval(flexibility, "resident.profile.routine.flexibility");

  switch (need) {
    case "hunger":
      return 1 + (0.5 - flexibility) * policy.profileEffects.hungerFlexibility;
    case "rest":
      return 1 + (0.5 - flexibility) * policy.profileEffects.restFlexibility;
    case "social":
      return (
        1 + (0.5 - extraversion) * policy.profileEffects.socialExtraversion
      );
  }
}

function ratePerWorldHour(
  input: NeedEvaluationInput,
  need: keyof NeedRates,
  policy: NeedPolicy,
): number {
  const activity = input.anchor.activity === "AWAKE" ? "awake" : "resting";
  return (
    policy.ratesPerWorldHour[need][activity] *
    stableVariation(input, need, policy) *
    profileMultiplier(input, need, policy)
  );
}

function elapsedWorldHours(input: NeedEvaluationInput): number {
  if (input.status !== "RUNNING") {
    return 0;
  }

  return Math.max(
    0,
    (input.currentWorldTime.getTime() - input.anchor.worldTime.getTime()) /
      WORLD_HOUR_MILLISECONDS,
  );
}

function validatePolicy(policy: NeedPolicy): void {
  const { bands, stableVariation } = policy;
  if (
    !Number.isFinite(stableVariation.minMultiplier) ||
    !Number.isFinite(stableVariation.maxMultiplier) ||
    stableVariation.minMultiplier <= 0 ||
    stableVariation.maxMultiplier < stableVariation.minMultiplier
  ) {
    throw new Error("Need policy stable variation is invalid");
  }

  for (const value of Object.values(policy.ratesPerWorldHour).flatMap((rates) =>
    Object.values(rates),
  )) {
    if (!Number.isFinite(value)) {
      throw new Error("Need policy rate is invalid");
    }
  }

  if (
    !(
      Object.values(bands).every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 100,
      ) &&
      bands.elevatedRelease < bands.elevatedActivation &&
      bands.elevatedActivation < bands.highActivation &&
      bands.highRelease < bands.highActivation &&
      bands.highActivation < bands.criticalActivation &&
      bands.criticalRelease < bands.criticalActivation
    )
  ) {
    throw new Error("Need policy hysteresis thresholds are invalid");
  }
}

function conditionBand(
  pressure: number,
  previous: ConditionBand | undefined,
  policy: NeedPolicy,
): ConditionBand {
  const { bands } = policy;
  if (pressure >= bands.criticalActivation) {
    return "CRITICAL";
  }
  if (previous === "CRITICAL" && pressure > bands.criticalRelease) {
    return "CRITICAL";
  }
  if (pressure >= bands.highActivation) {
    return "HIGH";
  }
  if (previous === "HIGH" && pressure > bands.highRelease) {
    return "HIGH";
  }
  if (pressure >= bands.elevatedActivation) {
    return "ELEVATED";
  }
  if (previous === "ELEVATED" && pressure > bands.elevatedRelease) {
    return "ELEVATED";
  }
  return "STABLE";
}

export function evaluateNeeds(input: NeedEvaluationInput): NeedState {
  if (input.worldId.trim().length === 0) {
    throw new Error("worldId must be non-empty");
  }
  if (input.resident.residentId.trim().length === 0) {
    throw new Error("residentId must be non-empty");
  }
  if (
    input.anchor.activity !== "AWAKE" &&
    input.anchor.activity !== "RESTING"
  ) {
    throw new Error("anchor.activity is invalid");
  }
  assertValidDate(input.currentWorldTime, "currentWorldTime");
  assertValidDate(input.anchor.worldTime, "anchor.worldTime");
  assertPressure(input.anchor.hungerPressure, "anchor.hungerPressure");
  assertPressure(input.anchor.restPressure, "anchor.restPressure");
  assertPressure(input.anchor.socialPressure, "anchor.socialPressure");

  const policy = input.policy ?? NEED_POLICY_V1;
  validatePolicy(policy);
  const elapsedHours = elapsedWorldHours(input);
  const hungerPressure = clampPressure(
    input.anchor.hungerPressure +
      ratePerWorldHour(input, "hunger", policy) * elapsedHours,
  );
  const restPressure = clampPressure(
    input.anchor.restPressure +
      ratePerWorldHour(input, "rest", policy) * elapsedHours,
  );
  const socialPressure = clampPressure(
    input.anchor.socialPressure +
      ratePerWorldHour(input, "social", policy) * elapsedHours,
  );
  const maximumPressure = Math.max(
    hungerPressure,
    restPressure,
    socialPressure,
  );

  return {
    residentId: input.resident.residentId,
    policyVersion: policy.version,
    hungerPressure: roundValue(hungerPressure),
    restPressure: roundValue(restPressure),
    socialPressure: roundValue(socialPressure),
    energyLevel: roundValue(clampPressure(100 - restPressure)),
    conditionBand: conditionBand(
      maximumPressure,
      input.previousConditionBand,
      policy,
    ),
  };
}

export function evaluateResidentsNeeds(
  input: BatchNeedEvaluationInput,
): readonly NeedState[] {
  const residentIds = input.residents.map(
    ({ resident }) => resident.residentId,
  );
  if (new Set(residentIds).size !== residentIds.length) {
    throw new Error("Resident need evaluation requires unique resident IDs");
  }

  return [...input.residents]
    .sort((left, right) =>
      left.resident.residentId < right.resident.residentId
        ? -1
        : left.resident.residentId > right.resident.residentId
          ? 1
          : 0,
    )
    .map(({ resident, anchor, previousConditionBand }) =>
      evaluateNeeds({
        worldId: input.worldId,
        currentWorldTime: input.currentWorldTime,
        status: input.status,
        resident,
        anchor,
        policy: input.policy,
        previousConditionBand,
      }),
    );
}
