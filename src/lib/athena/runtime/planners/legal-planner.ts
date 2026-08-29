import { AthenaTask } from "../../domain/task";
import { AthenaWorkflow, WorkflowStep } from "../../domain/workflow";

export class LegalPlanner {
  id = "legal-planner";

  plan(task: AthenaTask): AthenaWorkflow {
    const steps: WorkflowStep[] = [
      {
        id: "step-1",
        name: "Recuperar Teses e Precedentes (Codex & Vault)",
        assignedAgentId: "justitia",
        status: "PENDING",
      },
      {
        id: "step-2",
        name: "Análise Crítica & Objeções Contrárias",
        assignedAgentId: "critias",
        dependencies: ["step-1"],
        status: "PENDING",
      },
      {
        id: "step-3",
        name: "Síntese Hermenêutica Final",
        assignedAgentId: "sophia",
        dependencies: ["step-2"],
        status: "PENDING",
      },
    ];

    return {
      id: "wf-legal-" + Date.now(),
      taskId: task.id,
      name: "Deliberação Jurídica e Dialética (Justitia + Critias)",
      plannerId: this.id,
      steps,
      status: "PENDING",
      currentStepIndex: 0,
      createdAt: new Date().toISOString(),
    };
  }
}

export const legalPlanner = new LegalPlanner();

