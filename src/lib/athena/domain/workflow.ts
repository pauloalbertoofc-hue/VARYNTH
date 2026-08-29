export type StepStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  assignedAgentId?: string;
  toolCall?: {
    toolName: string;
    params: Record<string, unknown>;
  };
  dependencies?: string[];
  status: StepStatus;
  result?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AthenaWorkflow {
  id: string;
  taskId: string;
  name: string;
  plannerId: string;
  steps: WorkflowStep[];
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  currentStepIndex: number;
  createdAt: string;
  completedAt?: string;
}

