import { and, eq } from "drizzle-orm";
import {
  createDb,
  generateResidentSeed,
  getFirstStreetLocationFixtures,
  registerNextWorkBoundaryWakeInTransaction,
  registerWorkPreparationWakeInTransaction,
  residentRuntimeStates,
  worlds,
  type ScheduledWakeTransaction,
} from "@mirror/db";
import type { ScheduledWakeRegistration } from "@mirror/contracts";
import { getTravelDurationWorldMinutes } from "./action-semantics.js";
import { getWorkShift } from "./lifecycle-semantics.js";

export const WORK_PREPARATION_POLICY_VERSION = "m3-scheduler-v2" as const;

export type WorkPreparationWakeDatabase = ReturnType<typeof createDb>["db"];

export type WorkPreparationBoundary = Readonly<{
  preparationWorldTime: Date;
  shiftStartWorldTime: Date;
  travelDurationWorldMinutes: number;
}>;

export class WorkPreparationWakeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkPreparationWakeError";
  }
}

function nextWorkShiftStart(worldTime: Date): Date {
  const shift = getWorkShift(worldTime);
  const shiftStart = new Date(shift.start);
  if (
    worldTime.getTime() < shiftStart.getTime() &&
    worldTime.getUTCDay() > 0 &&
    worldTime.getUTCDay() < 6
  ) {
    return shiftStart;
  }

  let dayStart = Date.UTC(
    worldTime.getUTCFullYear(),
    worldTime.getUTCMonth(),
    worldTime.getUTCDate() + 1,
  );
  while (
    new Date(dayStart).getUTCDay() === 0 ||
    new Date(dayStart).getUTCDay() === 6
  ) {
    dayStart += 24 * 60 * 60_000;
  }
  return new Date(dayStart + 9 * 60 * 60_000);
}

export function deriveWorkPreparationBoundary(
  input: Readonly<{
    currentWorldTime: Date;
    currentLocationKind: string;
    workplaceKind: string;
  }>,
): WorkPreparationBoundary {
  if (Number.isNaN(input.currentWorldTime.getTime())) {
    throw new WorkPreparationWakeError(
      "Work preparation requires valid World Time",
    );
  }
  const shiftStartWorldTime = nextWorkShiftStart(input.currentWorldTime);
  const travelDurationWorldMinutes = getTravelDurationWorldMinutes(
    input.currentLocationKind,
    input.workplaceKind,
  );
  return {
    preparationWorldTime: new Date(
      shiftStartWorldTime.getTime() - travelDurationWorldMinutes * 60_000,
    ),
    shiftStartWorldTime,
    travelDurationWorldMinutes,
  };
}

function locationKind(worldId: string, locationId: string): string | null {
  return (
    getFirstStreetLocationFixtures(worldId).find(({ id }) => id === locationId)
      ?.kind ?? null
  );
}

export async function registerNextWorkPreparationWakeInTransaction(
  transaction: ScheduledWakeTransaction,
  input: Readonly<{
    worldId: string;
    worldSeed: string;
    worldTime: Date;
    sourceWorldSeq: bigint;
    residentId: string;
    sourceStateVersion: number;
    decisionEpoch?: number;
  }>,
): Promise<ScheduledWakeRegistration | null> {
  const [runtime] = await transaction
    .select({ currentLocationId: residentRuntimeStates.currentLocationId })
    .from(residentRuntimeStates)
    .where(
      and(
        eq(residentRuntimeStates.worldId, input.worldId),
        eq(residentRuntimeStates.residentId, input.residentId),
      ),
    )
    .for("update");
  const resident = generateResidentSeed({
    worldId: input.worldId,
    seed: input.worldSeed,
  }).residents.find(({ residentId }) => residentId === input.residentId);
  if (
    !resident ||
    resident.employment.status !== "EMPLOYED" ||
    !resident.employment.workplaceId ||
    !runtime
  ) {
    return null;
  }
  if (runtime.currentLocationId === resident.employment.workplaceId) {
    return null;
  }

  const currentKind = locationKind(input.worldId, runtime.currentLocationId);
  const workplaceKind = locationKind(
    input.worldId,
    resident.employment.workplaceId,
  );
  if (!currentKind || !workplaceKind) {
    throw new WorkPreparationWakeError(
      "Work preparation references an unknown route location",
    );
  }
  const boundary = deriveWorkPreparationBoundary({
    currentWorldTime: input.worldTime,
    currentLocationKind: currentKind,
    workplaceKind,
  });
  return registerWorkPreparationWakeInTransaction(transaction, {
    worldId: input.worldId,
    worldSeed: input.worldSeed,
    preparationWorldTime: boundary.preparationWorldTime,
    shiftStartWorldTime: boundary.shiftStartWorldTime,
    sourceWorldSeq: input.sourceWorldSeq,
    residentId: input.residentId,
    sourceStateVersion: input.sourceStateVersion,
    decisionEpoch: input.decisionEpoch,
  });
}

export async function registerNextWorkPreparationWakes(
  database: WorkPreparationWakeDatabase,
  input: Readonly<{ worldId: string; decisionEpoch?: number }>,
): Promise<readonly ScheduledWakeRegistration[]> {
  return database.transaction(async (transaction) => {
    const [world] = await transaction
      .select({
        id: worlds.id,
        seed: worlds.seed,
        worldTime: worlds.worldTime,
        worldSeq: worlds.worldSeq,
      })
      .from(worlds)
      .where(eq(worlds.id, input.worldId))
      .for("update");
    if (!world) {
      throw new WorkPreparationWakeError(
        `World ${input.worldId} was not found`,
      );
    }

    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    })
      .residents.filter(({ employment }) => employment.status === "EMPLOYED")
      .sort((left, right) => left.residentId.localeCompare(right.residentId));
    const runtimeRows = await transaction
      .select({
        residentId: residentRuntimeStates.residentId,
        stateVersion: residentRuntimeStates.stateVersion,
      })
      .from(residentRuntimeStates)
      .where(eq(residentRuntimeStates.worldId, world.id));
    const versions = new Map(
      runtimeRows.map((row) => [row.residentId, row.stateVersion]),
    );
    const registrations: ScheduledWakeRegistration[] = [];
    for (const resident of residents) {
      const sourceStateVersion = versions.get(resident.residentId);
      if (sourceStateVersion === undefined) continue;
      const boundaryWake = await registerNextWorkBoundaryWakeInTransaction(
        transaction,
        {
          worldId: world.id,
          worldSeed: world.seed,
          worldTime: world.worldTime,
          sourceWorldSeq: world.worldSeq,
          residentId: resident.residentId,
          sourceStateVersion,
          decisionEpoch: input.decisionEpoch,
        },
      );
      if (boundaryWake) registrations.push(boundaryWake);
      const preparationWake =
        await registerNextWorkPreparationWakeInTransaction(transaction, {
          worldId: world.id,
          worldSeed: world.seed,
          worldTime: world.worldTime,
          sourceWorldSeq: world.worldSeq,
          residentId: resident.residentId,
          sourceStateVersion,
          decisionEpoch: input.decisionEpoch,
        });
      if (preparationWake) registrations.push(preparationWake);
    }
    return registrations;
  });
}
