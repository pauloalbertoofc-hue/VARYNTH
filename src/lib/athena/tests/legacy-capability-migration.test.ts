import type { Project, Task } from "@/lib/types";
import { processAthenaQueryAsync, type AthenaEngineContext } from "../engine";
import { athenaContextBuilder } from "../memory/context-builder";
import { athenaObservabilityJournal } from "../observability/local-observability-journal";
import { capabilityPlanRuntime } from "../runtime/capability-plan-runtime";
import { capabilityPlanStore } from "../runtime/capability-plan-store";
import { CapabilityPlanStore } from "../runtime/capability-plan-store";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function createContext(): AthenaEngineContext {
  const projects = [{ id: "project-migration", title: "Projeto Migração", description: "Teste", category: "software", status: "ativo", priority: "media", progress: 10, deadline: "2026-10-01", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", tags: [] }] as Project[];
  const tasks = [{ id: "task-migration", title: "Revisar contrato", projectId: "project-migration", priority: "media", status: "a_fazer", createdAt: "2026-01-01T00:00:00.000Z" }] as Task[];
  const trash = new Map<string, { kind: "project" | "task"; value: Project | Task }>();
  return {
    projects, tasks, vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [],
    addTask: (data) => { const value = { ...data, id: `created-${tasks.length}`, createdAt: new Date().toISOString() } as Task; tasks.push(value); return value; },
    addNote: (data) => ({ ...data, id: "note-migrated", createdAt: new Date().toISOString() }),
    updateProject: (id, updates) => { const index = projects.findIndex((item) => item.id === id); if (index >= 0) projects[index] = { ...projects[index], ...updates }; },
    updateTask: (id, updates) => { const index = tasks.findIndex((item) => item.id === id); if (index >= 0) tasks[index] = { ...tasks[index], ...updates }; },
    toggleTask: (id) => { const task = tasks.find((item) => item.id === id); if (task) task.status = task.status === "concluida" ? "a_fazer" : "concluida"; },
    deleteProject: (id) => { const index = projects.findIndex((item) => item.id === id); if (index < 0) return; const value = projects.splice(index, 1)[0]; const trashId = `trash-project-${id}`; trash.set(trashId, { kind: "project", value }); return { id: trashId }; },
    deleteTask: (id) => { const index = tasks.findIndex((item) => item.id === id); if (index < 0) return; const value = tasks.splice(index, 1)[0]; const trashId = `trash-task-${id}`; trash.set(trashId, { kind: "task", value }); return { id: trashId }; },
    restoreFromTrash: (trashId) => { const item = trash.get(trashId); if (!item) return; if (item.kind === "project") projects.push(item.value as Project); else tasks.push(item.value as Task); trash.delete(trashId); },
  };
}

async function confirmExecute(response: Awaited<ReturnType<typeof processAthenaQueryAsync>>, ctx: AthenaEngineContext) {
  const planId = response.metadata?.capabilityPlanId as string;
  const plan = capabilityPlanStore.get(planId);
  assert(plan?.status === "APPROVED", "Sensitive migrated command must persist an approved plan awaiting confirmation");
  const step = plan.steps.find((candidate) => candidate.requiresConfirmation);
  assert(step, "Migrated mutation must expose a confirmation step");
  capabilityPlanRuntime.confirmStep(plan.id, step.id);
  const current = capabilityPlanStore.get(plan.id)!;
  const context = athenaContextBuilder.buildContext(current.sourceTask, "geral", ctx, current.sourceTask.targetProjectId);
  return capabilityPlanRuntime.execute(plan.id, context, ctx);
}

async function run(): Promise<void> {
  capabilityPlanStore.clear();
  athenaObservabilityJournal.clear();
  const ctx = createContext();

  const deadline = await processAthenaQueryAsync("Atualize o prazo do projeto para 15/12/2026", "geral", ctx, "project-migration", "migration-deadline");
  assert(deadline.metadata?.interactionContract === "USE_TOOL" && deadline.metadata?.capabilityPlanStatus === "APPROVED", "Project deadline must route to the consolidated governed runtime");
  assert(deadline.text.includes("Nenhuma alteração foi executada"), "Pending migrated plan must not claim execution success");
  assert(ctx.projects[0].deadline === "2026-10-01", "Project must not mutate before confirmation");
  assert(new CapabilityPlanStore().get(deadline.metadata?.capabilityPlanId as string)?.status === "APPROVED", "Pending confirmation must survive a local store reload");
  const deadlineExecution = await confirmExecute(deadline, ctx);
  assert(String(ctx.projects[0].deadline) === "2026-12-15" && deadlineExecution.plan.steps[0].mutationRecord?.before, "Confirmed project update must mutate and journal before/after state");
  await capabilityPlanRuntime.revertWithRegisteredUndo(deadlineExecution.plan.id, ctx);
  assert(String(ctx.projects[0].deadline) === "2026-10-01", "Project update undo must restore the previous deadline");

  const complete = await processAthenaQueryAsync("Conclua a tarefa Revisar contrato", "geral", ctx, "project-migration", "migration-task");
  await confirmExecute(complete, ctx);
  assert(ctx.tasks[0].status === "concluida", "Task status mutation must be real after confirmation");

  const trashTask = await processAthenaQueryAsync("Excluir a tarefa Revisar contrato", "geral", ctx, "project-migration", "migration-trash-task");
  const trashTaskExecution = await confirmExecute(trashTask, ctx);
  assert(ctx.tasks.length === 0, "Task trash migration must remove the real task");
  await capabilityPlanRuntime.revertWithRegisteredUndo(trashTaskExecution.plan.id, ctx);
  assert(ctx.tasks.some((task) => task.id === "task-migration"), "Task trash undo must restore from the local trash record");

  const trashProject = await processAthenaQueryAsync("Excluir o projeto", "geral", ctx, "project-migration", "migration-trash-project");
  const trashProjectExecution = await confirmExecute(trashProject, ctx);
  assert(ctx.projects.length === 0, "Project trash migration must remove the real project");
  await capabilityPlanRuntime.revertWithRegisteredUndo(trashProjectExecution.plan.id, ctx);
  assert(ctx.projects.some((project) => project.id === "project-migration"), "Project trash undo must restore from the local trash record");

  const createdBefore = ctx.tasks.length;
  const create = await processAthenaQueryAsync("Crie uma tarefa: Validar paridade", "geral", ctx, "project-migration", "migration-create");
  assert(create.metadata?.capabilityPlanStatus === "COMPLETED" && ctx.tasks.length === createdBefore + 1, "Previously migrated task creation must retain parity");

  const beforeOrganize = ctx.tasks.map((task) => ({ ...task }));
  const organize = await processAthenaQueryAsync("Organize as próximas tarefas", "geral", ctx, "project-migration", "migration-organize");
  assert(organize.metadata?.capabilityPlanStatus === "APPROVED" && ctx.tasks.length === beforeOrganize.length, "Composite organization must persist without premature mutation");
  const confirmedOrganization = await processAthenaQueryAsync("confirmar", "geral", ctx, "project-migration", "migration-organize");
  const organizedPendingTasks = ctx.tasks.filter((task) => task.projectId === "project-migration" && task.status !== "concluida");
  assert(confirmedOrganization.metadata?.capabilityPlanStatus === "COMPLETED" && organizedPendingTasks.length === 3, `Conversational confirmation must execute the persisted composite plan (status=${String(confirmedOrganization.metadata?.capabilityPlanStatus)}, pending=${organizedPendingTasks.length}, text=${confirmedOrganization.text})`);
  const undoneOrganization = await processAthenaQueryAsync("desfazer", "geral", ctx, "project-migration", "migration-organize");
  assert(undoneOrganization.metadata?.capabilityPlanStatus === "REVERTED" && ctx.tasks.length === beforeOrganize.length, "Conversational undo must reverse the persisted composite plan");

  const previousPriority = ctx.projects[0].priority;
  const priorityPlan = await processAthenaQueryAsync("Altere a prioridade do projeto para alta", "geral", ctx, "project-migration", "migration-cancel");
  assert(priorityPlan.metadata?.capabilityPlanStatus === "APPROVED", "Sensitive plan must await a persisted decision");
  const cancelled = await processAthenaQueryAsync("cancelar", "geral", ctx, "project-migration", "migration-cancel");
  assert(cancelled.metadata?.capabilityPlanStatus === "CANCELLED" && ctx.projects[0].priority === previousPriority, "Conversational cancellation must preserve state");

  assert(!athenaObservabilityJournal.list().some((entry) => entry.type === "LEGACY_FALLBACK_USED" && String(entry.details?.source).includes("project-operations")), "No active project command may depend on the legacy operations adapter");

  console.log("✓ Canonical plan controls, composite transaction, session recovery, mutation, undo and legacy shutdown verified");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
