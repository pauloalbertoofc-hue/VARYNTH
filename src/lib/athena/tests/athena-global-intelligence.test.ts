import assert from "node:assert/strict";
import { processAthenaQuery } from "../engine";
import { analyzeAthenaState } from "../insights/global-intelligence";
import type { AthenaEngineContext } from "../engine";

const noop = () => undefined;
const ctx: AthenaEngineContext = {
  projects: [
    { id: "p1", title: "Projeto Órbita", description: "Pesquisa lunar", category: "pesquisa", status: "ativo", priority: "alta", deadline: "2026-08-31", tags: ["lua"], createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    { id: "p2", title: "Projeto Finalizado", description: "", category: "software", status: "concluido", priority: "media", tags: [], createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    { id: "p3", title: "Projeto Parado", description: "", category: "pessoal", status: "ativo", priority: "baixa", tags: [], createdAt: "2026-01-01", updatedAt: "2026-01-01" },
  ],
  tasks: [
    { id: "t1", projectId: "p1", title: "Revisar relatório lunar", status: "a_fazer", priority: "urgente", dueDate: "2026-08-30", createdAt: "2026-01-01" },
    { id: "t2", projectId: "p1", title: "Preparar apresentação", status: "a_fazer", priority: "alta", dueDate: "2026-09-03", createdAt: "2026-01-01" },
    { id: "t3", projectId: "p2", title: "Pendência esquecida", status: "a_fazer", priority: "media", createdAt: "2026-01-01" },
    { id: "t4", projectId: "missing", title: "Tarefa órfã", status: "a_fazer", priority: "baixa", createdAt: "2026-01-01" },
  ],
  notes: [{ id: "n1", projectId: "p1", title: "Hipótese lunar", content: "Amostras da cratera", tags: ["lua"], createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  vaultItems: [{ id: "v1", title: "Atlas da Lua", type: "livro", tags: ["astronomia"], category: "ciência", readingStatus: "lendo", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  chronosEvents: [], theses: [], evidences: [],
  opportunities: [{ id: "o1", title: "Bolsa Lunar", institution: "Agência Espacial", deadline: "2026-09-20", requirements: ["pesquisa lunar"], requiredDocs: [], status: "interessado", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  addTask: (() => { throw new Error("not used"); }) as AthenaEngineContext["addTask"],
  addNote: noop,
};

let passed = 0;
function check(name: string, fn: () => void) {
  fn(); passed += 1; console.log(`✓ ${name}`);
}

check("detecta atrasos, prazo próximo, inconsistência, órfã e projeto parado", () => {
  const result = analyzeAthenaState(ctx, undefined, new Date(2026, 8, 1));
  assert.equal(result.overdueTasks.length, 1);
  assert.equal(result.dueSoonTasks.length, 1);
  assert.equal(result.overdueProjects.length, 1);
  assert.equal(result.inconsistentProjects.length, 1);
  assert.equal(result.orphanTasks.length, 1);
  assert.equal(result.stalledProjects.length, 1);
});

check("diagnóstico é fundamentado nos registros", () => {
  const text = processAthenaQuery("Faça um diagnóstico geral", "geral", ctx).text;
  assert.match(text, /Tarefa atrasada/);
  assert.match(text, /Projeto concluído com pendências/);
});

check("briefing ordena tarefa vencida antes da futura", () => {
  const text = processAthenaQuery("O que preciso cuidar hoje?", "geral", ctx).text;
  assert.ok(text.indexOf("Revisar relatório lunar") < text.indexOf("Preparar apresentação"));
});

check("busca projetos", () => assert.match(processAthenaQuery("Encontre Órbita", "geral", ctx).text, /Projeto: Projeto Órbita/));
check("busca tarefas", () => assert.match(processAthenaQuery("Busque relatório lunar", "geral", ctx).text, /Tarefa: Revisar relatório lunar/));
check("busca notas por conteúdo", () => assert.match(processAthenaQuery("Procure amostras da cratera", "geral", ctx).text, /Nota: Hipótese lunar/));
check("busca Vault", () => assert.match(processAthenaQuery("Pesquise Atlas da Lua", "geral", ctx).text, /Vault: Atlas da Lua/));
check("busca oportunidades", () => assert.match(processAthenaQuery("Encontre Bolsa Lunar", "geral", ctx).text, /Oportunidade: Bolsa Lunar/));
check("busca sem resultado admite ausência", () => assert.match(processAthenaQuery("Encontre matéria escura", "geral", ctx).text, /Não encontrei/));
check("busca em projeto não vaza registros globais", () => assert.doesNotMatch(processAthenaQuery("Encontre Atlas da Lua", "geral", ctx, "p1").text, /Vault: Atlas/));
check("diagnóstico de projeto fica no escopo", () => assert.doesNotMatch(processAthenaQuery("Diagnóstico do projeto", "geral", ctx, "p1").text, /Pendência esquecida/));
check("consulta sem termo pede termo", () => assert.match(processAthenaQuery("Busque", "geral", ctx).text, /Diga o termo/));

console.log(`\n${passed}/12 testes da inteligência global aprovados.`);
