import type { AthenaEngineContext } from "../engine";
import type { AthenaMessage, AthenaScope, PriorityLevel, Project, Task } from "@/lib/types";

export type ProjectPlanStatus = "RASCUNHO" | "APROVADO" | "EXECUTANDO" | "CONCLUIDO" | "REJEITADO" | "DESFEITO" | "FALHOU";
export type ProjectPlanOperation = "CREATE_TASK" | "UPDATE_TASK" | "UPDATE_PROJECT";

export interface ProjectPlanStep {
  id: string;
  title: string;
  description: string;
  operation: ProjectPlanOperation;
  targetId?: string;
  changes: Record<string, unknown>;
  dependsOn?: string[];
  status: "PENDENTE" | "CONCLUIDA" | "FALHOU" | "DESFEITA";
}

export interface ProjectPlanEvent { id: string; type: string; message: string; timestamp: string; }

export interface ProjectExecutionPlan {
  id: string;
  projectId: string;
  objective: string;
  expectedResult: string;
  steps: ProjectPlanStep[];
  risks: string[];
  missingData: string[];
  status: ProjectPlanStatus;
  revision: number;
  planHash: string;
  approvedHash?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  events: ProjectPlanEvent[];
  rollback?: { project?: Project; tasks: Task[]; createdTaskIds: string[] };
}

const STORAGE_KEY = "varynth_athena_project_plans_v1";
let fallback: ProjectExecutionPlan[] = [];

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
function read(): ProjectExecutionPlan[] {
  if (typeof window === "undefined" || !window.localStorage) return clone(fallback);
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function write(plans: ProjectExecutionPlan[]): void {
  fallback = clone(plans.slice(0, 50));
  if (typeof window !== "undefined" && window.localStorage) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback)); window.dispatchEvent(new CustomEvent("varynth_project_plans_updated")); } catch { /* indisponível */ } }
}
function event(type: string, message: string): ProjectPlanEvent { return { id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, type, message, timestamp: new Date().toISOString() }; }
function hashPlan(plan: Pick<ProjectExecutionPlan, "projectId" | "objective" | "expectedResult" | "steps" | "revision">): string {
  const raw = JSON.stringify({ projectId: plan.projectId, objective: plan.objective, expectedResult: plan.expectedResult, revision: plan.revision, steps: plan.steps.map(({ id, title, description, operation, targetId, changes, dependsOn }) => ({ id, title, description, operation, targetId, changes, dependsOn })) });
  let hash = 0; for (let i = 0; i < raw.length; i += 1) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  return `project-plan-${Math.abs(hash).toString(16)}`;
}
function normalize(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function dateFromGoal(goal: string): string | undefined {
  const iso = goal.match(/\b20\d{2}-\d{2}-\d{2}\b/); if (iso) return iso[0];
  const br = goal.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/); return br ? `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}` : undefined;
}

export class AthenaProjectPlanManager {
  list(): ProjectExecutionPlan[] { return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  get(id: string): ProjectExecutionPlan | undefined { return this.list().find((plan) => plan.id === id); }

  create(objective: string, project: Project, ctx: AthenaEngineContext): ProjectExecutionPlan {
    const now = new Date().toISOString();
    const deadline = dateFromGoal(objective);
    const pending = ctx.tasks.filter((task) => task.projectId === project.id && task.status !== "concluida").sort((a, b) => ({ urgente: 0, alta: 1, media: 2, baixa: 3 })[a.priority] - ({ urgente: 0, alta: 1, media: 2, baixa: 3 })[b.priority]);
    const steps: ProjectPlanStep[] = [];
    if (deadline && deadline !== project.deadline) steps.push({ id: `step-deadline-${Date.now()}`, title: "Alinhar prazo do projeto", description: `Atualizar o prazo geral para ${deadline}.`, operation: "UPDATE_PROJECT", targetId: project.id, changes: { deadline }, status: "PENDENTE" });
    pending.slice(0, 3).forEach((task, index) => steps.push({ id: `step-task-${task.id}`, title: `Priorizar: ${task.title}`, description: `Posicionar esta tarefa como etapa ${index + 1} do plano.`, operation: "UPDATE_TASK", targetId: task.id, changes: { priority: index === 0 ? "urgente" : "alta" as PriorityLevel }, dependsOn: index ? [steps[steps.length - 1]?.id].filter(Boolean) : [], status: "PENDENTE" }));
    const templates = ["Definir critérios de conclusão", "Revisar riscos e dependências", "Preparar entrega e validação"];
    for (let index = pending.length; index < 3; index += 1) steps.push({ id: `step-create-${Date.now()}-${index}`, title: templates[index], description: `Criar a tarefa “${templates[index]}” no projeto.`, operation: "CREATE_TASK", changes: { title: templates[index], projectId: project.id, priority: index === 0 ? "urgente" : "alta", dueDate: deadline, status: "a_fazer", tags: ["athena", "plano"] }, dependsOn: steps.length ? [steps[steps.length - 1].id] : [], status: "PENDENTE" });
    const missingData = [!deadline && !project.deadline ? "O objetivo não informa uma data de entrega." : "", !project.description?.trim() ? "O projeto não possui descrição detalhada." : ""].filter(Boolean);
    const risks = [pending.some((task) => !task.dueDate) ? "Há tarefas sem prazo individual." : "", pending.length > 5 ? "O projeto possui mais de cinco pendências; o plano prioriza apenas as três primeiras." : ""].filter(Boolean);
    const plan: ProjectExecutionPlan = { id: `project-plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, projectId: project.id, objective, expectedResult: `Projeto ${project.title} com próximas ações, prioridades e prazo organizados.`, steps, risks, missingData, status: "RASCUNHO", revision: 1, planHash: "", createdAt: now, updatedAt: now, events: [event("CREATED", "Plano criado pela Athena sem alterar o projeto.")] };
    plan.planHash = hashPlan(plan); write([plan, ...read()]); return clone(plan);
  }

  revise(id: string, updates: { objective?: string; expectedResult?: string; steps?: ProjectPlanStep[] }): ProjectExecutionPlan | undefined {
    const plans = read(); const index = plans.findIndex((plan) => plan.id === id); if (index < 0 || plans[index].status !== "RASCUNHO") return undefined;
    const next = { ...plans[index], ...updates, revision: plans[index].revision + 1, approvedHash: undefined, updatedAt: new Date().toISOString(), events: [...plans[index].events, event("REVISED", "Plano editado; qualquer aprovação anterior foi invalidada.")] };
    next.planHash = hashPlan(next); plans[index] = next; write(plans); return clone(next);
  }

  approve(id: string): ProjectExecutionPlan | undefined {
    const plans = read(); const index = plans.findIndex((plan) => plan.id === id); if (index < 0 || plans[index].status !== "RASCUNHO") return undefined;
    plans[index] = { ...plans[index], status: "APROVADO", approvedHash: plans[index].planHash, updatedAt: new Date().toISOString(), events: [...plans[index].events, event("APPROVED", `Revisão ${plans[index].revision} aprovada pelo usuário.`)] }; write(plans); return clone(plans[index]);
  }

  reject(id: string): boolean {
    const plans = read(); const index = plans.findIndex((plan) => plan.id === id); if (index < 0 || !["RASCUNHO", "APROVADO"].includes(plans[index].status)) return false;
    plans[index] = { ...plans[index], status: "REJEITADO", updatedAt: new Date().toISOString(), events: [...plans[index].events, event("REJECTED", "Plano rejeitado; nenhuma alteração foi aplicada.")] }; write(plans); return true;
  }

  execute(id: string, ctx: AthenaEngineContext): { success: boolean; plan?: ProjectExecutionPlan; error?: string } {
    const plans = read(); const index = plans.findIndex((plan) => plan.id === id); if (index < 0) return { success: false, error: "Plano não encontrado." };
    let plan = plans[index];
    if (plan.status !== "APROVADO" || plan.approvedHash !== plan.planHash || hashPlan(plan) !== plan.planHash) return { success: false, error: "O plano não corresponde exatamente à revisão aprovada." };
    const project = ctx.projects.find((item) => item.id === plan.projectId); if (!project) return { success: false, error: "Projeto alvo não encontrado." };
    if (!ctx.updateProject || !ctx.updateTask || !ctx.deleteTask) return { success: false, error: "As ações necessárias não estão disponíveis nesta superfície." };
    const rollback = { project: clone(project), tasks: clone(ctx.tasks.filter((task) => task.projectId === plan.projectId)), createdTaskIds: [] as string[] };
    plan = { ...plan, status: "EXECUTANDO", rollback, updatedAt: new Date().toISOString(), events: [...plan.events, event("STARTED", "Execução iniciada com snapshot de segurança.")] }; plans[index] = plan; write(plans);
    try {
      const steps = plan.steps.map((step) => {
        if (step.operation === "UPDATE_PROJECT") ctx.updateProject?.(plan.projectId, step.changes, "athena");
        else if (step.operation === "UPDATE_TASK" && step.targetId) ctx.updateTask?.(step.targetId, step.changes, "athena");
        else if (step.operation === "CREATE_TASK") { const created = ctx.addTask(step.changes as Omit<Task, "id" | "createdAt">, "athena"); rollback.createdTaskIds.push(created.id); }
        else throw new Error(`Etapa inválida: ${step.title}`);
        return { ...step, status: "CONCLUIDA" as const };
      });
      plan = { ...plan, steps, rollback, status: "CONCLUIDO", completedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), events: [...plan.events, event("COMPLETED", `${steps.length} etapas concluídas.`)] };
      plans[index] = plan; write(plans); return { success: true, plan: clone(plan) };
    } catch (error) {
      rollback.createdTaskIds.forEach((taskId) => ctx.deleteTask?.(taskId, "athena"));
      ctx.updateProject(plan.projectId, rollback.project, "athena");
      rollback.tasks.forEach((task) => ctx.updateTask?.(task.id, task, "athena"));
      plan = { ...plan, status: "FALHOU", steps: plan.steps.map((step) => step.status === "CONCLUIDA" ? { ...step, status: "DESFEITA" } : step), events: [...plan.events, event("ROLLBACK", `Falha revertida: ${error instanceof Error ? error.message : String(error)}`)] };
      plans[index] = plan; write(plans); return { success: false, plan: clone(plan), error: "A execução falhou e as alterações aplicadas foram revertidas." };
    }
  }

  undo(id: string, ctx: AthenaEngineContext): { success: boolean; error?: string } {
    const plans = read(); const index = plans.findIndex((plan) => plan.id === id); if (index < 0 || plans[index].status !== "CONCLUIDO" || !plans[index].rollback) return { success: false, error: "Este plano não possui uma execução concluída para desfazer." };
    const plan = plans[index]; const rollback = plan.rollback!;
    if (!ctx.updateProject || !ctx.updateTask || !ctx.deleteTask) return { success: false, error: "As ações de restauração não estão disponíveis." };
    rollback.createdTaskIds.forEach((taskId) => ctx.deleteTask?.(taskId, "athena"));
    if (rollback.project) ctx.updateProject(plan.projectId, rollback.project, "athena");
    rollback.tasks.forEach((task) => ctx.updateTask?.(task.id, task, "athena"));
    plans[index] = { ...plan, status: "DESFEITO", steps: plan.steps.map((step) => ({ ...step, status: "DESFEITA" })), updatedAt: new Date().toISOString(), events: [...plan.events, event("UNDONE", "Plano inteiro desfeito pelo usuário.")] }; write(plans); return { success: true };
  }

  tryHandle(prompt: string, scope: AthenaScope, ctx: AthenaEngineContext, targetProjectId?: string): AthenaMessage | undefined {
    const clean = normalize(prompt);
    if (/proximas(?:\s+\w+){0,2}\s+tarefas/.test(clean)) return undefined;
    if (!(/\b(planeje|planejar|organize|organizar|prepare|preparar)\b/.test(clean) && /\b(projeto|entrega|sexta|prazo)\b/.test(clean))) return undefined;
    const project = (targetProjectId ? ctx.projects.find((item) => item.id === targetProjectId) : undefined) || ctx.projects.find((item) => clean.includes(normalize(item.title)));
    if (!project) return { id: `ath-plan-${Date.now()}`, sender: "athena", text: "Qual projeto devo organizar? Informe o nome do projeto para eu preparar um plano sem aplicar mudanças.", timestamp: "Agora", scope };
    const plan = this.create(prompt, project, ctx);
    return { id: `ath-plan-${Date.now()}`, sender: "athena", text: `Preparei o plano **${plan.objective}** para **${project.title}**, com **${plan.steps.length} etapas**. Nenhuma alteração foi aplicada. Revise, edite ou aprove o plano na seção **Memória e sugestões → Planos**.`, timestamp: "Agora", scope, metadata: { engine: "deterministic-project-planner" } };
  }

  clearForTests(): void { fallback = []; if (typeof window !== "undefined" && window.localStorage) localStorage.removeItem(STORAGE_KEY); }
}

export const athenaProjectPlanManager = new AthenaProjectPlanManager();
