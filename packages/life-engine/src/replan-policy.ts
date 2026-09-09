import {
  REPLAN_POLICY_VERSION,
  replanDecisionSchema,
  replanPolicyInputSchema,
  type ActionRecoverySignal,
  type DecisionAttemptBudget,
  type FailureClass,
  type ReplanDecision,
  type ReplanPolicyInput,
} from "@mirror/contracts";

export const REPLAN_POLICY_V1 = {
  version: REPLAN_POLICY_VERSION,
  maxSubmissionAttempts: 2,
  maxConflictRecoveries: 2,
  maxReplans: 2,
  initialReconsiderationDelayWorldMinutes: 2,
  maximumReconsiderationDelayWorldMinutes: 60,
} as const;

export const INITIAL_DECISION_ATTEMPT_BUDGET: DecisionAttemptBudget = {
  submissionAttempts: 0,
  conflictRecoveries: 0,
  replans: 0,
};

export type FailureClassification = Readonly<{
  failureClass: FailureClass;
  reasonCode: string | null;
}>;

function budgetWith(
  budget: DecisionAttemptBudget,
  changes: Partial<DecisionAttemptBudget>,
): DecisionAttemptBudget {
  return { ...budget, ...changes };
}

function classification(
  failureClass: FailureClass,
  reasonCode: string | null,
): FailureClassification {
  return { failureClass, reasonCode };
}

function classifyKernelOutcome(
  signal: Extract<ActionRecoverySignal, { kind: "KERNEL_OUTCOME" }>,
): FailureClassification {
  if (signal.outcome.status === "COMMITTED") {
    return classification("SUCCESS", null);
  }
  if (signal.outcome.status === "CONFLICT") {
    return classification("STALE_STATE", signal.outcome.reasonCode);
  }

  switch (signal.outcome.reasonCode) {
    case "KERNEL_ACTOR_NOT_FOUND":
    case "KERNEL_INVALID_ACTION":
    case "KERNEL_INVALID_LOCATION":
      return classification("PERMANENT_INVALID", signal.outcome.reasonCode);
    case "KERNEL_PERMISSION_DENIED":
      return classification("AUTHORIZATION", signal.outcome.reasonCode);
    case "KERNEL_INSUFFICIENT_FUNDS":
    case "KERNEL_INSUFFICIENT_RESOURCE":
      return classification("RESOURCE_UNAVAILABLE", signal.outcome.reasonCode);
    case "WORLD_NOT_RUNNING":
      return classification("WORLD_NOT_RUNNING", signal.outcome.reasonCode);
    default:
      return classification("UNKNOWN_FAILURE", "UNKNOWN_FAILURE");
  }
}

export function classifyFailure(
  signal: ActionRecoverySignal,
): FailureClassification {
  switch (signal.kind) {
    case "KERNEL_OUTCOME":
      return classifyKernelOutcome(signal);
    case "IDEMPOTENCY_CONFLICT":
      return classification("IDEMPOTENCY_ERROR", "IDEMPOTENCY_CONFLICT");
    case "NOT_DUE":
      return classification("TEMPORARY_NOT_DUE", "NOT_DUE");
    case "TIMED_OUT":
      if (signal.reconciliation.status === "FOUND") {
        return classifyKernelOutcome({
          kind: "KERNEL_OUTCOME",
          disposition: "REUSED",
          outcome: signal.reconciliation.outcome,
        });
      }
      return classification("TRANSPORT_TIMEOUT", "TIMED_OUT");
    case "EXECUTOR_ERROR":
      return classification("INTERNAL_ERROR", signal.code);
    case "UNKNOWN_FAILURE":
      return classification("UNKNOWN_FAILURE", signal.code);
  }
}

function stop(
  failure: FailureClassification,
  budget: DecisionAttemptBudget,
  stopReason: Extract<ReplanDecision, { directive: "STOP" }>["stopReason"],
): ReplanDecision {
  return replanDecisionSchema.parse({
    policyVersion: REPLAN_POLICY_VERSION,
    directive: "STOP",
    failureClass: failure.failureClass,
    reasonCode: failure.reasonCode,
    budget,
    stopReason,
  });
}

function success(budget: DecisionAttemptBudget): ReplanDecision {
  return replanDecisionSchema.parse({
    policyVersion: REPLAN_POLICY_VERSION,
    directive: "SUCCESS",
    failureClass: "SUCCESS",
    reasonCode: null,
    budget,
  });
}

function budgetExhausted(
  budget: DecisionAttemptBudget,
  key: "conflictRecoveries" | "replans",
): boolean {
  const maximum =
    key === "replans"
      ? REPLAN_POLICY_V1.maxReplans
      : REPLAN_POLICY_V1.maxConflictRecoveries;
  return budget[key] >= maximum;
}

export function getReconsiderationDelayWorldMinutes(replans: number): number {
  if (!Number.isInteger(replans) || replans < 0) {
    throw new Error("replans must be a non-negative integer");
  }
  return Math.min(
    REPLAN_POLICY_V1.maximumReconsiderationDelayWorldMinutes,
    REPLAN_POLICY_V1.initialReconsiderationDelayWorldMinutes * 2 ** replans,
  );
}

function deferUntil(
  failure: FailureClassification,
  budget: DecisionAttemptBudget,
  untilWorldTime: string,
): ReplanDecision {
  return replanDecisionSchema.parse({
    policyVersion: REPLAN_POLICY_VERSION,
    directive: "DEFER_UNTIL_WORLD_TIME",
    failureClass: failure.failureClass,
    reasonCode: failure.reasonCode,
    budget,
    untilWorldTime,
  });
}

function replan(
  failure: FailureClassification,
  budget: DecisionAttemptBudget,
): ReplanDecision {
  return replanDecisionSchema.parse({
    policyVersion: REPLAN_POLICY_VERSION,
    directive: "REPLAN_NOW",
    failureClass: failure.failureClass,
    reasonCode: failure.reasonCode,
    budget,
  });
}

function reobserve(
  failure: FailureClassification,
  budget: DecisionAttemptBudget,
): ReplanDecision {
  return replanDecisionSchema.parse({
    policyVersion: REPLAN_POLICY_VERSION,
    directive: "REOBSERVE_NOW",
    failureClass: failure.failureClass,
    reasonCode: failure.reasonCode,
    budget,
  });
}

function decideTimeout(
  input: ReplanPolicyInput,
  signal: Extract<ActionRecoverySignal, { kind: "TIMED_OUT" }>,
): ReplanDecision {
  const failure = classifyFailure(signal);
  if (signal.reconciliation.status === "FOUND") {
    return decideReplan({
      ...input,
      signal: {
        kind: "KERNEL_OUTCOME",
        disposition: "REUSED",
        outcome: signal.reconciliation.outcome,
      },
    });
  }
  if (signal.reconciliation.status === "UNAVAILABLE") {
    return stop(failure, input.budget, "RECONCILIATION_REQUIRED");
  }
  if (
    input.budget.submissionAttempts < REPLAN_POLICY_V1.maxSubmissionAttempts
  ) {
    return replanDecisionSchema.parse({
      policyVersion: REPLAN_POLICY_VERSION,
      directive: "RETRY_SAME_REQUEST",
      failureClass: "TRANSPORT_TIMEOUT",
      reasonCode: "TIMED_OUT",
      requestId: signal.requestId,
      idempotencyKey: signal.idempotencyKey,
      budget: budgetWith(input.budget, {
        submissionAttempts: input.budget.submissionAttempts + 1,
      }),
    });
  }
  return stop(failure, input.budget, "BUDGET_EXHAUSTED");
}

export function decideReplan(input: ReplanPolicyInput): ReplanDecision {
  const parsed = replanPolicyInputSchema.parse(input);
  if (parsed.signal.kind === "TIMED_OUT") {
    return decideTimeout(parsed, parsed.signal);
  }

  const failure = classifyFailure(parsed.signal);
  if (failure.failureClass === "SUCCESS") return success(parsed.budget);

  if (failure.failureClass === "STALE_STATE") {
    if (budgetExhausted(parsed.budget, "conflictRecoveries")) {
      return stop(failure, parsed.budget, "BUDGET_EXHAUSTED");
    }
    return reobserve(
      failure,
      budgetWith(parsed.budget, {
        conflictRecoveries: parsed.budget.conflictRecoveries + 1,
      }),
    );
  }

  if (
    failure.failureClass === "PERMANENT_INVALID" ||
    failure.failureClass === "RESOURCE_UNAVAILABLE"
  ) {
    if (parsed.alternativeCandidateAvailable === true) {
      if (budgetExhausted(parsed.budget, "replans")) {
        return stop(failure, parsed.budget, "BUDGET_EXHAUSTED");
      }
      return replan(
        failure,
        budgetWith(parsed.budget, { replans: parsed.budget.replans + 1 }),
      );
    }

    if (failure.failureClass === "RESOURCE_UNAVAILABLE") {
      const currentWorldTime = new Date(parsed.currentWorldTime);
      const delay = getReconsiderationDelayWorldMinutes(parsed.budget.replans);
      const untilWorldTime = new Date(
        currentWorldTime.getTime() + delay * 60_000,
      ).toISOString();
      return deferUntil(failure, parsed.budget, untilWorldTime);
    }
    return stop(failure, parsed.budget, "NO_FEASIBLE_ALTERNATIVE");
  }

  if (failure.failureClass === "TEMPORARY_NOT_DUE") {
    if (parsed.signal.kind !== "NOT_DUE") {
      return stop(failure, parsed.budget, "UNKNOWN_FAILURE");
    }
    const currentWorldTime = new Date(parsed.currentWorldTime).getTime();
    const dueAtWorldTime = new Date(parsed.signal.dueAtWorldTime).getTime();
    if (dueAtWorldTime <= currentWorldTime) {
      return stop(failure, parsed.budget, "UNKNOWN_FAILURE");
    }
    return deferUntil(failure, parsed.budget, parsed.signal.dueAtWorldTime);
  }

  if (failure.failureClass === "WORLD_NOT_RUNNING") {
    return stop(failure, parsed.budget, "WORLD_NOT_RUNNING");
  }
  if (failure.failureClass === "IDEMPOTENCY_ERROR") {
    return stop(failure, parsed.budget, "IDEMPOTENCY_ERROR");
  }
  if (failure.failureClass === "AUTHORIZATION") {
    return stop(failure, parsed.budget, "FAILURE_TERMINAL");
  }
  if (failure.failureClass === "INTERNAL_ERROR") {
    return stop(failure, parsed.budget, "INTERNAL_ERROR");
  }
  return stop(failure, parsed.budget, "UNKNOWN_FAILURE");
}
