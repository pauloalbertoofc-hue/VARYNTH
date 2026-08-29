export type ImpactType =
  | "ARCHITECTURE"
  | "BEHAVIOR"
  | "SECURITY"
  | "DATA"
  | "API"
  | "MODULE"
  | "HISTORY"
  | "CONTRACT";

export type UpdateLevel = "SAFE_AUTO_UPDATE" | "REVIEW_REQUIRED";

export type ReviewChangeType =
  | "NEW_DOCUMENT"
  | "DOCUMENT_UPDATE"
  | "HISTORICAL_CORRECTION"
  | "DEPRECATION";

export interface DocumentationImpact {
  requiresUpdate: boolean;
  affectedComponents: string[];
  affectedDocuments: string[];
  impactType: ImpactType;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  updateLevel: UpdateLevel;
  reason: string;
  sourceEvidence: string;
}

export interface SubsystemHealth {
  name: string;
  status: "SYNCED" | "POSSIBLE_DRIFT" | "OUTDATED";
  totalDocumented: number;
  totalActual: number;
  lastChecked: string;
  issues: string[];
}

export interface DocumentationHealthReport {
  score: number; // 0 - 100%
  status: "SYNCED" | "POSSIBLE_DRIFT" | "OUTDATED";
  subsystems: {
    architecture: SubsystemHealth;
    athenaKernel: SubsystemHealth;
    modules: SubsystemHealth;
    actionTools: SubsystemHealth;
    councilAgents: SubsystemHealth;
    adrs: SubsystemHealth;
    regressionSuite: SubsystemHealth;
  };
  runtimeAudits: {
    totalRoutes: number;
    totalTools: number;
    totalAgents: number;
    totalModules: number;
    totalADRs: number;
    totalRegressionTests: number;
    totalLessons: number;
  };
  timestamp: string;
}

export interface InteractiveEvidence {
  label: string;
  type: "REGRESSION_TEST" | "ADR" | "MODULE" | "GIT_COMMIT" | "CODE_FILE";
  targetId: string;
  description: string;
}

export interface ReviewAuditEntry {
  action: "CREATED" | "VIEWED" | "EDITED" | "APPROVED" | "REJECTED";
  actor: string;
  timestamp: string;
  details?: string;
}

export interface DocumentationReviewItem {
  id: string;
  type: "ADR" | "LESSON_LEARNED" | "HISTORICAL_RATIONALE" | "TRADE_OFF_EVALUATION";
  changeType: ReviewChangeType;
  title: string;
  targetDocument: string;
  summary: string;
  fullDraftContent: string;
  currentVersionContent?: string;
  editedContent?: string;
  interactiveEvidences: InteractiveEvidence[];
  rationale: string;
  sourceEvidence: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  hasBeenRead: boolean;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  auditTrail: ReviewAuditEntry[];
}

export interface DocumentationAuditRecord {
  id: string;
  timestamp: string;
  type: "AUTO_SYNC" | "HUMAN_APPROVED" | "HUMAN_REJECTED" | "DRIFT_DETECTED";
  affectedDocuments: string[];
  description: string;
  sourceEvidence: string;
  actor?: string;
}
