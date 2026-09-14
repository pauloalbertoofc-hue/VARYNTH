export type VarynthAction =
  | "READ"
  | "CREATE"
  | "MODIFY"
  | "DELETE_SOFT"
  | "DELETE_HARD"
  | "RESTORE"
  | "EXECUTE"
  | "PUBLISH"
  | "EXPORT"
  | "IMPORT"
  | "MOVE"
  | "SHARE"
  | "LINK"
  | "UNLINK"
  | "ARCHIVE"
  | "PROMOTE"
  | "ROLLBACK";

// Backward compatibility alias
export type SecurityAction = VarynthAction;

export type SecurityPolicy = "ALLOW" | "CONFIRM" | "DENY" | "SANDBOX";

export type ActorType = "USER" | "ATHENA" | "SYSTEM" | "AUTOMATION" | "COLLABORATOR";
export type SecurityActor = ActorType;

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SecurityTargetDomain =
  | "CORE_SYSTEM"
  | "WORKSPACE_PROJECT"
  | "WORKSPACE_TASK"
  | "WORKSPACE_NOTE"
  | "VAULT"
  | "CODEX_THESES"
  | "RESEARCH_EVIDENCES"
  | "CHRONOS"
  | "ARTIFACT_DRAFT"
  | "ARTIFACT_ACTIVE"
  | "ARTIFACT_PUBLISHED"
  | "TECHNICAL_DOCS"
  | "TRASH_BIN"
  | "SANDBOX_LABS"
  | "DATA_EXPORT"
  | "PERMANENT_MEMORY"
  | "MUSIC";

export type AgentSpecialistId =
  | "justitia"
  | "logos"
  | "strategos"
  | "mnemosyne"
  | "critias"
  | "sophia"
  | "musa"
  | "archivist"
  | "euterpe";

export interface ActorIdentity {
  type: ActorType;
  agentId?: AgentSpecialistId | string;
  name?: string;
}

export interface ActionConfirmation {
  actionId: string;
  token: string;
  action: VarynthAction;
  targetDomain: SecurityTargetDomain;
  resourceId?: string;
  expectedRevision?: number;
  expectedVersionId?: string;
  authorizationContextHash?: string;
  criticalParameters?: Record<string, unknown>;
  summary: string;
  consequences: string[];
  expiresAt: string;
  used: boolean;
}

export interface PermissionRequest {
  actor: ActorIdentity | ActorType;
  action: VarynthAction;
  targetDomain: SecurityTargetDomain;
  resourceId?: string;
  resourceStatus?: "DRAFT" | "ACTIVE" | "PUBLISHED" | "ARCHIVED" | "FAILED" | "TRASHED";
  isBatch?: boolean;
  batchCount?: number;
  context?: Record<string, unknown>;
}

export interface PermissionDecision {
  allowed: boolean;
  policy: SecurityPolicy;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  reason: string;
  suggestedAlternative?: string;
  auditRequired: boolean;
  confirmationObject?: ActionConfirmation;
}

export type PermissionEvaluationResult = PermissionDecision;

export interface ToolCapabilityManifest {
  id: string;
  description: string;
  supportedActions: VarynthAction[];
  targetDomain: SecurityTargetDomain;
  riskLevel: RiskLevel;
  mutatesData: boolean;
  requiresSandbox?: boolean;
  requiresConfirmation?: boolean;
}

export interface AgentPermissionProfile {
  agentId: AgentSpecialistId;
  name: string;
  allowedDomains: SecurityTargetDomain[];
  readOnlyDomains: SecurityTargetDomain[];
  prohibitedActions: VarynthAction[];
  requiresConfirmationActions: VarynthAction[];
  rationale: string;
}
