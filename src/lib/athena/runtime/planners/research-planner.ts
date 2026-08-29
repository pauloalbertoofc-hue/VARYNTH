import { AthenaTask } from "../../domain/task";
import { AthenaWorkflow, WorkflowStep } from "../../domain/workflow";

export class ResearchPlanner {
  id = "research-planner";

  plan(task: AthenaTask): AthenaWorkflow {
    const steps: WorkflowStep[] = [
      {
        id: "step-1",
        name: "Recuperar Evidências e Referências (Research & Vault)",
        assignedAgentId: "logos",
        status: "PENDING",
      },
      {
        id: "step-2",
        name: "Validação Epistêmica e Análise de Falhas",
        assignedAgentId: "critias",
        dependencies: ["step-1"],
        status: "PENDING",
      },
      {
        id: "step-3",
        name: "Estruturação Metodológica & Redação Científica",
        assignedAgentId: "sophia",
        dependencies: ["step-2"],
        status: "PENDING",
      },
    ];

    return {
      id: "wf-res-" + Date.now(),
      taskId: task.id,
      name: "Investigação e Validação Científica (Logos + Critias)",
      plannerId: this.id,
      steps,
      status: "PENDING",
      currentStepIndex: 0,
      createdAt: new Date().toISOString(),
    };
  }
}

export const researchPlanner = new ResearchPlanner();

