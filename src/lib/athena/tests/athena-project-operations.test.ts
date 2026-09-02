import { processAthenaQuery } from "../engine";
import { Note, Project, Task } from "@/lib/types";

let projects: Project[] = [{
  id: "proj-op-1",
  title: "Projeto Operacional",
  description: "Teste de comandos reais",
  category: "software",
  status: "ativo",
  priority: "media",
  tags: [],
  createdAt: "2026-09-01",
  updatedAt: "2026-09-01",
}];
let tasks: Task[] = [];
let notes: Note[] = [];
let sequence = 0;

const ctx: any = {
  get projects() { return projects; },
  get tasks() { return tasks; },
  get notes() { return notes; },
  vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [],
  addTask: (data: any) => {
    const created = { ...data, id: `task-op-${++sequence}`, createdAt: new Date().toISOString() };
    tasks = [created, ...tasks];
    return created;
  },
  addNote: (data: any) => {
    const created = { ...data, id: `note-op-${++sequence}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    notes = [created, ...notes];
    return created;
  },
  updateProject: (id: string, updates: Partial<Project>) => { projects = projects.map((project) => project.id === id ? { ...project, ...updates } : project); },
  updateTask: (id: string, updates: Partial<Task>) => { tasks = tasks.map((task) => task.id === id ? { ...task, ...updates } : task); },
  deleteTask: (id: string) => { tasks = tasks.filter((task) => task.id !== id); },
};

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ✅ PASS: ${label}`); }
  else { failed++; console.error(`  ❌ FAIL: ${label}`); }
}

function ask(prompt: string, session = "op-main") {
  return processAthenaQuery(prompt, "geral", ctx, "proj-op-1", session);
}

console.log("\n===============================================================");
console.log("  ATHENA PROJECT OPERATIONS REGRESSION SUITE");
console.log("===============================================================\n");

const createTask = ask("Crie uma tarefa: Publicar relatório com prioridade alta para 15/09/2026");
assert(tasks.length === 1 && tasks[0].projectId === "proj-op-1", "Criação vincula tarefa ao projeto em contexto");
assert(tasks[0].priority === "alta" && tasks[0].dueDate === "2026-09-15", "Criação interpreta prioridade e prazo");
assert(createTask.text.includes("criada") && createTask.text.includes("Projeto Operacional"), "Relatório confirma a mutação real");

ask("Crie uma nota: Decisão arquitetural validada");
assert(notes.length === 1 && notes[0].projectId === "proj-op-1", "Nota é criada e vinculada ao projeto");

ask("Mude o prazo deste projeto para 30/09/2026");
assert(projects[0].deadline === "2026-09-30", "Prazo do projeto é atualizado");
ask("desfazer");
assert(projects[0].deadline === undefined, "Desfazer restaura prazo anterior");

ask("Mude a prioridade do projeto para urgente");
assert(projects[0].priority === "urgente", "Prioridade do projeto é atualizada");

ask("Conclua a tarefa Publicar relatório");
assert(tasks[0].status === "concluida", "Tarefa identificada por título é concluída");
ask("desfazer");
assert(tasks[0].status === "a_fazer", "Desfazer restaura status da tarefa");

const archivePreview = ask("Arquive este projeto");
assert(projects[0].status === "ativo" && archivePreview.text.includes("confirmar"), "Arquivamento exige confirmação e não muta antes dela");
ask("cancelar");
assert(projects[0].status === "ativo", "Cancelamento preserva o projeto");
ask("Arquive este projeto");
ask("confirmar");
assert(projects[0].status === "arquivado", "Confirmação aplica arquivamento");
ask("desfazer");
assert(projects[0].status === "ativo", "Desfazer restaura projeto arquivado");

const beforePlanTasks = tasks.length;
const proposal = ask("Analise o projeto e organize minhas próximas três tarefas", "op-plan");
assert(tasks.length === beforePlanTasks && proposal.text.includes("confirmar"), "Comando composto apresenta proposta sem executar");
ask("confirmar", "op-plan");
assert(tasks.length === 3 && tasks[0].projectId === "proj-op-1", "Confirmação aplica plano de três tarefas");

const noPending = ask("confirmar", "empty-session");
assert(noPending.text.includes("Não há nenhuma alteração pendente"), "Confirmação solta não concede autoridade");

console.log(`\nRESULTADO: ${passed} aprovados, ${failed} falhas\n`);
if (failed) process.exit(1);
