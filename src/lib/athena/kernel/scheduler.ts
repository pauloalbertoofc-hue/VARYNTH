import { AthenaWorkflow, WorkflowStep } from "../domain/workflow";

export class CognitiveScheduler {
  schedule(workflow: AthenaWorkflow): WorkflowStep[] {
    // Topological sort or sequential ordering by dependencies
    return workflow.steps;
  }
}

export const athenaScheduler = new CognitiveScheduler();

