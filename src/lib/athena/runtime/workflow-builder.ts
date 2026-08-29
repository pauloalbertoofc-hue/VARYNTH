import { AthenaTask } from "../domain/task";
import { AthenaWorkflow } from "../domain/workflow";
import { simpleActionPlanner } from "./planners/action-planner";
import { legalPlanner } from "./planners/legal-planner";
import { researchPlanner } from "./planners/research-planner";
import { productivityPlanner } from "./planners/productivity-planner";

export class WorkflowBuilder {
  build(task: AthenaTask): AthenaWorkflow {
    switch (task.type) {
      case "ACTION_FAST":
        return simpleActionPlanner.plan(task);
      case "LEGAL_ANALYSIS":
        return legalPlanner.plan(task);
      case "RESEARCH_SYNTHESIS":
        return researchPlanner.plan(task);
      case "PRODUCTIVITY_OPTIMIZATION":
        return productivityPlanner.plan(task);
      default:
        // Default to Simple Action or Fast
        return simpleActionPlanner.plan(task);
    }
  }
}

export const athenaWorkflowBuilder = new WorkflowBuilder();

