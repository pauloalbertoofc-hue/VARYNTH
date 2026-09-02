import assert from "node:assert/strict";
import { athenaSuggestionCenter } from "../insights/suggestion-center";
import type { AthenaEngineContext } from "../engine";

const ctx: AthenaEngineContext = {
  projects: [{ id: "p1", title: "Projeto sem ação", description: "", category: "software", status: "ativo", priority: "alta", deadline: "2026-08-20", tags: [], createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  tasks: [], notes: [], vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [],
  addTask: (() => { throw new Error("not used"); }) as AthenaEngineContext["addTask"], addNote: () => undefined,
};

let passed = 0;
function check(name: string, run: () => void) { run(); passed += 1; console.log(`✓ ${name}`); }
const now = new Date(2026, 8, 1, 10);
athenaSuggestionCenter.clearForTests();

check("gera sugestões estáveis a partir do diagnóstico", () => {
  const first = athenaSuggestionCenter.list(ctx, now);
  const second = athenaSuggestionCenter.list(ctx, now);
  assert.equal(first.length, 2);
  assert.deepEqual(first.map((item) => item.id), second.map((item) => item.id));
});

check("ignorar persiste no histórico", () => {
  const item = athenaSuggestionCenter.list(ctx, now)[0];
  athenaSuggestionCenter.setStatus(item.id, "ignorada");
  assert.equal(athenaSuggestionCenter.list(ctx, now).find((entry) => entry.id === item.id)?.status, "ignorada");
});

check("aceitar persiste decisão", () => {
  const item = athenaSuggestionCenter.list(ctx, now)[1];
  athenaSuggestionCenter.setStatus(item.id, "aceita");
  assert.equal(athenaSuggestionCenter.list(ctx, now).find((entry) => entry.id === item.id)?.status, "aceita");
});

check("adiamento permanece até a data escolhida", () => {
  athenaSuggestionCenter.clearForTests();
  const item = athenaSuggestionCenter.list(ctx, now)[0];
  athenaSuggestionCenter.setStatus(item.id, "adiada", "2026-09-02T10:00:00.000Z");
  assert.equal(athenaSuggestionCenter.list(ctx, now).find((entry) => entry.id === item.id)?.status, "adiada");
});

check("adiamento expirado volta a ficar ativo", () => {
  const item = athenaSuggestionCenter.list(ctx, new Date(2026, 8, 3, 10))[0];
  assert.equal(item.status, "ativa");
});

console.log(`\n${passed}/5 testes da central de sugestões aprovados.`);
