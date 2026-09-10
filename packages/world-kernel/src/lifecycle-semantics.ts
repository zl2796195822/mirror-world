import { addWorldMinutes } from "./action-semantics.js";

export const LIFECYCLE_SEMANTICS_POLICY_VERSION =
  "m3-lifecycle-semantics-v1" as const;
export const NEED_EFFECTS_POLICY_VERSION = "m3-need-effects-v1" as const;
export const EAT_DURATION_WORLD_MINUTES = 30 as const;
export const TALK_DURATION_WORLD_MINUTES = 15 as const;
export const WORK_ATTENDANCE_MINUTES = 480 as const;

export type WorkShiftStatus = "NOT_DUE" | "DUE" | "LATE";
export type WorkShift = Readonly<{
  status: WorkShiftStatus;
  start: string;
  end: string;
}>;

export function getWorkShift(worldTime: Date): WorkShift {
  if (Number.isNaN(worldTime.getTime())) {
    throw new Error("World time must be valid");
  }
  const weekday = worldTime.getUTCDay();
  const dayStart = Date.UTC(
    worldTime.getUTCFullYear(),
    worldTime.getUTCMonth(),
    worldTime.getUTCDate(),
  );
  const start = new Date(dayStart + 9 * 60 * 60_000);
  const end = new Date(dayStart + 17 * 60 * 60_000);
  if (weekday === 0 || weekday === 6) {
    return {
      status: "NOT_DUE",
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }
  return {
    status:
      worldTime.getTime() < start.getTime()
        ? "NOT_DUE"
        : worldTime.getTime() < end.getTime()
          ? "DUE"
          : "LATE",
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function workObligationKey(
  residentId: string,
  startsAt: string,
): string {
  return `${residentId}|${new Date(startsAt).toISOString()}`;
}

export function lifecycleDueAt(
  startedAt: Date,
  durationWorldMinutes: number,
): Date {
  return addWorldMinutes(startedAt, durationWorldMinutes);
}
