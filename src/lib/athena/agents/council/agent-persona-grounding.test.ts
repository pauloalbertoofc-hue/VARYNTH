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
import { inferCurrentConversationRegister, prepareAgentConversationHistory, renderAgentPersona, resolveAgentFollowUp } from "../base-agent";
import type { AthenaAgent } from "../base-agent";
import type { AthenaContext } from "../../domain/context";
import type { AthenaTask } from "../../domain/task";

const agents: AthenaAgent[] = [athenaGeneralistAgent, justitiaAgent, logosAgent, sophiaAgent, musaAgent, strategosAgent, critiasAgent, archivistAgent, mnemosyneAgent, bibliotecarioAgent, curadorPesquisaAgent, euterpeAgent];
const personas = agents.map((agent) => agent.manifest.persona);
for (const agent of agents) {
  const persona = agent.manifest.persona;
  assert.ok(persona.identity.length > 30, `${agent.manifest.id} needs a distinct identity`);
  assert.ok(persona.home.length > 10, `${agent.manifest.id} needs a domain home`);
  assert.ok(persona.voice.length > 8, `${agent.manifest.id} needs a voice`);
  assert.ok(persona.evidenceBoundary.length > 20, `${agent.manifest.id} needs an evidence boundary`);
  assert.ok(persona.authorityBoundary.length > 20, `${agent.manifest.id} needs an authority boundary`);
  const prompt = renderAgentPersona(agent.manifest);
  assert.match(prompt, /Comece respondendo ao pedido concreto/);
  assert.match(prompt, /não invente contexto, acesso, consulta ou ação/i);
}
  assert.equal(new Set(personas.map((persona) => persona.identity)).size, agents.length, "Every subagent must have its own identity");
  assert.equal(agentRegistry.listAgents().length, agents.length, "All persona-bearing agents must be registered");

const expectedDomainMethods: Record<string, RegExp> = {
  justitia: /controvérsia.*fundamentos e objeções/i,
  logos: /força atribuída.*limitações metodológicas/i,
  sophia: /rascunho editável.*lacunas/i,
  musa: /possibilidades realmente distintas.*trade-off/i,
  strategos: /prioridade, dependências, capacidade/i,
  critias: /defeito comprovado de risco ou pergunta/i,
  archivist: /estado observado, lacuna documental/i,
  mnemosyne: /registros do contexto sustentam a conexão/i,
  bibliotecario: /obra e trecho com sua origem/i,
  "curador-pesquisa": /fontes recebidas.*estratégia de busca/i,
  euterpe: /faixa e dos dados realmente fornecidos/i,
};
for (const agent of agents) {
  const expected = expectedDomainMethods[agent.manifest.id];
  if (expected) assert.match(renderAgentPersona(agent.manifest), expected, `${agent.manifest.id} needs a domain-specific response method`);
}

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
assert.equal(resolveAgentFollowUp("E essa resposta, pode explicar essa parte?", followUpContext).usedHistory, true, "Follow-ups that refer to a prior answer should inherit the user topic");
assert.equal(resolveAgentFollowUp("Isso funciona?", followUpContext).usedHistory, true, "Short evaluative follow-ups should inherit the user topic");
assert.equal(resolveAgentFollowUp("Qual delas você recomenda?", followUpContext).usedHistory, true, "Choice follow-ups should inherit the user topic");
assert.equal(resolveAgentFollowUp("E literatura brasileira?", followUpContext).usedHistory, false, "A new explicit topic must not inherit history even when introduced by 'e'");
assert.equal(resolveAgentFollowUp("Por quê?", followUpContext).usedHistory, true, "Short why follow-ups should inherit the prior user subject");
assert.equal(resolveAgentFollowUp("E literatura brasileira?", { recentConversation: [...(followUpContext.recentConversation ?? []), { role: "user", text: "E literatura brasileira?" }] } as unknown as AthenaContext).usedHistory, false, "The current message must not become its own historical referent");
assert.equal(resolveAgentFollowUp("E agora, sobre literatura brasileira?", followUpContext).usedHistory, false, "an explicit new-topic phrase must override a follow-up-shaped opening");
const currentTurnIncluded = resolveAgentFollowUp("Isso funciona?", { recentConversation: [
  { role: "user" as const, text: "Quero um texto sobre preservação de rios." },
  { role: "athena" as const, text: "Posso ajudar." },
  { role: "user" as const, text: "Isso funciona?" },
] } as unknown as AthenaContext);
assert.equal(currentTurnIncluded.prompt.split("\n")[0], "Quero um texto sobre preservação de rios.", "a current user turn already present in history must be excluded as its own referent");
const afterTopicSwitch = resolveAgentFollowUp("Isso funciona?", { recentConversation: [
  { role: "user" as const, text: "Quero um texto sobre preservação de rios." },
  { role: "athena" as const, text: "Posso ajudar." },
  { role: "user" as const, text: "Mudando de assunto: quero aprender a fazer café." },
  { role: "athena" as const, text: "Podemos começar pelo método coado." },
] } as unknown as AthenaContext);
assert.equal(afterTopicSwitch.prompt.split("\n")[0], "Mudando de assunto: quero aprender a fazer café.", "a short follow-up after a topic switch must bind to the new subject, not the older topic");
const explicitReturn = resolveAgentFollowUp("Voltando ao assunto anterior, por quê?", { recentConversation: [
  { role: "user" as const, text: "Quero um texto sobre preservação de rios." },
  { role: "athena" as const, text: "Posso ajudar." },
  { role: "user" as const, text: "Mudando de assunto: quero aprender a fazer café." },
  { role: "athena" as const, text: "Podemos começar pelo método coado." },
] } as unknown as AthenaContext);
assert.match(explicitReturn.prompt, /^Quero um texto sobre preservação de rios\./);
assert.match(explicitReturn.prompt, /Retomada explícita solicitada agora/);
const namedOlderReturn = resolveAgentFollowUp("Voltando ao projeto Rios Vivos, por quê?", { recentConversation: [
  { role: "user" as const, text: "Quero um texto sobre preservação dos rios e áreas úmidas." },
  { role: "athena" as const, text: "Posso ajudar com um rascunho." },
  { role: "user" as const, text: "Mudando de assunto: quero aprender a fazer café." },
  { role: "athena" as const, text: "Podemos começar pelo método coado." },
  { role: "user" as const, text: "Agora outro assunto: revise o contrato de aluguel." },
  { role: "athena" as const, text: "Posso separar cláusulas e riscos." },
] } as unknown as AthenaContext);
assert.equal(namedOlderReturn.usedHistory, true);
assert.match(namedOlderReturn.prompt, /^Quero um texto sobre preservação dos rios/ , "a named return should recover the matching older subject, not the most recently interrupted one");
const unmatchedNamedReturn = resolveAgentFollowUp("Voltando ao projeto Atlas Boreal, por quê?", { recentConversation: [
  { role: "user" as const, text: "Quero um texto sobre preservação dos rios." },
  { role: "athena" as const, text: "Posso ajudar." },
  { role: "user" as const, text: "Mudando de assunto: quero aprender a fazer café." },
  { role: "athena" as const, text: "Podemos começar pelo método coado." },
] } as unknown as AthenaContext);
assert.equal(unmatchedNamedReturn.usedHistory, false, "an unmatched named return must not silently bind to a different prior topic");
const suppliedHistory = prepareAgentConversationHistory([
  { role: "user", text: "Quero um texto sobre preservação de rios." },
  { role: "athena", text: "Posso ajudar com um rascunho." },
  { role: "user", text: "Escreva mais sobre isso." },
], "Escreva mais sobre isso.");
assert.equal(suppliedHistory.length, 2, "The current message is removed from the prior-turn packet");
assert.match(suppliedHistory[0].text, /preservação de rios/i);

const ctx = { scope: "geral", relevantProjects: [], relevantTasks: [], relevantVaultItems: [], relevantChronosEvents: [], relevantTheses: [], relevantEvidences: [], relevantOpportunities: [], systemTime: "2026-09-23T12:00:00.000Z" } as unknown as AthenaContext;
const task = (rawPrompt: string): AthenaTask => ({ id: "agent-grounding", title: rawPrompt, rawPrompt, type: "GENERAL_DELIBERATION", priority: "media", status: "CREATED", scope: "geral", entities: {}, createdAt: "", updatedAt: "" });

assert.equal(inferCurrentConversationRegister("Cê tá livre? Me ajuda aí, por favor."), "informal", "courtesy alone must not override clear colloquial register markers");
assert.equal(inferCurrentConversationRegister("Cê tá livre? Me ajuda aí."), "informal");
assert.equal(inferCurrentConversationRegister("Você pode analisar esta proposta?"), undefined, "standard Brazilian Portuguese pronouns are not informal markers by themselves");
assert.equal(inferCurrentConversationRegister("Poderia revisar, por gentileza?"), "formal");
assert.equal(inferCurrentConversationRegister("Por favor, analise esta proposta."), undefined, "courtesy without a register marker should not force formality");
assert.equal(inferCurrentConversationRegister("Poderia dar uma olhada nisso pra mim?"), undefined, "mixed formal and informal markers should preserve a neutral register");
assert.equal(inferCurrentConversationRegister("Poderia revisar esta proposta, por favor?"), "formal", "formal syntax remains formal when paired with ordinary courtesy");
assert.equal(inferCurrentConversationRegister("Analise os riscos da proposta."), undefined, "domain vocabulary alone must not imply a communication preference");
assert.equal(inferCurrentConversationRegister("Poderia revisar isso pra mim?"), undefined, "mixed formal and colloquial signals should stay neutral");
assert.equal(inferCurrentConversationRegister("Use um registro informal, por favor."), "informal", "an explicit register request must outrank courtesy");
assert.equal(inferCurrentConversationRegister("Responda em registro formal, sem rodeios."), "formal", "explicit requested register should be recognized even with mixed style constraints");

void (async () => {
  for (const agent of agents.filter((candidate) => candidate.manifest.id !== "athena-generalist")) {
    const converse = agent.converseWithFeedback;
    assert.ok(converse, `${agent.manifest.id} needs a runtime conversational entrypoint`);
    const conversationalResult = await converse.call(agent, task("Explique isso em poucas palavras."), ctx);
    assert.equal(conversationalResult.metadata?.conversationPresentation, true, `${agent.manifest.id} must use the shared conversational presentation`);
    assert.ok(conversationalResult.content.trim().length > 0, `${agent.manifest.id} must return a substantive conversational result`);
    assert.doesNotMatch(conversationalResult.content, /Sou [^.\n]+ Sou /, `${agent.manifest.id} must not repeat a role introduction after its own first-person opening`);
    if (agent.manifest.id === "euterpe") assert.equal((conversationalResult.content.match(/Sou Euterpe/g) ?? []).length, 1, "Euterpe's native voice must not receive a duplicate generic introduction");

    const athenaOwnedResult = await converse.call(agent, task("Explique isso em poucas palavras."), { ...ctx, responseAudience: "ATHENA" });
    assert.equal(athenaOwnedResult.metadata?.conversationAudience, "ATHENA", `${agent.manifest.id} must honor Athena-owned presentation`);
    assert.doesNotMatch(athenaOwnedResult.content.split("\n")[0], new RegExp(agent.manifest.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${agent.manifest.id} must not introduce a second visible chatbot on Athena surfaces`);
  }

  const scopedMethodHint = {
    id: "persona-method", domain: "writing", context: {}, situation: "rascunho para leitores iniciantes",
    action: "começar pela ideia central antes dos detalhes", outcome: "o rascunho ficou mais fácil de acompanhar", usefulness: 1, confidence: 0.9,
    evidence: [{ eventId: "persona-event", weight: "VERY_HIGH" as const, reason: "confirmado pelo usuário" }],
    scope: "AGENT" as const, scopeId: "sophia", createdAt: new Date(0).toISOString(),
  };
  const scopedGuidance = await sophiaAgent.converseWithFeedback!(task("Escreva um texto sobre preservação de rios."), {
    ...ctx,
    experienceContext: { preferences: [], experiences: [scopedMethodHint], instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION", generatedAt: "now", truncated: false },
  } as unknown as AthenaContext);
  assert.match(scopedGuidance.content, /Em experiências anteriores, mostrou-se útil: começar pela ideia central/);
  assert.equal(scopedGuidance.metadata?.sharedExperienceHints, 0, "Sophia already presents her own scoped historical hint; the shared layer must not duplicate it");
  const isolatedGuidance = await logosAgent.converseWithFeedback!(task("Avalie esta evidência."), {
    ...ctx,
    experienceContext: { preferences: [], experiences: [scopedMethodHint], instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION", generatedAt: "now", truncated: false },
  } as unknown as AthenaContext);
  assert.doesNotMatch(isolatedGuidance.content, /começar pela ideia central/);
  assert.equal(isolatedGuidance.metadata?.sharedExperienceHints, 0, "agent-scoped method history must not leak to another specialist");
  const unrelatedDomainHint = { ...scopedMethodHint, id: "legal-method", scope: "DOMAIN" as const, scopeId: "legal", domain: "legal", action: "considerar apenas precedentes jurídicos" };
  const domainIsolation = await logosAgent.converseWithFeedback!(task("Avalie esta evidência."), {
    ...ctx,
    experienceContext: { preferences: [], experiences: [unrelatedDomainHint], instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION", generatedAt: "now", truncated: false },
  } as unknown as AthenaContext);
  assert.doesNotMatch(domainIsolation.content, /precedentes jurídicos/);
  assert.equal(domainIsolation.metadata?.sharedExperienceHints, 0, "a legal-domain experience must not be treated as universally relevant to research");

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
  const thesisBackedLegal = await justitiaAgent.execute(task("Analise a tese registrada"), {
    ...ctx,
    scope: "juridico",
    relevantTheses: [{ id: "thesis-1", title: "Responsabilidade digital", area: "Direito Civil", question: "Quem responde pelo dano?", pros: [], cons: [], precedents: ["REsp 12345"], tags: [], status: "consolidada", createdAt: "", updatedAt: "", conclusion: "" }],
  } as unknown as AthenaContext);
  assert.match(thesisBackedLegal.content, /força vinculante e vigência não verificadas/i);
  assert.doesNotMatch(thesisBackedLegal.content, /Precedentes Vinculantes/);
  assert.equal(thesisBackedLegal.metadata?.currentLawVerified, false);
  assert.equal(thesisBackedLegal.confidence, 0.68);
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
