import { createHash } from "node:crypto";
import type {
  ActionRequest,
  KernelActionOutcome,
  ReplanDecision,
} from "@mirror/contracts";
import {
  applySleepCompletionToNeedAnchor,
  evaluateNeeds,
  type NeedAnchor,
  type NeedState,
  type ResidentNeedProfile,
} from "./needs.js";
import {
  evaluateGoals,
  type ActiveGoal,
  type GoalEvaluation,
  type GoalWorkObligation,
} from "./goals.js";
import {
  decideReplan,
  INITIAL_DECISION_ATTEMPT_BUDGET,
} from "./replan-policy.js";
import {
  evaluateRuleDecision,
  type DecisionLocationRef,
  type RuleDecision,
} from "./rule-decision.js";

export const ACTION_LOOP_POLICY_VERSION = "m3-action-loop-v1" as const;

export type ActionLoopWorldState = Readonly<{
  id: string;
  seed: string;
  status: "RUNNING" | "PAUSED" | "MAINTENANCE";
  worldTime: Date;
  worldSeq: string;
}>;

export type ActionLoopObservation = Readonly<{
  residentId: string;
  actorId: string;
  homeLocationId: string;
  workplaceId: string | null;
  stateVersion?: number;
  locationId: string;
  locationKind: DecisionLocationRef["kind"];
  activityKind: "IDLE" | "TRAVELING" | "SLEEPING";
  obligation?: GoalWorkObligation;
  profile: Readonly<{
    personality: Readonly<{
      conscientiousness: number;
      extraversion: number;
    }>;
    routine: Readonly<{
      sleepPhase: "EARLY" | "STANDARD" | "LATE";
      mealPhase: "EARLY" | "STANDARD" | "LATE";
      socialWindow: "MORNING" | "AFTERNOON" | "EVENING";
      flexibility?: number;
    }>;
  }>;
}>;

export type ActionSubmissionDisposition =
  | "EXECUTED"
  | "REUSED"
  | "DUPLICATE"
  | "IDEMPOTENCY_CONFLICT"
  | "TRANSPORT_ERROR";

export type ActionSubmissionResult = Readonly<{
  disposition: ActionSubmissionDisposition;
  request: ActionRequest;
  outcome: KernelActionOutcome | null;
  errorCode?: string;
}>;

export type ActionSubmissionPort = {
  submit(request: ActionRequest): Promise<ActionSubmissionResult>;
};

export type NeedAnchorStore = {
  get(residentId: string): NeedAnchor | undefined;
  set(residentId: string, anchor: NeedAnchor): void;
};

export function createResidentNeedAnchorStore(): {
  store: NeedAnchorStore;
  seed(residentId: string, anchor: NeedAnchor): void;
} {
  const map = new Map<string, NeedAnchor>();
  return {
    store: {
      get: (residentId) => map.get(residentId),
      set: (residentId, anchor) => {
        map.set(residentId, anchor);
      },
    },
    seed(residentId, anchor) {
      map.set(residentId, anchor);
    },
  };
}

export type ActionLoopStepInput = Readonly<{
  world: ActionLoopWorldState;
  observation: ActionLoopObservation;
  locations: readonly DecisionLocationRef[];
  needAnchors: NeedAnchorStore;
  submission: ActionSubmissionPort;
  activeGoal?: ActiveGoal;
  decisionEpoch?: number;
  seed?: string;
}>;

export type ActionLoopStepResult = Readonly<{
  policyVersion: string;
  worldId: string;
  residentId: string;
  worldTime: Date;
  sourceWorldSeq: string;
  decisionEpoch: number;
  needState: NeedState;
  goalEvaluation: GoalEvaluation;
  decision: RuleDecision;
  submission: ActionSubmissionResult | null;
  replan: ReplanDecision | null;
  nextNeedAnchor: NeedAnchor;
}>;

function defaultAnchor(worldTime: Date): NeedAnchor {
  return {
    worldTime: new Date(worldTime.getTime()),
    activity: "AWAKE",
    hungerPressure: 20,
    restPressure: 20,
    socialPressure: 20,
  };
}

function ensureAnchor(
  store: NeedAnchorStore,
  residentId: string,
  worldTime: Date,
): NeedAnchor {
  const existing = store.get(residentId);
  if (existing) return existing;
  const created = defaultAnchor(worldTime);
  store.set(residentId, created);
  return created;
}

function uuidFromDigest(digest: string): string {
  const hex = createHash("sha256")
    .update(digest)
    .digest("hex")
    .slice(0, 32)
    .toLowerCase();
  const withVersion = `${hex.slice(0, 12)}4${hex.slice(13, 16)}`;
  const variantNibble = ((Number.parseInt(hex[16] ?? "0", 16) & 0x3) | 0x8)
    .toString(16)
    .toLowerCase();
  const withVariant = `${variantNibble}${hex.slice(17, 32)}`;
  return [
    withVersion.slice(0, 8),
    withVersion.slice(8, 12),
    withVersion.slice(12, 16),
    withVariant.slice(0, 4),
    withVariant.slice(4, 16),
  ].join("-");
}

function toActionRequest(
  decision: RuleDecision,
  observation: ActionLoopObservation,
  world: ActionLoopWorldState,
): ActionRequest {
  const draft = decision.actionRequestDraft;
  if (!draft) {
    throw new Error("Cannot build ActionRequest without a decision draft");
  }
  const id = uuidFromDigest(draft.stableRequestSeed);
  const base = {
    id,
    worldId: world.id,
    actorId: observation.actorId,
    requestedBy: "RULE" as const,
    idempotencyKey: `m3-t04|${draft.stableIdempotencySeed}`,
    ...(typeof draft.expectedActorVersion === "number"
      ? { expectedActorVersion: draft.expectedActorVersion }
      : {}),
    requestedAtWorldTime: world.worldTime.toISOString(),
    traceId: `m3-t04|${draft.stableRequestSeed}`,
  };
  if (draft.actionType === "MOVE" && draft.parameters.actionType === "MOVE") {
    return {
      ...base,
      actionType: "MOVE",
      parameters: { destinationId: draft.parameters.destinationId },
    };
  }
  return {
    ...base,
    actionType: "SLEEP",
    parameters: {},
  };
}

export async function runResidentActionLoopStep(
  input: ActionLoopStepInput,
): Promise<ActionLoopStepResult> {
  const world = input.world;
  const observation = input.observation;
  const decisionEpoch = input.decisionEpoch ?? 0;
  const seed = input.seed ?? world.seed;
  const needProfile: ResidentNeedProfile = {
    residentId: observation.residentId,
    profile: {
      personality: {
        extraversion: observation.profile.personality.extraversion,
      },
      routine: {
        flexibility: observation.profile.routine.flexibility ?? 0.5,
      },
    },
  };

  const anchor = ensureAnchor(
    input.needAnchors,
    observation.residentId,
    world.worldTime,
  );

  const needState = evaluateNeeds({
    worldId: world.id,
    currentWorldTime: world.worldTime,
    status: world.status,
    resident: needProfile,
    anchor,
  });

  const goalEvaluation = evaluateGoals({
    worldId: world.id,
    seed,
    currentWorldTime: world.worldTime,
    status: world.status,
    resident: {
      residentId: observation.residentId,
      worldId: world.id,
      homeLocationId: observation.homeLocationId,
      profile: {
        personality: {
          conscientiousness: observation.profile.personality.conscientiousness,
          extraversion: observation.profile.personality.extraversion,
        },
        routine: {
          sleepPhase: observation.profile.routine.sleepPhase,
          mealPhase: observation.profile.routine.mealPhase,
          socialWindow: observation.profile.routine.socialWindow,
        },
      },
      employment: {
        status: observation.workplaceId ? "EMPLOYED" : "UNEMPLOYED",
        workplaceId: observation.workplaceId,
      },
    },
    needs: needState,
    ...(observation.obligation ? { obligation: observation.obligation } : {}),
    ...(input.activeGoal ? { activeGoal: input.activeGoal } : {}),
  });

  const decision = evaluateRuleDecision({
    worldId: world.id,
    seed,
    currentWorldTime: world.worldTime,
    status: world.status,
    sourceWorldSeq: world.worldSeq,
    decisionEpoch,
    resident: {
      residentId: observation.residentId,
      worldId: world.id,
      actorId: observation.actorId,
      homeLocationId: observation.homeLocationId,
      workplaceId: observation.workplaceId,
      ...(typeof observation.stateVersion === "number"
        ? { stateVersion: observation.stateVersion }
        : {}),
    },
    observation: {
      locationId: observation.locationId,
      locationKind: observation.locationKind,
      activity: { kind: observation.activityKind },
      ...(observation.obligation
        ? {
            workObligation: {
              status: observation.obligation.status,
              workplaceId: observation.obligation.workplaceId,
            },
          }
        : {}),
    },
    needs: needState,
    selectedGoal: goalEvaluation.selectedGoal,
    locations: input.locations,
  });

  let submission: ActionSubmissionResult | null = null;
  let replan: ReplanDecision | null = null;

  if (decision.actionRequestDraft) {
    const request = toActionRequest(decision, observation, world);
    submission = await input.submission.submit(request);
    replan = decideReplan({
      currentWorldTime: world.worldTime.toISOString(),
      budget: INITIAL_DECISION_ATTEMPT_BUDGET,
      alternativeCandidateAvailable: decision.feasibleCandidates.length > 1,
      signal:
        submission.outcome !== null
          ? {
              kind: "KERNEL_OUTCOME",
              disposition:
                submission.disposition === "REUSED" ? "REUSED" : "EXECUTED",
              outcome: submission.outcome,
            }
          : {
              kind: "TIMED_OUT",
              requestId: request.id,
              worldId: world.id,
              idempotencyKey: request.idempotencyKey,
              reconciliation: { status: "UNAVAILABLE" },
            },
    });
  } else {
    const idleRequestId = uuidFromDigest(
      `idle|${world.id}|${observation.residentId}|${world.worldTime.toISOString()}|${decisionEpoch}`,
    );
    replan = decideReplan({
      currentWorldTime: world.worldTime.toISOString(),
      budget: INITIAL_DECISION_ATTEMPT_BUDGET,
      alternativeCandidateAvailable: false,
      signal: {
        kind: "NOT_DUE",
        requestId: idleRequestId,
        worldId: world.id,
        dueAtWorldTime: new Date(
          world.worldTime.getTime() +
            decision.idleReconsiderationWorldMinutes * 60_000,
        ).toISOString(),
      },
    });
  }

  input.needAnchors.set(observation.residentId, anchor);

  return {
    policyVersion: ACTION_LOOP_POLICY_VERSION,
    worldId: world.id,
    residentId: observation.residentId,
    worldTime: world.worldTime,
    sourceWorldSeq: world.worldSeq,
    decisionEpoch,
    needState,
    goalEvaluation,
    decision,
    submission,
    replan,
    nextNeedAnchor: anchor,
  };
}

export type ApplySleepCompletionInput = Readonly<{
  worldId: string;
  resident: ResidentNeedProfile;
  needAnchors: NeedAnchorStore;
  anchor: NeedAnchor;
  sleepStartedAtWorldTime: Date;
  sleepCompletedAtWorldTime: Date;
}>;

export function applyCompletedSleepToAnchors(
  input: ApplySleepCompletionInput,
): NeedAnchor {
  const next = applySleepCompletionToNeedAnchor({
    worldId: input.worldId,
    resident: input.resident,
    anchor: input.anchor,
    sleepStartedAtWorldTime: input.sleepStartedAtWorldTime,
    sleepCompletedAtWorldTime: input.sleepCompletedAtWorldTime,
  });
  input.needAnchors.set(input.resident.residentId, next);
  return next;
}
