export type InvariantSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type InvariantStatus = "PASS" | "FAIL" | "DEGRADED" | "UNKNOWN";

export type InvariantCheckMode =
  | "ON_DEMAND"
  | "POST_TRANSACTION"
  | "STARTUP_RECOVERY"
  | "PRE_BACKUP"
  | "POST_RESTORE";

export type SystemHealthLevel = "HEALTHY" | "DEGRADED" | "PROTECTED" | "CRITICAL";

export interface InvariantResult {
  invariantId: string;
  name: string;
  status: InvariantStatus;
  severity: InvariantSeverity;
  details?: string;
  affectedIds?: string[];
  suggestedAction?: string;
}

export interface InvariantValidationContext {
  mode: InvariantCheckMode;
  targetArtifactId?: string;
  timestamp: string;
}

export interface SystemInvariant {
  id: string;
  name: string;
  description: string;
  severity: InvariantSeverity;
  validate(ctx?: InvariantValidationContext): InvariantResult;
}

export type TransactionState =
  | "STARTED"
  | "PREPARED"
  | "COMMITTING"
  | "COMMITTED"
  | "ROLLING_BACK"
  | "ROLLED_BACK"
  | "FAILED";

export type TransactionType =
  | "DEPENDENCY_UPDATE"
  | "ASSET_PROMOTION"
  | "ARTIFACT_RESTORE"
  | "MASS_RELINK"
  | "VERSION_SNAPSHOT"
  | "RESTORE_BACKUP";

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  targetIds: string[];
  state: TransactionState;
  startedAt: string;
  updatedAt: string;
  lastSafeStep: string;
  rollbackSnapshot?: Record<string, unknown>;
  commitMarker?: boolean;
  error?: string;
}

export interface RepairPlanStep {
  stepId: string;
  title: string;
  description: string;
  targetDomain: string;
  targetId?: string;
  action: "REBUILD_INDEX" | "QUARANTINE_ASSET" | "RELINK_DEPENDENCY" | "CLEAN_TEMP_OUTPUT" | "RECALCULATE_PROXY";
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  requiresConfirmation: boolean;
  parameters?: Record<string, unknown>;
}

export interface RepairPlan {
  planId: string;
  generatedAt: string;
  issuesCount: number;
  steps: RepairPlanStep[];
  autoExecutableStepsCount: number;
  manualConfirmationStepsCount: number;
}

export interface SystemHealthReport {
  overallStatus: SystemHealthLevel;
  checkMode: InvariantCheckMode;
  timestamp: string;
  invariantsCount: {
    total: number;
    passed: number;
    failed: number;
    degraded: number;
  };
  results: InvariantResult[];
  criticalFailures: string[];
  degradedSubsystems: string[];
  repairPlan?: RepairPlan;
}

