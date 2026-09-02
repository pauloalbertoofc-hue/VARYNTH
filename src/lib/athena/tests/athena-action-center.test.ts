import assert from "node:assert/strict";
import { athenaActionCenter } from "../insights/action-center";
import { athenaProjectPlanManager } from "../planning/project-plan-manager";
import { athenaSuggestionCenter } from "../insights/suggestion-center";
import type { AthenaEngineContext } from "../engine";
import type { Project, Task } from "@/lib/types";

let passed = 0;
const test = (name: string, run: () => void) => { run(); passed += 1; console.log(`✓ ${name}`); };
function context(): { ctx: AthenaEngineContext; projects: Project[]; tasks: Task[] } {
  const projects: Project[] = [{ id: "p1", title: "Projeto Atlas", description: "Entrega", category: "software", status: "ativo", priority: "alta", deadline: "2026-09-30", tags: [], createdAt: "2026-01-01", updatedAt: "2026-01-01" }];
  const tasks: Task[] = [{ id: "t1", projectId: "p1", title: "Correção urgente", status: "a_fazer", priority: "urgente", dueDate: "2026-08-30", createdAt: "2026-01-01" }, { id: "t2", projectId: "p1", title: "Entrega próxima", status: "a_fazer", priority: "alta", dueDate: "2026-09-05", createdAt: "2026-01-01" }];
  const ctx: AthenaEngineContext = { projects, tasks, notes: [], vaultItems: [], chronosEvents: [], opportunities: [], theses: [], evidences: [], addTask: (data: Omit<Task, "id" | "createdAt">) => { const task = { ...data, id: `t${tasks.length + 1}`, createdAt: new Date().toISOString() }; tasks.push(task); return task; }, addNote: () => undefined, updateTask: (id: string, changes: Partial<Task>) => { const item = tasks.find((task) => task.id === id); if (item) Object.assign(item, changes); }, updateProject: () => undefined, deleteTask: () => undefined };
  return { ctx, projects, tasks };
}
function reset() { athenaActionCenter.clearForTests(); athenaProjectPlanManager.clearForTests(); athenaSuggestionCenter.clearForTests(); }

test("ordena atraso urgente antes das demais decisões", () => { reset(); const { ctx } = context(); const items = athenaActionCenter.list(ctx, new Date(2026, 8, 2)); assert.equal(items[0].id, "task-overdue:t1"); assert.ok(items[0].reason.includes("precedência")); });
test("inclui tarefas com prazo nos próximos sete dias", () => { reset(); const { ctx } = context(); assert.ok(athenaActionCenter.list(ctx, new Date(2026, 8, 2)).some((item) => item.id === "task-due:t2")); });
test("inclui rascunho como decisão sem executar mudanças", () => { reset(); const { ctx, projects, tasks } = context(); const count = tasks.length; const plan = athenaProjectPlanManager.create("Organize Atlas", projects[0], ctx); const item = athenaActionCenter.list(ctx, new Date(2026, 8, 2)).find((entry) => entry.planId === plan.id && entry.kind === "PLAN_APPROVAL"); assert.ok(item); assert.equal(tasks.length, count); });
test("plano aprovado muda para fila de execução", () => { reset(); const { ctx, projects } = context(); const plan = athenaProjectPlanManager.create("Organize Atlas", projects[0], ctx); athenaProjectPlanManager.approve(plan.id); const items = athenaActionCenter.list(ctx, new Date(2026, 8, 2)); assert.ok(items.some((item) => item.kind === "PLAN_EXECUTION" && item.planId === plan.id)); assert.ok(!items.some((item) => item.kind === "PLAN_APPROVAL" && item.planId === plan.id)); });
test("adiar oculta item até o horário definido", () => { reset(); const { ctx } = context(); athenaActionCenter.setDecision("task-overdue:t1", "adiada", "2026-09-03T12:00:00.000Z"); assert.ok(!athenaActionCenter.list(ctx, new Date("2026-09-02T12:00:00.000Z")).some((item) => item.id === "task-overdue:t1")); assert.ok(athenaActionCenter.list(ctx, new Date("2026-09-04T12:00:00.000Z")).some((item) => item.id === "task-overdue:t1")); });
test("dispensar mantém registro e remove da fila ativa", () => { reset(); const { ctx } = context(); athenaActionCenter.dismiss("task-overdue:t1"); assert.ok(!athenaActionCenter.list(ctx, new Date(2026, 8, 2)).some((item) => item.id === "task-overdue:t1")); assert.equal(athenaActionCenter.list(ctx, new Date(2026, 8, 2), true).find((item) => item.id === "task-overdue:t1")?.decision, "dispensada"); });
test("delegar registra responsável e inicia tarefa", () => { reset(); const { ctx, tasks } = context(); assert.equal(athenaActionCenter.delegate(tasks[0], "Marina", ctx), true); assert.equal(tasks[0].assignedTo, "Marina"); assert.equal(tasks[0].status, "em_progresso"); });
test("delegação vazia é recusada sem alteração", () => { reset(); const { ctx, tasks } = context(); assert.equal(athenaActionCenter.delegate(tasks[0], "  ", ctx), false); assert.equal(tasks[0].assignedTo, undefined); });

console.log(`\n${passed}/8 verificações da Central de Pendências passaram.`);
