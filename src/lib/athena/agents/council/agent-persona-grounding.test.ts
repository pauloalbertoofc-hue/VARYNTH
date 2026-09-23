import assert from "node:assert/strict";
import { agentRegistry } from "../registry";
import { athenaGeneralistAgent } from "./athena-generalist";
import { justitiaAgent } from "./justitia";
import { logosAgent } from "./logos";
import { sophiaAgent } from "./sophia";
import { musaAgent } from "./musa";
import { strategosAgent } from "./strategos";
import { critiasAgent } from "./critias";
import { archivistAgent } from "./archivist";
import { mnemosyneAgent } from "./mnemosyne";
import { bibliotecarioAgent } from "./bibliotecario";
import { curadorPesquisaAgent } from "./curador-pesquisa";
import { euterpeAgent } from "./music-curator";
import type { AthenaContext } from "../../domain/context";
import type { AthenaTask } from "../../domain/task";

const agents = [athenaGeneralistAgent, justitiaAgent, logosAgent, sophiaAgent, musaAgent, strategosAgent, critiasAgent, archivistAgent, mnemosyneAgent, bibliotecarioAgent, curadorPesquisaAgent, euterpeAgent];
const personas = agents.map((agent) => agent.manifest.persona);
for (const agent of agents) {
  const persona = agent.manifest.persona;
  assert.ok(persona.identity.length > 30, `${agent.manifest.id} needs a distinct identity`);
  assert.ok(persona.home.length > 10, `${agent.manifest.id} needs a domain home`);
  assert.ok(persona.voice.length > 8, `${agent.manifest.id} needs a voice`);
  assert.ok(persona.evidenceBoundary.length > 20, `${agent.manifest.id} needs an evidence boundary`);
  assert.ok(persona.authorityBoundary.length > 20, `${agent.manifest.id} needs an authority boundary`);
}
assert.equal(new Set(personas.map((persona) => persona.identity)).size, agents.length, "Every subagent must have its own identity");
assert.equal(agentRegistry.listAgents().length, agents.length, "All persona-bearing agents must be registered");

const ctx = { scope: "geral", relevantProjects: [], relevantTasks: [], relevantVaultItems: [], relevantChronosEvents: [], relevantTheses: [], relevantEvidences: [], relevantOpportunities: [], systemTime: "2026-09-23T12:00:00.000Z" } as unknown as AthenaContext;
const task = (rawPrompt: string): AthenaTask => ({ id: "agent-grounding", title: rawPrompt, rawPrompt, type: "GENERAL_DELIBERATION", priority: "media", status: "CREATED", scope: "geral", entities: {}, createdAt: "", updatedAt: "" });

void (async () => {
  const legal = await justitiaAgent.execute(task("Analise a legislação aplicável"), ctx);
  assert.match(legal.content, /não recebi.*tese formal/i);
  assert.equal(legal.metadata?.legalAdvice, false);
  const research = await logosAgent.execute(task("Analise esta pesquisa"), ctx);
  assert.match(research.content, /não recebi evidências catalogadas/i);
  assert.equal(research.metadata?.externalSearchPerformed, false);
  const draft = await sophiaAgent.execute(task("Escreva um texto"), ctx);
  assert.match(draft.content, /ainda não recebi um trecho/i);
  assert.ok(draft.confidence < 0.5);
  const ideas = await musaAgent.execute(task("Me dê ideias para um novo produto"), ctx);
  assert.match(ideas.content, /provocações criativas, não fatos/i);
  assert.equal(ideas.metadata?.persistedToLabs, false);
  const strategy = await strategosAgent.execute(task("Como está minha produtividade?"), ctx);
  assert.match(strategy.content, /não recebi tarefas/i);
  const critique = await critiasAgent.execute(task("Critique minha ideia"), ctx);
  assert.match(critique.content, /falta o objeto/i);
  assert.equal(critique.metadata?.verifiedDefect, false);
  const memory = await mnemosyneAgent.execute(task("O que você lembra sobre um projeto ausente?"), ctx);
  assert.equal(memory.metadata?.queriedGraph, false);
  assert.match(memory.content, /não consultei o Graph/i);
  console.log("Agent personas and evidence/authority grounding passed across all registered specialists.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
