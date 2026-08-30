import { ArtifactType, ArtifactActor, ArtifactStatus, CreativeEdgeType } from "../artifacts/types";
import { VarynthAction, SecurityTargetDomain } from "../permissions/types";

export type PlanStatus =
  | "DRAFT"
  | "READY"
  | "BLOCKED"
  | "AWAITING_CONFIRMATION"
  | "APPROVED"
  | "EXECUTING"
  | "PAUSED"
  | "PARTIAL"
  | "COMPLETED_WITH_WARNINGS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type StepStatus =
  | "PENDING"
  | "READY"
  | "RUNNING"
  | "VALIDATING"
  | "PROMOTING"
  | "COMPLETED"
  | "FAILED"
  | "BLOCKED"
  | "SKIPPED"
  | "CANCELLED";

export type FailurePolicy = "STOP_DEPENDENTS" | "CONTINUE" | "RETRY" | "FALLBACK";

export type ResourceClass = "LIGHT" | "MODERATE" | "HEAVY";

export interface CreativeOutputRequest {
  artifactType: ArtifactType;
  description: string;
  required?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CreativeIntent {
  id: string;
  userGoal: string;
  sourceArtifactIds?: string[];
  requestedOutputs: CreativeOutputRequest[];
  constraints?: {
    duration?: number;
    format?: string;
    targetAudience?: string;
    style?: string;
    deadline?: string;
    localOnly?: boolean;
  };
  createdAt: string;
}

export interface PlannedArtifact {
  tempId: string;
  artifactType: ArtifactType;
  title: string;
  description?: string;
  basedOn?: string[]; // tempIds or real artifact IDs
  required: boolean;
  metadata?: Record<string, unknown>;
}

export interface PlannedDependency {
  sourceTempId: string;
  targetTempId: string;
  type: CreativeEdgeType;
  semanticRole?: string;
  usageSlot?: string;
  required: boolean;
}

export interface PlannedCapability {
  capabilityId: string;
  domain: string;
  available: boolean;
  fallbackAvailable?: boolean;
  fallbackDescription?: string;
  blockerMessage?: string;
}

export interface PlannedConfirmation {
  stepId: string;
  action: VarynthAction;
  targetDomain: SecurityTargetDomain;
  summary: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  token?: string;
}

export interface PlannedBlocker {
  id: string;
  message: string;
  affectedArtifactTempIds: string[];
  severity: "CRITICAL" | "HIGH" | "WARNING";
  suggestedAction?: string;
}

export interface ApprovalScope {
  planId: string;
  planRevision: number;
  planHash: string;
  executionPlanHash: string;
  allowedActions: VarynthAction[];
  allowedArtifactTypes: ArtifactType[];
  resourceClass: ResourceClass;
  grantedAt: string;
  expiresAt: string;
  confirmationToken?: string;
}

export interface CreativePlan {
  id: string;
  intentId: string;
  title: string;
  summary: string;
  sourceArtifactIds: string[];
  plannedArtifacts: PlannedArtifact[];
  dependencies: PlannedDependency[];
  requiredCapabilities: PlannedCapability[];
  confirmations: PlannedConfirmation[];
  blockers: PlannedBlocker[];
  resourceClass: ResourceClass;
  estimatedSteps: number;
  revision: number;
  planHash: string;
  approvalScope?: ApprovalScope;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeExecutionStep {
  id: string;
  stepNumber: number;
  type: string;
  title: string;
  dependsOn: string[]; // step IDs
  action: string;
  targetTempId?: string;
  resolvedArtifactId?: string;
  writeTargets?: string[]; // Artifact IDs to detect write conflicts
  parameters: Record<string, unknown>;
  frozenInputVersions: Record<string, { versionId: string; versionNumber: number }>;
  permissionMode: "ALLOW" | "CONFIRM" | "DENY" | "SANDBOX";
  failurePolicy: FailurePolicy;
  status: StepStatus;
  attemptId: number;
  retryCount: number;
  maxRetries: number;
  outputData?: Record<string, unknown>;
  committedAssetIds?: string[];
  error?: string;
  failureHistory?: Array<{ attemptId: number; error: string; timestamp: string }>;
  startedAt?: string;
  completedAt?: string;
}

export interface CreativeExecutionPlan {
  id: string;
  planId: string;
  planRevision: number;
  planHash: string;
  executionPlanHash: string;
  derivedFromPlanRevision: number;
  steps: CreativeExecutionStep[];
  artifactResolutionMap: Record<string, string>; // tempId -> real artifactId
  status: PlanStatus;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type PlanDiffCategory =
  | "OUTPUT_ADDED"
  | "OUTPUT_REMOVED"
  | "DEPENDENCY_CHANGED"
  | "PARAMETER_CHANGED"
  | "CAPABILITY_REQUIREMENT_CHANGED"
  | "PERMISSION_SCOPE_CHANGED"
  | "RESOURCE_CLASS_CHANGED";

export interface PlanDiffItem {
  category: PlanDiffCategory;
  description: string;
  details?: Record<string, unknown>;
}

export interface PlanDiff {
  previousRevision: number;
  newRevision: number;
  items: PlanDiffItem[];
  invalidatedPriorApproval: boolean;
}

export interface OrchestrationProvenanceManifest {
  intentId: string;
  planId: string;
  planRevision: number;
  executionPlanId: string;
  executionPlanHash: string;
  stepId: string;
  attemptId: number;
  engineId?: string;
  sourceArtifactVersions: Record<string, string>; // artifactId -> versionId
  sourceAssetChecksums: Record<string, string>; // assetId -> checksum
  parameters: Record<string, unknown>;
  outputArtifactId?: string;
  outputVersionId?: string;
  outputAssetIds?: string[];
  generatedAt: string;
}
