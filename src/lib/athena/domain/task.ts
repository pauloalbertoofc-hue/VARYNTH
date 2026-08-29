export type TaskStatus =
  | "CREATED"
  | "PLANNED"
  | "ROUTED"
  | "RUNNING"
  | "REVIEWING"
  | "FINISHED"
  | "ARCHIVED"
  | "FAILED"
  | "CANCELLED"
  | "SKIPPED";

export type TaskPriority = "baixa" | "media" | "alta" | "urgente";

export type TaskType =
  | "ACTION_FAST"
  | "LEGAL_ANALYSIS"
  | "RESEARCH_SYNTHESIS"
  | "PRODUCTIVITY_OPTIMIZATION"
  | "WRITING_DRAFT"
  | "CREATIVE_IDEATION"
  | "CRITICAL_REVIEW"
  | "GENERAL_DELIBERATION";

export interface AthenaTask {
  id: string;
  title: string;
  rawPrompt: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  scope: string;
  targetProjectId?: string;
  entities: {
    projectNames?: string[];
    taskNames?: string[];
    dates?: string[];
    keywords?: string[];
    tags?: string[];
  };
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
