export type ActionType =
  | "studio.generate"
  | "tasks.create"
  | "tasks.toggle"
  | "tasks.update"
  | "tasks.trash"
  | "tasks.organize"
  | "notes.create"
  | "projects.update"
  | "projects.trash"
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
  | "creative.reviewDependencyUpdate"
  | "creative.plan"
  | "creative.reviewPlan"
  | "creative.approvePlan"
  | "creative.executePlan"
  | "creative.pausePlan"
  | "creative.cancelPlan"
  | "creative.retryStep"
  | "creative.replan"
  | "creative.getPlanStatus"
  | "creative.getStepStatus"
  | "creative.explainBlocker"
  | "creative.rebuildAffectedOutputs";

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
