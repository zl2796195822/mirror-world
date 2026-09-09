import type { ResidentLocationRef } from "@mirror/contracts";

export const ACTION_SEMANTICS_POLICY_VERSION =
  "m3-action-semantics-v1" as const;

type LocationKind = ResidentLocationRef["kind"];

const LOCATION_KINDS: readonly LocationKind[] = [
  "HOME",
  "OFFICE",
  "CAFE",
  "STORE",
  "PARK",
  "TRANSIT",
];

const TRAVEL_DURATION_WORLD_MINUTES: Readonly<
  Record<LocationKind, Readonly<Record<LocationKind, number>>>
> = {
  HOME: { HOME: 15, OFFICE: 15, CAFE: 10, STORE: 10, PARK: 10, TRANSIT: 5 },
  OFFICE: {
    HOME: 15,
    OFFICE: 5,
    CAFE: 5,
    STORE: 10,
    PARK: 10,
    TRANSIT: 5,
  },
  CAFE: {
    HOME: 10,
    OFFICE: 5,
    CAFE: 5,
    STORE: 5,
    PARK: 5,
    TRANSIT: 5,
  },
  STORE: {
    HOME: 10,
    OFFICE: 10,
    CAFE: 5,
    STORE: 5,
    PARK: 5,
    TRANSIT: 5,
  },
  PARK: {
    HOME: 10,
    OFFICE: 10,
    CAFE: 5,
    STORE: 5,
    PARK: 5,
    TRANSIT: 5,
  },
  TRANSIT: {
    HOME: 5,
    OFFICE: 5,
    CAFE: 5,
    STORE: 5,
    PARK: 5,
    TRANSIT: 5,
  },
};

export const ACTION_SEMANTICS_POLICY = {
  version: ACTION_SEMANTICS_POLICY_VERSION,
  sleepLocationKinds: ["HOME"] as const,
  sleepDurationWorldMinutes: {
    minimum: 480,
    maximum: 480,
    baseline: 480,
  },
  travelDurationWorldMinutes: TRAVEL_DURATION_WORLD_MINUTES,
} as const;

function assertLocationKind(value: string): asserts value is LocationKind {
  if (!LOCATION_KINDS.includes(value as LocationKind)) {
    throw new Error(`Unsupported semantic location kind: ${value}`);
  }
}

export function getTravelDurationWorldMinutes(
  sourceKind: string,
  destinationKind: string,
): number {
  assertLocationKind(sourceKind);
  assertLocationKind(destinationKind);
  return TRAVEL_DURATION_WORLD_MINUTES[sourceKind][destinationKind];
}

export function getSleepDurationWorldMinutes(): number {
  return ACTION_SEMANTICS_POLICY.sleepDurationWorldMinutes.baseline;
}

export function addWorldMinutes(worldTime: Date, minutes: number): Date {
  if (Number.isNaN(worldTime.getTime())) {
    throw new Error("worldTime must be a valid date");
  }
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error("world-time duration must be a non-negative integer");
  }
  return new Date(worldTime.getTime() + minutes * 60_000);
}
