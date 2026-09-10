import {
  readDueActivities,
  readNextActivityDueWorldTime,
  readDueScheduledWakes,
  readNextScheduledWakeWorldTime,
  registerScheduledWake,
  createDb,
  type SimulationDriverLease,
  assertSimulationDriverFence,
  worlds,
} from "@mirror/db";
import {
  parseSchedulerStepResult,
  parseSchedulerWorkItem,
  SCHEDULER_POLICY_VERSION,
  type DueActivityReadPort,
  type KernelActionOutcome,
  type ScheduledWakeReadPort,
  type ScheduledWakeRegistration,
  type SchedulerFailureItem,
  type SchedulerStepResult,
  type SchedulerWorkItem,
  type DueActivity,
} from "@mirror/contracts";
import { eq } from "drizzle-orm";
import { addWorldMinutes } from "./action-semantics.js";
import { advanceWorldTimeTo } from "./world-clock-store.js";
import {
  completeResidentAction,
  ResidentActionExecutorError,
} from "./resident-action-executor.js";
import {
  orderSchedulerWorkItems,
  SCHEDULER_POLICY,
} from "./scheduler-order.js";

export type SimulationDriverDatabase = ReturnType<typeof createDb>["db"];

export type SimulationDriverOptions = Readonly<{
  maxWorkItemsPerStep?: number;
  lease?: SimulationDriverLease;
}>;

export type ProcessDueWorkOptions = Readonly<{
  maxWorkItems?: number;
  fromWorldTime?: Date;
  fromWorldSeq?: bigint;
}>;

export class SimulationDriverError extends Error {
  constructor(
    public readonly code:
      | "WORLD_NOT_FOUND"
      | "INVALID_TARGET"
      | "INVALID_WORK_LIMIT",
    message: string,
  ) {
    super(message);
    this.name = "SimulationDriverError";
  }
}

function assertValidDate(value: Date, name: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new SimulationDriverError("INVALID_TARGET", `${name} is invalid`);
  }
}

function assertWorldMinutes(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new SimulationDriverError(
      "INVALID_TARGET",
      "world minutes must be a non-negative integer",
    );
  }
}

function validateWorkLimit(value: number): number {
  if (
    !Number.isInteger(value) ||
    value <= 0 ||
    value > SCHEDULER_POLICY.maxWorkItemsPerStep
  ) {
    throw new SimulationDriverError(
      "INVALID_WORK_LIMIT",
      `maxWorkItems must be between 1 and ${SCHEDULER_POLICY.maxWorkItemsPerStep}`,
    );
  }
  return value;
}

function activityWorkItem(activity: DueActivity): SchedulerWorkItem {
  return parseSchedulerWorkItem({
    policyVersion: SCHEDULER_POLICY.version,
    worldId: activity.worldId,
    residentId: activity.residentId,
    workType: "ACTIVITY_COMPLETION",
    wakeReason: "ACTIVITY_COMPLETED",
    dueWorldTime: activity.dueWorldTime.toISOString(),
    activityInstanceId: activity.activityInstanceId,
    sourceStateVersion: activity.stateVersion,
    sourceWorldSeq: activity.sourceWorldSeq,
    decisionEpoch: 0,
  });
}

function wakeWorkItem(wake: ScheduledWakeRegistration): SchedulerWorkItem {
  return parseSchedulerWorkItem({
    policyVersion: wake.policyVersion,
    worldId: wake.worldId,
    residentId: wake.residentId,
    workType: "DECISION_WAKE",
    wakeReason: wake.wakeReason,
    dueWorldTime: wake.dueWorldTime,
    activityInstanceId: null,
    wakeId: wake.wakeId,
    sourceStateVersion: wake.sourceStateVersion,
    sourceWorldSeq: wake.sourceWorldSeq,
    decisionEpoch: wake.decisionEpoch,
  });
}

function completionWakeItem(
  workItem: SchedulerWorkItem,
  outcome: KernelActionOutcome,
): SchedulerWorkItem {
  if (outcome.status !== "COMMITTED" || outcome.worldSeqEnd === null) {
    throw new SimulationDriverError(
      "INVALID_TARGET",
      "A completed activity must have a committed outcome sequence",
    );
  }
  return parseSchedulerWorkItem({
    policyVersion: workItem.policyVersion,
    worldId: workItem.worldId,
    residentId: workItem.residentId,
    workType: "DECISION_WAKE",
    wakeReason: "ACTIVITY_COMPLETED",
    dueWorldTime: workItem.dueWorldTime,
    activityInstanceId: null,
    wakeId: null,
    sourceStateVersion: workItem.sourceStateVersion + 1,
    sourceWorldSeq: outcome.worldSeqEnd,
    decisionEpoch: workItem.decisionEpoch,
  });
}

function failureItem(
  workItem: SchedulerWorkItem,
  code: SchedulerFailureItem["code"],
  retryable: boolean,
): SchedulerFailureItem {
  return {
    policyVersion: workItem.policyVersion,
    workType: workItem.workType,
    worldId: workItem.worldId,
    residentId: workItem.residentId,
    activityInstanceId:
      workItem.workType === "ACTIVITY_COMPLETION"
        ? workItem.activityInstanceId
        : null,
    dueWorldTime: workItem.dueWorldTime,
    code,
    retryable,
  };
}

function errorFailureCode(error: unknown): {
  code: SchedulerFailureItem["code"];
  retryable: boolean;
} {
  if (
    error instanceof ResidentActionExecutorError &&
    error.code === "WORLD_NOT_FOUND"
  ) {
    return { code: "WORLD_NOT_RUNNING", retryable: true };
  }
  if (
    error instanceof ResidentActionExecutorError &&
    error.code === "INVALID_COMPLETION"
  ) {
    return { code: "INVALID_WORK_ITEM", retryable: false };
  }
  if (
    error instanceof ResidentActionExecutorError &&
    error.code === "RUNTIME_STATE_UNAVAILABLE"
  ) {
    return { code: "STALE_STATE", retryable: false };
  }
  return { code: "EXECUTION_ERROR", retryable: true };
}

function minimumDate(values: readonly (Date | null)[]): Date | null {
  const valid = values.filter((value): value is Date => value !== null);
  if (valid.length === 0) return null;
  return new Date(Math.min(...valid.map((value) => value.getTime())));
}

export class DeterministicSimulationDriver
  implements DueActivityReadPort, ScheduledWakeReadPort
{
  private readonly maxWorkItemsPerStep: number;
  private readonly lease?: SimulationDriverLease;

  constructor(
    private readonly database: SimulationDriverDatabase,
    options: SimulationDriverOptions = {},
  ) {
    this.maxWorkItemsPerStep = validateWorkLimit(
      options.maxWorkItemsPerStep ?? SCHEDULER_POLICY.maxWorkItemsPerStep,
    );
    this.lease = options.lease;
  }

  private async assertLease(worldId: string): Promise<void> {
    if (!this.lease) return;
    if (this.lease.worldId !== worldId) {
      throw new SimulationDriverError(
        "WORLD_NOT_FOUND",
        "Simulation driver lease belongs to another world",
      );
    }
    await assertSimulationDriverFence(this.database, {
      worldId,
      fenceToken: this.lease.fenceToken,
    });
  }

  async listDueActivities(input: {
    worldId: string;
    targetWorldTime: Date;
    limit: number;
  }) {
    return readDueActivities(this.database, input);
  }

  async listDueScheduledWakes(input: {
    worldId: string;
    targetWorldTime: Date;
    limit: number;
  }) {
    return readDueScheduledWakes(this.database, input);
  }

  async registerScheduledWake(input: ScheduledWakeRegistration) {
    return registerScheduledWake(this.database, input);
  }

  private async readWorld(worldId: string) {
    const [world] = await this.database
      .select()
      .from(worlds)
      .where(eq(worlds.id, worldId));
    if (!world) {
      throw new SimulationDriverError(
        "WORLD_NOT_FOUND",
        `World ${worldId} was not found`,
      );
    }
    return world;
  }

  async collectDueWork(worldId: string): Promise<readonly SchedulerWorkItem[]> {
    const world = await this.readWorld(worldId);
    if (world.status !== "RUNNING") return [];

    const activities = await this.listDueActivities({
      worldId,
      targetWorldTime: world.worldTime,
      limit: this.maxWorkItemsPerStep,
    });
    const activityItems = orderSchedulerWorkItems(
      activities.map(activityWorkItem),
    );
    const remaining = this.maxWorkItemsPerStep - activityItems.length;
    const wakeItems =
      remaining > 0
        ? orderSchedulerWorkItems(
            (
              await this.listDueScheduledWakes({
                worldId,
                targetWorldTime: world.worldTime,
                limit: remaining,
              })
            ).map(wakeWorkItem),
          )
        : [];
    return [...activityItems, ...wakeItems];
  }

  async processDueWork(
    worldId: string,
    options: ProcessDueWorkOptions = {},
  ): Promise<SchedulerStepResult> {
    await this.assertLease(worldId);
    const world = await this.readWorld(worldId);
    const maxWorkItems = validateWorkLimit(
      options.maxWorkItems ?? this.maxWorkItemsPerStep,
    );
    const fromWorldTime = options.fromWorldTime ?? world.worldTime;
    const fromWorldSeq = options.fromWorldSeq ?? world.worldSeq;
    assertValidDate(fromWorldTime, "fromWorldTime");

    if (world.status !== "RUNNING") {
      return this.buildStepResult({
        world,
        fromWorldTime,
        fromWorldSeq,
        processedWork: 0,
        completedActivities: 0,
        completionOutcomes: [],
        wakeItems: [],
        failureItems: [],
        nextDueWorldTime: null,
      });
    }

    const dueActivities = await this.listDueActivities({
      worldId,
      targetWorldTime: world.worldTime,
      limit: maxWorkItems,
    });
    const activityItems = orderSchedulerWorkItems(
      dueActivities.map(activityWorkItem),
    );
    const completionOutcomes: KernelActionOutcome[] = [];
    const wakeItems: SchedulerWorkItem[] = [];
    const failureItems: SchedulerFailureItem[] = [];
    let completedActivities = 0;
    let processedWork = 0;

    for (const workItem of activityItems) {
      if (workItem.workType !== "ACTIVITY_COMPLETION") continue;
      processedWork += 1;
      try {
        const completion = await completeResidentAction(this.database, {
          worldId,
          actionRequestId: workItem.activityInstanceId,
          expectedStateVersion: workItem.sourceStateVersion,
          fenceToken: this.lease?.fenceToken,
        });
        completionOutcomes.push(completion.outcome);
        if (completion.disposition === "EXECUTED") {
          completedActivities += 1;
          wakeItems.push(completionWakeItem(workItem, completion.outcome));
        } else if (completion.disposition === "NOT_DUE") {
          failureItems.push(failureItem(workItem, "STALE_STATE", true));
        } else if (completion.disposition === "REJECTED") {
          failureItems.push(
            failureItem(
              workItem,
              completion.reasonCode === "WORLD_NOT_RUNNING"
                ? "WORLD_NOT_RUNNING"
                : "EXECUTION_ERROR",
              completion.reasonCode === "WORLD_NOT_RUNNING",
            ),
          );
        }
      } catch (error) {
        const failure = errorFailureCode(error);
        failureItems.push(
          failureItem(workItem, failure.code, failure.retryable),
        );
      }
    }

    const remaining = maxWorkItems - processedWork;
    if (remaining > 0) {
      const registeredWakes = await this.listDueScheduledWakes({
        worldId,
        targetWorldTime: world.worldTime,
        limit: remaining,
      });
      for (const wake of orderSchedulerWorkItems(
        registeredWakes.map(wakeWorkItem),
      )) {
        processedWork += 1;
        wakeItems.push(wake);
      }
    }

    const [nextActivity, nextWake] = [
      await readNextActivityDueWorldTime(this.database, { worldId }),
      await readNextScheduledWakeWorldTime(this.database, { worldId }),
    ];
    const latestWorld = await this.readWorld(worldId);
    return this.buildStepResult({
      world: latestWorld,
      fromWorldTime,
      fromWorldSeq,
      processedWork,
      completedActivities,
      completionOutcomes,
      wakeItems: orderSchedulerWorkItems(wakeItems),
      failureItems,
      nextDueWorldTime: minimumDate([nextActivity, nextWake]),
    });
  }

  processDueActivities(
    worldId: string,
    options: ProcessDueWorkOptions = {},
  ): Promise<SchedulerStepResult> {
    return this.processDueWork(worldId, options);
  }

  async runUntil(
    worldId: string,
    targetWorldTime: Date,
  ): Promise<SchedulerStepResult> {
    await this.assertLease(worldId);
    assertValidDate(targetWorldTime, "targetWorldTime");
    const initialWorld = await this.readWorld(worldId);
    const advance = await advanceWorldTimeTo(
      this.database,
      worldId,
      targetWorldTime,
      this.lease?.fenceToken,
    );
    if (advance.disposition === "BLOCKED") {
      return this.buildStepResult({
        world: advance.world,
        fromWorldTime: initialWorld.worldTime,
        fromWorldSeq: initialWorld.worldSeq,
        processedWork: 0,
        completedActivities: 0,
        completionOutcomes: [],
        wakeItems: [],
        failureItems: [],
        nextDueWorldTime: null,
      });
    }
    return this.processDueWork(worldId, {
      fromWorldTime: initialWorld.worldTime,
      fromWorldSeq: initialWorld.worldSeq,
    });
  }

  advanceWorldTo(worldId: string, targetWorldTime: Date) {
    return this.runUntil(worldId, targetWorldTime);
  }

  async advanceWorldBy(
    worldId: string,
    worldMinutes: number,
  ): Promise<SchedulerStepResult> {
    assertWorldMinutes(worldMinutes);
    const world = await this.readWorld(worldId);
    return this.runUntil(
      worldId,
      addWorldMinutes(world.worldTime, worldMinutes),
    );
  }

  async runForDays(
    worldId: string,
    days: number,
  ): Promise<SchedulerStepResult> {
    assertWorldMinutes(days);
    return this.advanceWorldBy(worldId, days * 24 * 60);
  }

  private buildStepResult(input: {
    world: typeof worlds.$inferSelect;
    fromWorldTime: Date;
    fromWorldSeq: bigint;
    processedWork: number;
    completedActivities: number;
    completionOutcomes: readonly KernelActionOutcome[];
    wakeItems: readonly SchedulerWorkItem[];
    failureItems: readonly SchedulerFailureItem[];
    nextDueWorldTime: Date | null;
  }): SchedulerStepResult {
    return parseSchedulerStepResult({
      policyVersion: SCHEDULER_POLICY_VERSION,
      worldId: input.world.id,
      fromWorldTime: input.fromWorldTime.toISOString(),
      toWorldTime: input.world.worldTime.toISOString(),
      fromWorldSeq: input.fromWorldSeq.toString(),
      toWorldSeq: input.world.worldSeq.toString(),
      processedWork: input.processedWork,
      completedActivities: input.completedActivities,
      completionOutcomes: input.completionOutcomes,
      wakeItems: input.wakeItems,
      failureItems: input.failureItems,
      nextDueWorldTime: input.nextDueWorldTime?.toISOString() ?? null,
    });
  }
}

export function createDeterministicSimulationDriver(
  database: SimulationDriverDatabase,
  options: SimulationDriverOptions = {},
): DeterministicSimulationDriver {
  return new DeterministicSimulationDriver(database, options);
}
