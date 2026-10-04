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
import { prepareAgentConversationHistory, resolveAgentFollowUp } from "../base-agent";
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

const followUpContext = { recentConversation: [
  { role: "user" as const, text: "Quero um texto sobre preservação de rios." },
  { role: "athena" as const, text: "Posso ajudar com um rascunho." },
] } as unknown as AthenaContext;
const resolvedFollowUp = resolveAgentFollowUp("Escreva mais sobre isso.", followUpContext);
assert.equal(resolvedFollowUp.usedHistory, true);
assert.match(resolvedFollowUp.prompt, /preservação de rios/i);
assert.equal(resolveAgentFollowUp("Explique preservação de rios", followUpContext).usedHistory, false, "Explicit current topics must not be overwritten by history");
assert.equal(resolveAgentFollowUp("E literatura brasileira?", followUpContext).usedHistory, false, "A new explicit topic joined by 'e' must not inherit the previous subject");
assert.equal(resolveAgentFollowUp("E os riscos?", followUpContext).usedHistory, true, "Short risk follow-ups should inherit the prior user subject");
assert.equal(resolveAgentFollowUp("Por quê?", followUpContext).usedHistory, true, "Short why follow-ups should inherit the prior user subject");
assert.equal(resolveAgentFollowUp("E literatura brasileira?", { recentConversation: [...(followUpContext.recentConversation ?? []), { role: "user", text: "E literatura brasileira?" }] } as unknown as AthenaContext).usedHistory, false, "The current message must not become its own historical referent");
const suppliedHistory = prepareAgentConversationHistory([
  { role: "user", text: "Quero um texto sobre preservação de rios." },
  { role: "athena", text: "Posso ajudar com um rascunho." },
  { role: "user", text: "Escreva mais sobre isso." },
], "Escreva mais sobre isso.");
assert.equal(suppliedHistory.length, 2, "The current message is removed from the prior-turn packet");
assert.match(suppliedHistory[0].text, /preservação de rios/i);

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
  assert.match(draft.content, /falta o assunto/i);
  assert.equal(draft.metadata?.draftGenerated, false);
  const scopedDraft = await sophiaAgent.execute(task("Escreva um texto sobre preservação de rios para estudantes do ensino médio."), ctx);
  assert.match(scopedDraft.content, /Texto-base — preservação de rios/i);
  assert.match(scopedDraft.content, /Público: estudantes do ensino médio/i);
  assert.match(scopedDraft.content, /ponto de partida editável/i);
  assert.match(scopedDraft.content, /nenhuma fonte foi consultada/i);
  assert.equal(scopedDraft.metadata?.draftGenerated, true);
  assert.equal(scopedDraft.metadata?.citedExternalSources, false);
  const contextualDraft = await sophiaAgent.execute(task("Escreva mais sobre isso."), { ...ctx, ...followUpContext });
  assert.match(contextualDraft.content, /preservação de rios/i);
  assert.equal(contextualDraft.metadata?.conversationReferenceResolved, true);
  const thesisDraft = await sophiaAgent.execute(task("Redija um artigo sobre educação pública. Defenda que investir em bibliotecas amplia oportunidades."), ctx);
  assert.match(thesisDraft.content, /investir em bibliotecas amplia oportunidades/i);
  assert.equal(thesisDraft.metadata?.topic, "educação pública");
  const emailDraft = await sophiaAgent.execute(task("Escreva um e-mail sobre reunião de planejamento para a equipe de design."), ctx);
  assert.match(emailDraft.content, /Olá,/);
  assert.match(emailDraft.content, /E-mail — reunião de planejamento/i);
  const ideas = await musaAgent.execute(task("Me dê ideias para um novo produto"), ctx);
  assert.match(ideas.content, /provocações criativas, não fatos/i);
  assert.equal(ideas.metadata?.persistedToLabs, false);
  const contextualIdeas = await musaAgent.execute(task("Desenvolva isso"), { ...ctx, ...followUpContext });
  assert.match(contextualIdeas.content, /preservação de rios/i);
  assert.equal(contextualIdeas.metadata?.conversationReferenceResolved, true);
  const strategy = await strategosAgent.execute(task("Como está minha produtividade?"), ctx);
  assert.match(strategy.content, /não recebi tarefas/i);
  const critique = await critiasAgent.execute(task("Critique minha ideia"), ctx);
  assert.match(critique.content, /falta o objeto/i);
  assert.equal(critique.metadata?.verifiedDefect, false);
  const contextualCritique = await critiasAgent.execute(task("E os riscos disso?"), {
    ...ctx,
    recentConversation: [{ role: "user", text: "Avalie a proposta: “Criar um canal público de denúncias sem explicar como os relatos serão verificados.”" }],
  });
  assert.match(contextualCritique.content, /Criar um canal público de denúncias/i);
  assert.equal(contextualCritique.metadata?.conversationReferenceResolved, true);
  assert.equal(contextualCritique.metadata?.verifiedDefect, false, "Grounding the object must not turn an unverified concern into a proven defect");
  const contextualLegal = await justitiaAgent.execute(task("Quais os riscos?"), { ...ctx, ...followUpContext });
  assert.equal(contextualLegal.metadata?.conversationReferenceResolved, true);
  const contextualResearch = await logosAgent.execute(task("Explique isso melhor"), { ...ctx, ...followUpContext });
  assert.match(contextualResearch.content, /preservação de rios/i);
  assert.equal(contextualResearch.metadata?.conversationReferenceResolved, true);
  const contextualCurator = await curadorPesquisaAgent.execute(task("E as fontes?"), { ...ctx, ...followUpContext });
  assert.match(contextualCurator.content, /preservação de rios/i);
  assert.equal(contextualCurator.metadata?.conversationReferenceResolved, true);
  const contextualStrategy = await strategosAgent.execute(task("Continue"), { ...ctx, ...followUpContext });
  assert.equal(contextualStrategy.metadata?.conversationReferenceResolved, true);
  const memory = await mnemosyneAgent.execute(task("O que você lembra sobre um projeto ausente?"), ctx);
  assert.equal(memory.metadata?.queriedGraph, false);
  assert.match(memory.content, /não consultei o Graph/i);
  const contextualMemory = await mnemosyneAgent.execute(task("O que mais?"), {
    ...ctx,
    recentConversation: [{ role: "user", text: "Lembre o projeto Sensor Cívico" }],
    relevantProjects: [{ title: "Sensor Cívico", description: "Preservação de rios", tags: ["rios"], status: "ativo" }],
  } as unknown as AthenaContext);
  assert.match(contextualMemory.content, /Sensor Cívico/i);
  assert.equal(contextualMemory.metadata?.conversationReferenceResolved, true);
  const contextualLibrary = await bibliotecarioAgent.execute(task("E essa obra?"), {
    ...ctx,
    recentConversation: [{ role: "user", text: "Encontre uma obra sobre preservação de rios" }],
    relevantVaultItems: [{ title: "Rios Vivos", author: "A. Silva", tags: ["rios"], content: "A preservação de rios depende de políticas públicas", chapters: ["Capítulo 2"], type: "book" }],
  } as unknown as AthenaContext);
  assert.match(contextualLibrary.content, /Rios Vivos/i);
  assert.equal(contextualLibrary.metadata?.conversationReferenceResolved, true);
  console.log("Agent personas and evidence/authority grounding passed across all registered specialists.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
