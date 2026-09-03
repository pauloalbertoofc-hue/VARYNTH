import type { AthenaTask } from "./task";
import type { AthenaWorkflow } from "./workflow";
import type { ExecutableCapabilityKind } from "./capability-selection";

export type CapabilityPlanStatus =
  | "UNDERSTOOD"
  | "PLANNED"
  | "APPROVED"
  | "EXECUTING"
  | "PAUSED"
  | "INTERRUPTED"
  | "PARTIAL"
  | "COMPLETED"
  | "BLOCKED"
  | "FAILED"
  | "CANCELLED"
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
  confirmation?: {
    token: string;
    authorizationContextHash: string;
    confirmedPlanHash: string;
    confirmedRevision: number;
    expiresAt: string;
    confirmedAt: string;
  };
  mutationRecord?: {
    before: unknown;
    after: unknown;
    recordedAt: string;
    revertedAt?: string;
  };
}

export interface CapabilityExecutionPlan {
  schemaVersion: number;
  interactionContractVersion: number;
  toolContractVersions: Record<string, number>;
  id: string;
  taskId: string;
  sessionId?: string;
  projectId?: string;
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
  migration?: {
    fromVersion: number;
    toVersion: number;
    migratedAt: string;
    preservedApproval: boolean;
  };
  checkpoint?: {
    completedStepIds: string[];
    results: Record<string, unknown>;
    savedAt: string;
  };
  events: CapabilityPlanEvent[];
  metrics: CapabilityPlanMetrics;
}

export interface CapabilityPlanEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  stepId?: string;
}

export interface CapabilityPlanMetrics {
  routedAt?: string;
  startedAt?: string;
  durationMs?: number;
  selectedCapabilityIds: string[];
  confirmationCount: number;
  failureCount: number;
  blockedCount: number;
  retryCount: number;
  reversalCount: number;
}

export interface CapabilityPlanExecutionSummary {
  status: "COMPLETED" | "PARTIAL" | "BLOCKED" | "FAILED" | "REVERTED";
  completedStepIds: string[];
  failedStepIds: string[];
  blockedStepIds: string[];
  skippedStepIds: string[];
  message: string;
}
