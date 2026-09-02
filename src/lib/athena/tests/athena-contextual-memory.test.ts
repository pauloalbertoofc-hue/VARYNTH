import assert from "node:assert/strict";
import { processAthenaQuery } from "../engine";
import { athenaContextualMemory } from "../memory/contextual-memory";
import type { AthenaEngineContext } from "../engine";

const base: AthenaEngineContext = {
  projects: [{ id: "p1", title: "Projeto Memória", description: "", category: "software", status: "ativo", priority: "media", tags: [], createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  tasks: [{ id: "t1", projectId: "p1", title: "Definir arquitetura", status: "a_fazer", priority: "alta", createdAt: "2026-01-01" }],
  notes: [], vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [],
  addTask: (() => { throw new Error("not used"); }) as AthenaEngineContext["addTask"],
  addNote: () => undefined,
};

let passed = 0;
function check(name: string, run: () => void) { run(); passed += 1; console.log(`✓ ${name}`); }

athenaContextualMemory.clearForTests();

check("registra preferência explícita", () => {
  const result = processAthenaQuery("Eu prefiro respostas objetivas", "geral", base, undefined, "memory-global");
  assert.match(result.text, /Registrei.*preferencia/);
  assert.equal(athenaContextualMemory.getFacts().length, 1);
});

check("não duplica a mesma memória", () => {
  processAthenaQuery("Eu prefiro respostas objetivas", "geral", base, undefined, "memory-global");
  assert.equal(athenaContextualMemory.getFacts().length, 1);
});

check("registra decisão vinculada ao projeto", () => {
  processAthenaQuery("Decidimos que TypeScript será o padrão", "geral", base, "p1", "memory-project");
  assert.equal(athenaContextualMemory.getFacts("p1").length, 2);
});

check("edita memória preservando identidade", () => {
  const fact = athenaContextualMemory.getFacts().find((item) => item.text.includes("respostas objetivas"));
  assert.ok(fact);
  const updated = athenaContextualMemory.updateFact(fact.id, "respostas objetivas e curtas");
  assert.equal(updated?.id, fact.id);
  assert.match(updated?.text || "", /curtas/);
  assert.ok(updated?.updatedAt);
});

check("exclui somente a memória selecionada", () => {
  const fact = athenaContextualMemory.getFacts().find((item) => item.text.includes("curtas"));
  assert.ok(fact);
  assert.equal(athenaContextualMemory.deleteFact(fact.id), true);
  assert.equal(athenaContextualMemory.getFacts().some((item) => item.id === fact.id), false);
  processAthenaQuery("Eu prefiro respostas objetivas", "geral", base, undefined, "memory-global");
});

check("recupera fatos explícitos", () => {
  const result = processAthenaQuery("O que você lembra?", "geral", base, undefined, "memory-global");
  assert.match(result.text, /respostas objetivas/);
  assert.match(result.text, /TypeScript/);
});

check("checkpoint permite retomar conversa", () => {
  athenaContextualMemory.recordInteraction("Como estruturar a arquitetura?", "Comece separando domínio e interface.", base, "resume-session", "p1");
  const result = processAthenaQuery("Continue de onde paramos", "geral", base, "p1", "resume-session");
  assert.match(result.text, /Como estruturar a arquitetura/);
  assert.match(result.text, /domínio e interface/);
});

check("continuidade atravessa sessões pela última conversa", () => {
  const result = processAthenaQuery("Retome nossa conversa", "geral", base, undefined, "new-session");
  assert.match(result.text, /Como estruturar a arquitetura/);
});

check("comando de continuidade não substitui o assunto original", () => {
  const first = processAthenaQuery("Continue de onde paramos", "geral", base, "p1", "resume-session");
  athenaContextualMemory.recordInteraction("Continue de onde paramos", first.text, base, "resume-session", "p1");
  const second = processAthenaQuery("Continue de onde paramos", "geral", base, "p1", "resume-session");
  assert.match(second.text, /Como estruturar a arquitetura/);
});

check("detecta nova tarefa desde o checkpoint", () => {
  const changed: AthenaEngineContext = { ...base, tasks: [...base.tasks, { id: "t2", projectId: "p1", title: "Criar protótipo", status: "a_fazer", priority: "media", createdAt: "2026-09-01" }] };
  const result = processAthenaQuery("O que mudou desde nossa última conversa?", "geral", changed, "p1", "resume-session");
  assert.match(result.text, /Nova tarefa.*Criar protótipo/);
});

check("detecta atualização de tarefa", () => {
  const changed: AthenaEngineContext = { ...base, tasks: [{ ...base.tasks[0], status: "concluida", completedAt: "2026-09-01" }] };
  const result = processAthenaQuery("O que mudou desde nossa última conversa?", "geral", changed, "p1", "resume-session");
  assert.match(result.text, /Tarefa atualizada.*Definir arquitetura/);
});

check("informa quando não houve mudança", () => {
  const result = processAthenaQuery("O que mudou desde nossa última conversa?", "geral", base, "p1", "resume-session");
  assert.match(result.text, /não detectei mudanças/);
});

check("sem checkpoint admite ausência", () => {
  athenaContextualMemory.clearForTests();
  const result = processAthenaQuery("Continue de onde paramos", "geral", base, undefined, "empty");
  assert.match(result.text, /Ainda não tenho/);
});

console.log(`\n${passed}/13 testes da memória contextual aprovados.`);
