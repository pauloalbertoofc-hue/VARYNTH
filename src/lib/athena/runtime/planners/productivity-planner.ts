import { AthenaTask } from "../../domain/task";
import { AthenaWorkflow, WorkflowStep } from "../../domain/workflow";

export class ProductivityPlanner {
  id = "productivity-planner";

  plan(task: AthenaTask): AthenaWorkflow {
    const steps: WorkflowStep[] = [
      {
        id: "step-1",
        name: "Mapear Prazos e Tarefas Urgentes (Chronos & Projects)",
        assignedAgentId: "strategos",
        status: "PENDING",
      },
      {
        id: "step-2",
        name: "Revisão de Gargalos e Bloqueios",
        assignedAgentId: "critias",
        dependencies: ["step-1"],
        status: "PENDING",
      },
      {
        id: "step-3",
        name: "Consolidar Diretriz Operacional",
        assignedAgentId: "sophia",
        dependencies: ["step-2"],
        status: "PENDING",
      },
    ];

    return {
      id: "wf-prod-" + Date.now(),
      taskId: task.id,
      name: "Planejamento Estratégico de Produtividade (Strategos)",
      plannerId: this.id,
      steps,
      status: "PENDING",
      currentStepIndex: 0,
      createdAt: new Date().toISOString(),
    };
  }
}

export const productivityPlanner = new ProductivityPlanner();

