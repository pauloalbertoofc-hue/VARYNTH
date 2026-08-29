export type SecurityAction =
  | "READ"
  | "CREATE"
  | "MODIFY"
  | "DELETE"
  | "EXECUTE"
  | "PUBLISH"
  | "EXPORT"
  | "MOVE"
  | "RESTORE";

export type SecurityPolicy = "ALLOW" | "CONFIRM" | "DENY" | "SANDBOX";

export type SecurityActor = "USER" | "ATHENA" | "SYSTEM" | "COLLABORATOR";

export type SecurityTargetDomain =
  | "CORE_SYSTEM"
  | "WORKSPACE_PROJECT"
  | "ARTIFACT_DRAFT"
  | "ARTIFACT_ACTIVE"
  | "TECHNICAL_DOCS"
  | "TRASH_BIN"
  | "SANDBOX_LABS"
  | "DATA_EXPORT";

export interface PermissionEvaluationResult {
  allowed: boolean;
  policy: SecurityPolicy;
  requiresConfirmation: boolean;
  reason: string;
  suggestedAction?: string;
  auditRequired: boolean;
}

export interface PermissionRule {
  id: string;
  actor: SecurityActor;
  action: SecurityAction;
  targetDomain: SecurityTargetDomain;
  policy: SecurityPolicy;
  reason: string;
}

