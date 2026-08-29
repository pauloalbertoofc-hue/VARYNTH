import { AthenaWorkflow, WorkflowStep } from "../domain/workflow";

export interface WorkflowCheckpoint {
  workflowId: string;
  taskId: string;
  completedStepIndex: number;
  completedStepIds: string[];
  accumulatedResults: Record<string, unknown>;
  savedAt: string;
}

export class CognitiveCheckpointManager {
  private checkpoints: Map<string, WorkflowCheckpoint> = new Map();

  saveCheckpoint(
    workflow: AthenaWorkflow,
    completedStepIndex: number,
    accumulatedResults: Record<string, unknown>
  ): WorkflowCheckpoint {
    const completedStepIds = workflow.steps
      .slice(0, completedStepIndex + 1)
      .map((s) => s.id);

    const cp: WorkflowCheckpoint = {
      workflowId: workflow.id,
      taskId: workflow.taskId,
      completedStepIndex,
      completedStepIds,
      accumulatedResults: { ...accumulatedResults },
      savedAt: new Date().toISOString(),
    };

    this.checkpoints.set(workflow.id, cp);
    return cp;
  }

  getCheckpoint(workflowId: string): WorkflowCheckpoint | undefined {
    return this.checkpoints.get(workflowId);
  }

  clearCheckpoint(workflowId: string): void {
    this.checkpoints.delete(workflowId);
  }
}

export const cognitiveCheckpointManager = new CognitiveCheckpointManager();

