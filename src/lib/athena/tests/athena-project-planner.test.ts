import assert from "node:assert/strict";
import { athenaProjectPlanManager } from "../planning/project-plan-manager";
import { processAthenaQuery } from "../engine";
import type { AthenaEngineContext } from "../engine";
import type { Project, Task } from "@/lib/types";

function makeContext(failOnCreate = 0) {
  const projects: Project[] = [{ id: "p1", title: "Projeto Atlas", description: "Entrega estratégica", category: "software", status: "ativo", priority: "media", deadline: "2026-09-30", tags: [], createdAt: "2026-01-01", updatedAt: "2026-01-01" }];
  const tasks: Task[] = [{ id: "t1", projectId: "p1", title: "Preparar base", status: "a_fazer", priority: "media", createdAt: "2026-01-01" }];
  let createCount = 0;
  const ctx: AthenaEngineContext = {
    projects, tasks, notes: [], vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [],
    addTask(data) { createCount += 1; if (failOnCreate && createCount === failOnCreate) throw new Error("falha simulada"); const task = { ...data, id: `created-${createCount}`, createdAt: new Date().toISOString() } as Task; tasks.push(task); return task; },
    addNote: () => undefined,
    updateProject(id, updates) { const item = projects.find((project) => project.id === id); if (item) Object.assign(item, updates); },
    updateTask(id, updates) { const item = tasks.find((task) => task.id === id); if (item) Object.assign(item, updates); },
    deleteTask(id) { const index = tasks.findIndex((task) => task.id === id); if (index >= 0) tasks.splice(index, 1); },
  };
  return { ctx, projects, tasks };
}

let passed = 0;
function check(name: string, run: () => void) { run(); passed += 1; console.log(`✓ ${name}`); }
athenaProjectPlanManager.clearForTests();

check("comando natural cria plano sem mutação", () => {
  const { ctx, projects, tasks } = makeContext();
  const before = JSON.stringify({ projects, tasks });
  const response = processAthenaQuery("Organize o projeto Atlas para entrega em 10/09/2026", "geral", ctx, "p1", "planner");
  assert.match(response.text, /Nenhuma alteração foi aplicada/);
  assert.equal(JSON.stringify({ projects, tasks }), before);
  assert.equal(athenaProjectPlanManager.list().length, 1);
});

check("plano contém objetivo, resultado, etapas, riscos e dados ausentes", () => {
  const plan = athenaProjectPlanManager.list()[0];
  assert.ok(plan.objective);
  assert.ok(plan.expectedResult);
  assert.ok(plan.steps.length >= 3);
  assert.ok(Array.isArray(plan.risks) && Array.isArray(plan.missingData));
});

check("revisão altera hash e incrementa versão", () => {
  const plan = athenaProjectPlanManager.list()[0];
  const revised = athenaProjectPlanManager.revise(plan.id, { objective: "Organizar Atlas com validação final" });
  assert.equal(revised?.revision, 2);
  assert.notEqual(revised?.planHash, plan.planHash);
});

check("aprovação congela o hash exato", () => {
  const plan = athenaProjectPlanManager.list()[0];
  const approved = athenaProjectPlanManager.approve(plan.id);
  assert.equal(approved?.status, "APROVADO");
  assert.equal(approved?.approvedHash, approved?.planHash);
});

check("plano aprovado executa todas as etapas", () => {
  const { ctx, projects, tasks } = makeContext();
  const plan = athenaProjectPlanManager.list()[0];
  const result = athenaProjectPlanManager.execute(plan.id, ctx);
  assert.equal(result.success, true);
  assert.equal(result.plan?.status, "CONCLUIDO");
  assert.ok(result.plan?.steps.every((step) => step.status === "CONCLUIDA"));
  assert.equal(projects[0].deadline, "2026-09-10");
  assert.ok(tasks.length >= 3);
});

check("desfazer restaura projeto e tarefas originais", () => {
  const { ctx, projects, tasks } = makeContext();
  athenaProjectPlanManager.clearForTests();
  const plan = athenaProjectPlanManager.create("Organize para 12/09/2026", projects[0], ctx);
  athenaProjectPlanManager.approve(plan.id);
  athenaProjectPlanManager.execute(plan.id, ctx);
  assert.equal(athenaProjectPlanManager.undo(plan.id, ctx).success, true);
  assert.equal(projects[0].deadline, "2026-09-30");
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].priority, "media");
  assert.equal(athenaProjectPlanManager.get(plan.id)?.status, "DESFEITO");
});

check("rejeição preserva o estado", () => {
  const { ctx, projects, tasks } = makeContext();
  athenaProjectPlanManager.clearForTests();
  const before = JSON.stringify({ projects, tasks });
  const plan = athenaProjectPlanManager.create("Prepare o projeto", projects[0], ctx);
  assert.equal(athenaProjectPlanManager.reject(plan.id), true);
  assert.equal(JSON.stringify({ projects, tasks }), before);
});

check("execução sem aprovação é bloqueada", () => {
  const { ctx, projects } = makeContext();
  athenaProjectPlanManager.clearForTests();
  const plan = athenaProjectPlanManager.create("Organize o projeto", projects[0], ctx);
  assert.equal(athenaProjectPlanManager.execute(plan.id, ctx).success, false);
});

check("falha intermediária aciona rollback compensatório", () => {
  const { ctx, projects, tasks } = makeContext(2);
  athenaProjectPlanManager.clearForTests();
  const before = JSON.stringify({ projects, tasks });
  const plan = athenaProjectPlanManager.create("Organize para 15/09/2026", projects[0], ctx);
  athenaProjectPlanManager.approve(plan.id);
  const result = athenaProjectPlanManager.execute(plan.id, ctx);
  assert.equal(result.success, false);
  assert.equal(result.plan?.status, "FALHOU");
  assert.equal(JSON.stringify({ projects, tasks }), before);
  assert.ok(result.plan?.events.some((item) => item.type === "ROLLBACK"));
});

check("histórico registra criação, aprovação e execução", () => {
  const plan = athenaProjectPlanManager.list()[0];
  assert.ok(plan.events.some((item) => item.type === "CREATED"));
  assert.ok(plan.events.some((item) => item.type === "APPROVED"));
  assert.ok(plan.events.some((item) => item.type === "ROLLBACK"));
});

console.log(`\n${passed}/10 testes do Planejador de Projetos aprovados.`);
