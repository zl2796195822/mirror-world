import { z } from "zod";

export const OBSERVATION_POLICY_VERSION = "m3-observation-v1" as const;

export const observationWorldStatusSchema = z.enum([
  "RUNNING",
  "PAUSED",
  "MAINTENANCE",
]);

const observationPhaseSchema = z.enum(["EARLY", "STANDARD", "LATE"]);
const observationSocialWindowSchema = z.enum([
  "MORNING",
  "AFTERNOON",
  "EVENING",
]);
const observationRoleSchema = z.enum([
  "OFFICE_ASSISTANT",
  "CAFE_BARISTA",
  "STORE_CLERK",
]);

export const observationUnavailableReasonCodeSchema = z.enum([
  "ACTOR_REF_PENDING",
  "CURRENT_LOCATION_UNAVAILABLE",
  "CURRENT_ACTIVITY_UNAVAILABLE",
  "OBLIGATION_SOURCE_UNAVAILABLE",
  "RESOURCE_BRIDGE_PENDING",
  "LOCAL_CONTEXT_UNAVAILABLE",
]);

const unavailableCapabilitySchema = z
  .object({
    status: z.literal("UNAVAILABLE"),
    reasonCode: observationUnavailableReasonCodeSchema,
  })
  .strict();

const localContextSchema = z
  .object({
    status: z.literal("UNAVAILABLE"),
    reasonCode: z.literal("LOCAL_CONTEXT_UNAVAILABLE"),
    entities: z.array(z.never()).length(0),
  })
  .strict();

const residentEmploymentSchema = z
  .object({
    status: z.enum(["EMPLOYED", "UNEMPLOYED"]),
    workplaceId: z.uuid().nullable(),
    role: observationRoleSchema.nullable(),
  })
  .strict();

const residentProfileSchema = z
  .object({
    personality: z
      .object({
        conscientiousness: z.number().min(0).max(1),
        extraversion: z.number().min(0).max(1),
      })
      .strict(),
    routine: z
      .object({
        sleepPhase: observationPhaseSchema,
        mealPhase: observationPhaseSchema,
        socialWindow: observationSocialWindowSchema,
        flexibility: z.number().min(0).max(1),
      })
      .strict(),
  })
  .strict();

const residentSelfSchema = z
  .object({
    residentId: z.uuid(),
    identityKind: z.literal("NATIVE"),
    homeLocationId: z.uuid(),
    profileVersion: z.string().min(1),
    profile: residentProfileSchema,
    employment: residentEmploymentSchema,
  })
  .strict();

export const worldObservationSnapshotSchema = z
  .object({
    policyVersion: z.literal(OBSERVATION_POLICY_VERSION),
    worldId: z.uuid(),
    subjectResidentId: z.uuid(),
    worldSeed: z.string().min(1),
    worldTime: z.iso.datetime({ offset: true }),
    worldStatus: observationWorldStatusSchema,
    sourceWorldSeq: z.string().regex(/^\d+$/),
    self: residentSelfSchema,
    actorRef: unavailableCapabilitySchema.extend({
      reasonCode: z.literal("ACTOR_REF_PENDING"),
    }),
    location: unavailableCapabilitySchema.extend({
      reasonCode: z.literal("CURRENT_LOCATION_UNAVAILABLE"),
    }),
    activity: unavailableCapabilitySchema.extend({
      reasonCode: z.literal("CURRENT_ACTIVITY_UNAVAILABLE"),
    }),
    workObligation: unavailableCapabilitySchema.extend({
      reasonCode: z.literal("OBLIGATION_SOURCE_UNAVAILABLE"),
    }),
    resources: unavailableCapabilitySchema.extend({
      reasonCode: z.literal("RESOURCE_BRIDGE_PENDING"),
    }),
    localContext: localContextSchema,
  })
  .strict();

export type ObservationWorldStatus = z.infer<
  typeof observationWorldStatusSchema
>;
export type ObservationUnavailableReasonCode = z.infer<
  typeof observationUnavailableReasonCodeSchema
>;
export type ObservationWorldRecord = Readonly<{
  id: string;
  seed: string;
  status: ObservationWorldStatus;
  worldTime: Date;
  worldSeq: bigint;
}>;
export type ObservationResidentRecord = Readonly<{
  residentId: string;
  worldId: string;
  identityKind: "NATIVE";
  homeLocationId: string;
  profile: Readonly<{
    version: string;
    personality: Readonly<{
      conscientiousness: number;
      extraversion: number;
    }>;
    routine: Readonly<{
      sleepPhase: "EARLY" | "STANDARD" | "LATE";
      mealPhase: "EARLY" | "STANDARD" | "LATE";
      socialWindow: "MORNING" | "AFTERNOON" | "EVENING";
      flexibility: number;
    }>;
  }>;
  employment: Readonly<{
    status: "EMPLOYED" | "UNEMPLOYED";
    workplaceId: string | null;
    role: "OFFICE_ASSISTANT" | "CAFE_BARISTA" | "STORE_CLERK" | null;
  }>;
}>;
export type WorldObservationSnapshot = Readonly<
  z.infer<typeof worldObservationSnapshotSchema>
>;
export type ObservationQueryInput = Readonly<{
  worldId: string;
  residentId: string;
  expectedWorldSeq?: string;
}>;
export type ObservationBatchQueryInput = Readonly<{
  worldId: string;
  residentIds: readonly string[];
  expectedWorldSeq?: string;
}>;
export interface ObservationQueryPort {
  getResidentObservation(
    input: ObservationQueryInput,
  ): Promise<WorldObservationSnapshot>;
  getResidentObservations(
    input: ObservationBatchQueryInput,
  ): Promise<readonly WorldObservationSnapshot[]>;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export function parseWorldObservationSnapshot(
  input: unknown,
): WorldObservationSnapshot {
  return deepFreeze(worldObservationSnapshotSchema.parse(input));
}

export function buildWorldObservationSnapshot(input: {
  world: ObservationWorldRecord;
  resident: ObservationResidentRecord;
}): WorldObservationSnapshot {
  if (input.world.id !== input.resident.worldId) {
    throw new Error("Observation resident belongs to a different world");
  }
  if (Number.isNaN(input.world.worldTime.getTime())) {
    throw new Error("Observation worldTime must be a valid Date");
  }
  if (input.world.worldSeq < 0n) {
    throw new Error("Observation worldSeq must be non-negative");
  }

  return parseWorldObservationSnapshot({
    policyVersion: OBSERVATION_POLICY_VERSION,
    worldId: input.world.id,
    subjectResidentId: input.resident.residentId,
    worldSeed: input.world.seed,
    worldTime: input.world.worldTime.toISOString(),
    worldStatus: input.world.status,
    sourceWorldSeq: input.world.worldSeq.toString(),
    self: {
      residentId: input.resident.residentId,
      identityKind: input.resident.identityKind,
      homeLocationId: input.resident.homeLocationId,
      profileVersion: input.resident.profile.version,
      profile: {
        personality: {
          conscientiousness:
            input.resident.profile.personality.conscientiousness,
          extraversion: input.resident.profile.personality.extraversion,
        },
        routine: {
          sleepPhase: input.resident.profile.routine.sleepPhase,
          mealPhase: input.resident.profile.routine.mealPhase,
          socialWindow: input.resident.profile.routine.socialWindow,
          flexibility: input.resident.profile.routine.flexibility,
        },
      },
      employment: { ...input.resident.employment },
    },
    actorRef: { status: "UNAVAILABLE", reasonCode: "ACTOR_REF_PENDING" },
    location: {
      status: "UNAVAILABLE",
      reasonCode: "CURRENT_LOCATION_UNAVAILABLE",
    },
    activity: {
      status: "UNAVAILABLE",
      reasonCode: "CURRENT_ACTIVITY_UNAVAILABLE",
    },
    workObligation: {
      status: "UNAVAILABLE",
      reasonCode: "OBLIGATION_SOURCE_UNAVAILABLE",
    },
    resources: { status: "UNAVAILABLE", reasonCode: "RESOURCE_BRIDGE_PENDING" },
    localContext: {
      status: "UNAVAILABLE",
      reasonCode: "LOCAL_CONTEXT_UNAVAILABLE",
      entities: [],
    },
  });
}
