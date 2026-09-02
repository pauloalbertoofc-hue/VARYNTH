import type { AthenaTask } from "./task";
import type { AthenaWorkflow } from "./workflow";
import type { ExecutableCapabilityKind } from "./capability-selection";

export type CapabilityPlanStatus =
  | "UNDERSTOOD"
  | "PLANNED"
  | "APPROVED"
  | "EXECUTING"
  | "PARTIAL"
  | "COMPLETED"
  | "BLOCKED"
  | "FAILED"
  | "REVERTED";

export type CapabilityStepFailurePolicy = "STOP_DEPENDENTS" | "CONTINUE_INDEPENDENT";

export interface CapabilityPlanStep {
  id: string;
  name: string;
  capabilityId: string;
  capabilityKind: ExecutableCapabilityKind | "CORE";
  inputs: Record<string, unknown>;
  expectedResult: string;
  dependsOn: string[];
  risk: "LOW" | "MEDIUM" | "HIGH";
  authority: "READ_ONLY" | "PROPOSE" | "MUTATE_GOVERNED";
  requiresConfirmation: boolean;
  supportsUndo: boolean;
  failurePolicy: CapabilityStepFailurePolicy;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "BLOCKED" | "SKIPPED";
  result?: unknown;
  error?: string;
}

export interface CapabilityExecutionPlan {
  id: string;
  taskId: string;
  objective: string;
  revision: number;
  planHash: string;
  approvedHash?: string;
  approvalMode?: "POLICY" | "HUMAN";
  status: CapabilityPlanStatus;
  steps: CapabilityPlanStep[];
  sourceTask: AthenaTask;
  sourceWorkflow: AthenaWorkflow;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CapabilityPlanExecutionSummary {
  status: "COMPLETED" | "PARTIAL" | "BLOCKED" | "FAILED" | "REVERTED";
  completedStepIds: string[];
  failedStepIds: string[];
  blockedStepIds: string[];
  skippedStepIds: string[];
  message: string;
}

