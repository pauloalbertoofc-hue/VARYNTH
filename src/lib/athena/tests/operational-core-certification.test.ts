import type { Project, Task } from "@/lib/types";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { processAthenaQueryAsync, type AthenaEngineContext } from "../engine";
import { athenaContextBuilder } from "../memory/context-builder";
import { athenaObservabilityJournal } from "../observability/local-observability-journal";
import { capabilityPlanRuntime } from "../runtime/capability-plan-runtime";
import { capabilityPlanStore } from "../runtime/capability-plan-store";
import { CapabilityPlanStore } from "../runtime/capability-plan-store";
import { executableCapabilityRegistry } from "../kernel/executable-capability-registry";
import { registeredTools } from "../tools/registry";
import { athenaGuardrailPolicy, REQUIRED_GUARDRAILS } from "../runtime/guardrail-policy";

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
  assert(!existsSync(resolve(process.cwd(), "src/lib/athena/operations/project-operations.ts")), "Removed legacy operations adapter must not return to the source tree");
  const engineSource = readFileSync(resolve(process.cwd(), "src/lib/athena/engine.ts"), "utf8");
  const workflowExecutorSource = readFileSync(resolve(process.cwd(), "src/lib/athena/runtime/workflow-executor.ts"), "utf8");
  const localCoreSource = [engineSource, workflowExecutorSource, readFileSync(resolve(process.cwd(), "src/lib/athena/runtime/capability-plan-runtime.ts"), "utf8"), readFileSync(resolve(process.cwd(), "src/lib/athena/tools/tool-manager.ts"), "utf8")].join("\n");
  assert(!engineSource.includes("AthenaProjectOperations") && !engineSource.includes("legacyOperationsCompatibilityEnabled"), "No parallel operational executor or compatibility switch may exist");
  assert(workflowExecutorSource.includes("athenaToolManager.executeTool"), "Operational workflows must cross the ToolManager boundary");
  assert(!/\bfetch\s*\(|\baxios\b|https?:\/\//.test(localCoreSource), "Certified operational core must not introduce network calls");
  for (const capability of executableCapabilityRegistry.list()) {
    if (capability.kind === "AGENT") assert(!capability.mutatesData && capability.authority === "PROPOSE", `Agent ${capability.id} must never own mutations`);
    if (capability.mutatesData) assert(capability.kind === "TOOL" && Boolean(registeredTools[capability.id as keyof typeof registeredTools]), `Mutation ${capability.id} must be a registered tool`);
    if (capability.supportsUndo) assert(Boolean(registeredTools[capability.id as keyof typeof registeredTools]?.undo), `Reversible capability ${capability.id} must expose concrete undo`);
  }
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

  const concurrentPlanResponse = await processAthenaQueryAsync("Altere a prioridade do projeto para alta", "geral", ctx, "project-migration", "certification-concurrency");
  const concurrentPlan = capabilityPlanStore.get(concurrentPlanResponse.metadata?.capabilityPlanId as string)!;
  capabilityPlanRuntime.confirmStep(concurrentPlan.id, concurrentPlan.steps[0].id);
  let duplicateConfirmationRejected = false;
  try { capabilityPlanRuntime.confirmStep(concurrentPlan.id, concurrentPlan.steps[0].id); } catch (error) { duplicateConfirmationRejected = String(error).includes("CAPABILITY_STEP_ALREADY_CONFIRMED"); }
  assert(duplicateConfirmationRejected, "A sensitive step must reject duplicate confirmation receipts");
  const concurrentContext = athenaContextBuilder.buildContext(concurrentPlan.sourceTask, "geral", ctx, concurrentPlan.projectId);
  const concurrentResults = await Promise.allSettled([
    capabilityPlanRuntime.execute(concurrentPlan.id, concurrentContext, ctx),
    capabilityPlanRuntime.execute(concurrentPlan.id, concurrentContext, ctx),
  ]);
  assert(concurrentResults.filter((result) => result.status === "fulfilled").length === 1 && concurrentResults.some((result) => result.status === "rejected" && String(result.reason).includes("CAPABILITY_PLAN_CONCURRENT_OPERATION")), "Concurrent execution of the same plan must fail closed");
  const concurrentUndoResults = await Promise.allSettled([
    capabilityPlanRuntime.revertWithRegisteredUndo(concurrentPlan.id, ctx),
    capabilityPlanRuntime.revertWithRegisteredUndo(concurrentPlan.id, ctx),
  ]);
  assert(concurrentUndoResults.filter((result) => result.status === "fulfilled").length === 1 && concurrentUndoResults.some((result) => result.status === "rejected" && String(result.reason).includes("CAPABILITY_PLAN_CONCURRENT_OPERATION")), "Concurrent undo of the same plan must fail closed");

  const isolatedA = await processAthenaQueryAsync("Altere a prioridade do projeto para baixa", "geral", ctx, "project-migration", "certification-session-a");
  const isolatedB = await processAthenaQueryAsync("Atualize o prazo do projeto para 20/12/2026", "geral", ctx, "project-migration", "certification-session-b");
  await processAthenaQueryAsync("confirmar", "geral", ctx, "project-migration", "certification-session-a");
  assert(capabilityPlanStore.get(isolatedA.metadata?.capabilityPlanId as string)?.status === "COMPLETED", "Confirmation must execute the matching session plan");
  assert(capabilityPlanStore.get(isolatedB.metadata?.capabilityPlanId as string)?.status === "APPROVED" && String(ctx.projects[0].deadline) !== "2026-12-20", "A confirmation must not cross session boundaries");

  ctx.projects.push({ ...ctx.projects[0], id: "project-isolated", title: "Projeto Isolado", priority: "media" });
  const projectPlanA = await processAthenaQueryAsync("Altere a prioridade do projeto para alta", "geral", ctx, "project-migration", "certification-project-scope");
  const projectPlanB = await processAthenaQueryAsync("Altere a prioridade do projeto para baixa", "geral", ctx, "project-isolated", "certification-project-scope");
  await processAthenaQueryAsync("confirmar", "geral", ctx, "project-isolated", "certification-project-scope");
  assert(capabilityPlanStore.get(projectPlanA.metadata?.capabilityPlanId as string)?.status === "APPROVED", "Confirmation must not cross project boundaries");
  assert(capabilityPlanStore.get(projectPlanB.metadata?.capabilityPlanId as string)?.status === "COMPLETED" && ctx.projects.find((project) => project.id === "project-isolated")?.priority === "baixa", "Confirmation must execute only the matching project plan");

  const validPersistedPlan = capabilityPlanStore.get(isolatedB.metadata?.capabilityPlanId as string)!;
  const previousWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: {
    localStorage: { getItem: () => JSON.stringify([validPersistedPlan, { id: "corrupted-plan" }]), setItem: () => undefined },
    dispatchEvent: () => undefined,
  } });
  const partiallyRecovered = new CapabilityPlanStore();
  assert(partiallyRecovered.list().length === 1 && !partiallyRecovered.getLoadHealth().healthy && partiallyRecovered.getLoadHealth().rejectedEntries === 1, "Partial local corruption must preserve only structurally valid plans");
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: {
    localStorage: { getItem: () => "{invalid-json", setItem: () => undefined }, dispatchEvent: () => undefined,
  } });
  const fullyCorrupted = new CapabilityPlanStore();
  assert(fullyCorrupted.list().length === 0 && !fullyCorrupted.getLoadHealth().healthy, "Fully corrupted local storage must recover empty and fail closed");
  if (previousWindow === undefined) Reflect.deleteProperty(globalThis, "window");
  else Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: previousWindow });

  athenaGuardrailPolicy.reset();
  assert(athenaGuardrailPolicy.get().serializePlanOperations && athenaGuardrailPolicy.get().rejectDuplicateConfirmations, "Adjustable guardrails must be enabled by default");
  assert(!athenaGuardrailPolicy.set("rejectDuplicateConfirmations", false).rejectDuplicateConfirmations, "User must be able to disable an adjustable guardrail locally");
  assert(REQUIRED_GUARDRAILS.length === 4, "Mandatory guardrails must remain outside the adjustable settings");
  athenaGuardrailPolicy.reset();

  assert(!athenaObservabilityJournal.list().some((entry) => entry.type === "LEGACY_FALLBACK_USED" && String(entry.details?.source).includes("project-operations")), "No active project command may depend on the legacy operations adapter");

  console.log("✓ Operational core certified: invariants, concurrency, isolation, recovery, undo and single execution boundary verified");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
