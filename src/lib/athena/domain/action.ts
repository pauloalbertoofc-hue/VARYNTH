export type ActionType =
  | "tasks.create"
  | "tasks.toggle"
  | "tasks.update"
  | "notes.create"
  | "vault.search"
  | "vault.read"
  | "chronos.listDeadlines"
  | "chronos.createEvent"
  | "trash.moveWithUndo"
  | "research.getEvidences"
  | "codex.searchTheses"
  | "opportunities.list"
  | "diagnostics.run"
  | "creative.queryDependents"
  | "creative.getProvenance"
  | "creative.linkArtifact"
  | "creative.unlinkArtifact"
  | "creative.setPinMode"
  | "creative.reviewDependencyUpdate";

export interface AthenaAction {
  id: string;
  type: ActionType;
  params: Record<string, unknown>;
  targetModule: string;
  requiresConfirmation?: boolean;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  actionType: ActionType;
  data?: T;
  error?: string;
  auditLogId?: string;
}

