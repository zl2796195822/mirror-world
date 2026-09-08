export const WORLD_CLOCK_SCALES = [1, 10, 100] as const;
export type WorldClockScale = (typeof WORLD_CLOCK_SCALES)[number];
export type WorldClockStatus = "RUNNING" | "PAUSED" | "MAINTENANCE";
export type WorldClockEnvironment = "development" | "production";

export type WorldClockInput = {
  worldTime: Date;
  clockAnchorAt: Date;
  status: WorldClockStatus;
  timeScale: WorldClockScale;
};

export type WorldClockOutput = WorldClockInput;

function assertDate(value: Date, name: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${name} must be a valid date`);
  }
}

function assertScale(value: number): asserts value is WorldClockScale {
  if (!WORLD_CLOCK_SCALES.includes(value as WorldClockScale)) {
    throw new Error("timeScale must be 1, 10, or 100");
  }
}

function cloneDate(value: Date): Date {
  return new Date(value.getTime());
}

export function advanceWorldClock(
  input: WorldClockInput,
  now: Date,
  environment: WorldClockEnvironment = "development",
): WorldClockOutput {
  assertDate(input.worldTime, "worldTime");
  assertDate(input.clockAnchorAt, "clockAnchorAt");
  assertDate(now, "now");
  assertScale(input.timeScale);

  const effectiveScale = environment === "production" ? 1 : input.timeScale;
  const effectiveNow = Math.max(now.getTime(), input.clockAnchorAt.getTime());
  const elapsedMilliseconds = effectiveNow - input.clockAnchorAt.getTime();

  if (input.status !== "RUNNING") {
    return {
      ...input,
      timeScale: effectiveScale,
      worldTime: cloneDate(input.worldTime),
      clockAnchorAt: new Date(effectiveNow),
    };
  }

  const worldDeltaMilliseconds = elapsedMilliseconds * effectiveScale;
  const nextWorldTime = Math.max(
    input.worldTime.getTime(),
    input.worldTime.getTime() + worldDeltaMilliseconds,
  );

  return {
    ...input,
    timeScale: effectiveScale,
    worldTime: new Date(nextWorldTime),
    clockAnchorAt: new Date(effectiveNow),
  };
}

export function applyWorldClockControl(
  input: WorldClockInput,
  control: { status?: WorldClockStatus; timeScale?: WorldClockScale },
  now: Date,
  environment: WorldClockEnvironment = "development",
): WorldClockOutput {
  assertDate(now, "now");
  if (environment === "production") {
    if (control.timeScale !== undefined && control.timeScale !== 1) {
      throw new Error("production timeScale must remain 1");
    }
    throw new Error("world clock control is disabled in production");
  }

  const synchronized = advanceWorldClock(input, now, environment);
  const nextStatus = control.status ?? synchronized.status;
  const nextScale = control.timeScale ?? synchronized.timeScale;
  assertScale(nextScale);

  return {
    ...synchronized,
    status: nextStatus,
    timeScale: nextScale,
    clockAnchorAt: cloneDate(now),
  };
}
