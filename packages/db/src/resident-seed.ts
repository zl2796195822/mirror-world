import { createHash } from "node:crypto";

export const RESIDENT_SEED_GENERATOR_VERSION = "m3-t01-v1" as const;
export const RESIDENT_SEED_CONFIG_VERSION = "first-street-v1" as const;
export const RESIDENT_SEED_COUNT = 30 as const;
export const RESIDENT_PROFILE_COUNT = 5 as const;
export const EMPLOYED_RESIDENT_COUNT = 26 as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ResidentIdentityKind = "NATIVE";

export type ResidentPersonality = Readonly<{
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  emotionalStability: number;
  riskTolerance: number;
}>;

export type ResidentRoutineProfile = Readonly<{
  profileId: string;
  sleepPhase: "EARLY" | "STANDARD" | "LATE";
  mealPhase: "EARLY" | "STANDARD" | "LATE";
  socialWindow: "MORNING" | "AFTERNOON" | "EVENING";
  flexibility: number;
}>;

export type ResidentEmploymentSeed =
  | Readonly<{
      status: "EMPLOYED";
      workplaceId: string;
      role: "OFFICE_ASSISTANT" | "CAFE_BARISTA" | "STORE_CLERK";
    }>
  | Readonly<{
      status: "UNEMPLOYED";
      workplaceId: null;
      role: null;
    }>;

export type ResidentResourceSnapshot = Readonly<{
  residentId: string;
  worldId: string;
  cashCents: number;
  foodUnits: number;
  version: number;
}>;

export type ResidentLocationKind =
  | "HOME"
  | "OFFICE"
  | "CAFE"
  | "STORE"
  | "PARK"
  | "TRANSIT";

export type ResidentLocationFixture = Readonly<{
  id: string;
  key: string;
  kind: ResidentLocationKind;
}>;

export type ResidentSeed = Readonly<{
  residentId: string;
  worldId: string;
  identityKind: ResidentIdentityKind;
  actorRef: Readonly<{
    actorId: string;
    scope: "FIXTURE_ONLY";
  }>;
  homeLocationId: string;
  profile: Readonly<{
    version: typeof RESIDENT_SEED_CONFIG_VERSION;
    personality: ResidentPersonality;
    routine: ResidentRoutineProfile;
  }>;
  employment: ResidentEmploymentSeed;
  resources: ResidentResourceSnapshot;
}>;

export type ResidentSeedBundle = Readonly<{
  seed: string;
  worldId: string;
  generatorVersion: typeof RESIDENT_SEED_GENERATOR_VERSION;
  configVersion: typeof RESIDENT_SEED_CONFIG_VERSION;
  profileHash: string;
  residents: readonly ResidentSeed[];
}>;

export type ResidentSeedInput = Readonly<{
  worldId: string;
  seed: string;
}>;

const PROFILE_DEFINITIONS: readonly ResidentRoutineProfile[] = [
  {
    profileId: "early-social",
    sleepPhase: "EARLY",
    mealPhase: "EARLY",
    socialWindow: "MORNING",
    flexibility: 0.35,
  },
  {
    profileId: "early-private",
    sleepPhase: "EARLY",
    mealPhase: "STANDARD",
    socialWindow: "EVENING",
    flexibility: 0.2,
  },
  {
    profileId: "standard-balanced",
    sleepPhase: "STANDARD",
    mealPhase: "STANDARD",
    socialWindow: "AFTERNOON",
    flexibility: 0.55,
  },
  {
    profileId: "late-social",
    sleepPhase: "LATE",
    mealPhase: "LATE",
    socialWindow: "EVENING",
    flexibility: 0.7,
  },
  {
    profileId: "late-flexible",
    sleepPhase: "LATE",
    mealPhase: "STANDARD",
    socialWindow: "AFTERNOON",
    flexibility: 0.85,
  },
] as const;

const PERSONALITY_DEFINITIONS: readonly ResidentPersonality[] = [
  {
    openness: 0.72,
    conscientiousness: 0.84,
    extraversion: 0.68,
    agreeableness: 0.76,
    emotionalStability: 0.64,
    riskTolerance: 0.48,
  },
  {
    openness: 0.44,
    conscientiousness: 0.78,
    extraversion: 0.28,
    agreeableness: 0.62,
    emotionalStability: 0.8,
    riskTolerance: 0.24,
  },
  {
    openness: 0.56,
    conscientiousness: 0.62,
    extraversion: 0.52,
    agreeableness: 0.58,
    emotionalStability: 0.6,
    riskTolerance: 0.46,
  },
  {
    openness: 0.8,
    conscientiousness: 0.5,
    extraversion: 0.82,
    agreeableness: 0.68,
    emotionalStability: 0.52,
    riskTolerance: 0.76,
  },
  {
    openness: 0.66,
    conscientiousness: 0.7,
    extraversion: 0.46,
    agreeableness: 0.5,
    emotionalStability: 0.72,
    riskTolerance: 0.62,
  },
] as const;

const CASH_BANDS_CENTS = [
  120_000, 160_000, 200_000, 260_000, 320_000, 400_000,
] as const;
const FOOD_BANDS = [1, 2, 3, 4, 0, 2] as const;
const EMPLOYED_ROLES = [
  "OFFICE_ASSISTANT",
  "CAFE_BARISTA",
  "STORE_CLERK",
] as const;

function assertInput(input: ResidentSeedInput): void {
  if (!UUID_PATTERN.test(input.worldId)) {
    throw new Error("Resident seed worldId must be a UUID");
  }
  if (input.seed.trim().length === 0) {
    throw new Error("Resident seed must be non-empty");
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function deterministicUuid(value: string): string {
  const bytes = Buffer.from(digest(value).slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function stableOrder(seed: string, count: number): number[] {
  return Array.from({ length: count }, (_, index) => index).sort(
    (left, right) => {
      const leftKey = digest(`${seed}|resident-order|${left}`);
      const rightKey = digest(`${seed}|resident-order|${right}`);
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : left - right;
    },
  );
}

export function getFirstStreetLocationFixtures(
  worldId: string,
): readonly ResidentLocationFixture[] {
  if (!UUID_PATTERN.test(worldId)) {
    throw new Error("Resident location worldId must be a UUID");
  }

  const homes = Array.from({ length: 12 }, (_, index) => ({
    id: deterministicUuid(`location|${worldId}|home-unit-${index + 1}`),
    key: `home-unit-${String(index + 1).padStart(2, "0")}`,
    kind: "HOME" as const,
  }));

  const shared = (
    [
      ["office", "OFFICE"],
      ["cafe", "CAFE"],
      ["store", "STORE"],
      ["park", "PARK"],
      ["transit", "TRANSIT"],
    ] as const
  ).map(([key, kind]) => ({
    id: deterministicUuid(`location|${worldId}|${key}`),
    key,
    kind,
  }));

  return [...homes, ...shared];
}

export function generateResidentSeed(
  input: ResidentSeedInput,
): ResidentSeedBundle {
  assertInput(input);
  const locations = getFirstStreetLocationFixtures(input.worldId);
  const homeLocations = locations.filter(({ kind }) => kind === "HOME");
  const workplaces = locations.filter(({ kind }) =>
    ["OFFICE", "CAFE", "STORE"].includes(kind),
  );
  const order = stableOrder(input.seed, RESIDENT_SEED_COUNT);

  const residents = order
    .map((sourceIndex, position) => {
      const residentId = deterministicUuid(
        `resident|${RESIDENT_SEED_GENERATOR_VERSION}|${input.worldId}|${input.seed}|${sourceIndex}`,
      );
      const profileIndex = position % RESIDENT_PROFILE_COUNT;
      const employed = position < EMPLOYED_RESIDENT_COUNT;
      const roleIndex = position % EMPLOYED_ROLES.length;
      const cashBandIndex = position % CASH_BANDS_CENTS.length;
      const homeLocation = homeLocations[position % homeLocations.length];

      return {
        residentId,
        worldId: input.worldId,
        identityKind: "NATIVE" as const,
        actorRef: {
          actorId: deterministicUuid(
            `actor-ref|${RESIDENT_SEED_GENERATOR_VERSION}|${input.worldId}|${input.seed}|${sourceIndex}`,
          ),
          scope: "FIXTURE_ONLY" as const,
        },
        homeLocationId: homeLocation.id,
        profile: {
          version: RESIDENT_SEED_CONFIG_VERSION,
          personality: { ...PERSONALITY_DEFINITIONS[profileIndex] },
          routine: { ...PROFILE_DEFINITIONS[profileIndex] },
        },
        employment: employed
          ? {
              status: "EMPLOYED" as const,
              workplaceId: workplaces[roleIndex % workplaces.length].id,
              role: EMPLOYED_ROLES[roleIndex],
            }
          : {
              status: "UNEMPLOYED" as const,
              workplaceId: null,
              role: null,
            },
        resources: {
          residentId,
          worldId: input.worldId,
          cashCents: CASH_BANDS_CENTS[cashBandIndex],
          foodUnits: FOOD_BANDS[cashBandIndex],
          version: 0,
        },
      } satisfies ResidentSeed;
    })
    .sort((left, right) =>
      left.residentId < right.residentId
        ? -1
        : left.residentId > right.residentId
          ? 1
          : 0,
    );

  return {
    seed: input.seed,
    worldId: input.worldId,
    generatorVersion: RESIDENT_SEED_GENERATOR_VERSION,
    configVersion: RESIDENT_SEED_CONFIG_VERSION,
    profileHash: digest(
      JSON.stringify(
        PROFILE_DEFINITIONS.map((routine, index) => ({
          personality: PERSONALITY_DEFINITIONS[index],
          routine,
        })),
      ),
    ),
    residents,
  };
}
