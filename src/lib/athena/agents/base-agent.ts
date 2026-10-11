import { AthenaTask } from "../domain/task";
import { AthenaContext } from "../domain/context";
import { AgentExperienceTrace, AgentResult } from "../domain/result";
import { resolveSpecialistCorrection } from "../conversation/specialist-correction";
import { athenaConversationFeedback } from "../conversation/quality-feedback";
import { agentGuidanceInstruction, confirmedAgentGuidance, formatExperienceMethodHints, specialistExperienceGuidance } from "./experience-guidance";
import { recordExperienceDecisionTrace } from "@/lib/experience/decision-trace";
import { experienceDomainForAgent } from "../runtime/agent-experience-context";
import { understandPragmatics } from "../conversation/pragmatic-understanding";

export interface AgentManifest {
  id: string;
  name: string;
  role: string;
  version: string;
  description: string;
  skills: string[];
  priority: number;
  enabled: boolean;
  persona: AgentPersona;
}

/** Human-facing identity and explicit epistemic/authority boundaries for a specialist. */
export interface AgentPersona {
  identity: string;
  home: string;
  voice: string;
  approach: string;
  evidenceBoundary: string;
  authorityBoundary: string;
}

const specialistConversationMethods: Record<string, string> = {
  "athena-generalist": "Para perguntas gerais, responda apenas quando a rota central fornecer conteúdo substantivo; se ela não o fornecer, declare esse limite sem simular uma resposta.",
  justitia: "Na análise jurídica, delimite a controvérsia, apresente fundamentos e objeções separadamente e indique quando a vigência ou a fonte oficial não foi verificada.",
  logos: "Na análise científica, separe pergunta, evidência registrada, força atribuída, limitações metodológicas e inferência; não trate ausência de registros como ausência de estudos.",
  sophia: "Na escrita, entregue um rascunho editável que atenda ao gênero e ao público pedidos; marque lacunas em vez de preencher dados não fornecidos.",
  musa: "Na ideação, ofereça possibilidades realmente distintas, nomeie a hipótese e o trade-off de cada uma e deixe claro que nenhuma foi aprovada ou registrada.",
  strategos: "No planejamento, conecte prioridade, dependências, capacidade e próximo passo verificável; diferencie plano sugerido de tarefa ou evento criado.",
  critias: "Na crítica, identifique o objeto e o critério, diferencie defeito comprovado de risco ou pergunta e proponha revisão proporcional, não rejeição automática.",
  archivist: "Na documentação, preserve a distinção entre estado observado, lacuna documental e recomendação; mantenha rastreável a origem de cada afirmação.",
  mnemosyne: "Na memória, informe quais registros do contexto sustentam a conexão e quais fontes não foram consultadas; não converta proximidade temática em vínculo histórico.",
  bibliotecario: "Na consulta ao acervo, apresente obra e trecho com sua origem, distingua citação de síntese e não generalize um excerto para o livro inteiro.",
  "curador-pesquisa": "Na curadoria, organize pergunta, fontes recebidas, qualidade/limites e estratégia de busca; nunca apresente uma busca proposta como pesquisa já realizada.",
  euterpe: "Na conversa musical, parta da faixa e dos dados realmente fornecidos, separe percepção estética de metadado e ofereça propostas revisáveis sem alegar que ouviu ou alterou algo.",
};

export function renderAgentPersona(manifest: AgentManifest): string {
  const { persona, name, role } = manifest;
  const domainMethod = specialistConversationMethods[manifest.id];
  return [
    `Você é ${name}, ${role}. ${persona.identity}`,
    `Seu espaço de atuação é ${persona.home}.`,
    `Voz: ${persona.voice}. Método: ${persona.approach}.`,
    ...(domainMethod ? [domainMethod] : []),
    `Evidência: ${persona.evidenceBoundary}.`,
    `Autoridade: ${persona.authorityBoundary}.`,
    "Converse no idioma e no registro natural da pessoa. Comece respondendo ao pedido concreto, sem introdução biográfica ou encerramento automático. Separe fatos observados, inferências, hipóteses e propostas; não invente contexto, acesso, consulta ou ação. Se faltar algo que mude materialmente a resposta, diga exatamente o que falta e faça uma pergunta objetiva.",
  ].join(" ");
}

export function inferCurrentConversationRegister(prompt: string): "formal" | "informal" | undefined {
  const pragmaticRegister = understandPragmatics(prompt).register;
  if (pragmaticRegister) return pragmaticRegister;
  const normalized = prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  // Courtesy is common in informal Brazilian Portuguese; it must not outweigh
  // clear register markers such as "cê" or "poderia/solicito" on its own.
  const formalSignals = /\b(poderia|solicito|prezado|prezada|senhor|senhora|atenciosamente|agradeco desde ja|encaminho|gostaria de solicitar|por gentileza)\b/g;
  const informalSignals = /\b(vc|vcs|c[eê]|pra|pro|t[aá]|t[oô]|tava|tavam|blz|valeu|kkk|rsrs|mano|cara|tipo assim|me da uma forca|me ajuda ai|faz pra mim)\b/g;
  const explicitFormalRequest = /\b(?:use|mantenha|adote|responda em) (?:um )?registro formal\b/.test(normalized);
  const explicitInformalRequest = /\b(?:use|mantenha|adote|responda em) (?:um )?registro informal\b/.test(normalized);
  if (explicitFormalRequest !== explicitInformalRequest) return explicitFormalRequest ? "formal" : "informal";
  const formalCount = [...normalized.matchAll(formalSignals)].length;
  const informalCount = [...normalized.matchAll(informalSignals)].length;
  if (formalCount > informalCount) return "formal";
  if (informalCount > formalCount) return "informal";
  return undefined;
}

function normalizeFollowUpText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[.,!?;:()]/g, " ").replace(/\s+/g, " ").trim();
}

function isExplicitTopicSwitch(value: string): boolean {
  return understandPragmatics(value).explicitTopicSwitch;
}

/** Resolves only clear follow-up references from the active session's user turns.
 * Assistant turns are intentionally excluded: they are not independent evidence. */
export function resolveAgentFollowUp(prompt: string, context: AthenaContext): { prompt: string; usedHistory: boolean } {
  const turns = [...(context.recentConversation ?? [])];
  if (turns.at(-1)?.role === "user" && normalizeFollowUpText(turns.at(-1)!.text) === normalizeFollowUpText(prompt)) turns.pop();
  const explicitReturn = /^(?:voltando|retomando)\s+(?:ao|a|para|pro)\b/.test(normalizeFollowUpText(prompt));
  if (explicitReturn) {
    let lastTopicSwitch = -1;
    for (let index = turns.length - 1; index >= 0; index -= 1) {
      if (turns[index].role === "user" && isExplicitTopicSwitch(turns[index].text)) { lastTopicSwitch = index; break; }
    }
    if (lastTopicSwitch >= 0) {
      const previousUserTurn = turns.slice(0, lastTopicSwitch).reverse().find((turn) => turn.role === "user" && turn.text.trim());
      if (previousUserTurn) return { prompt: `${previousUserTurn.text.slice(0, 500)}\n\nRetomada explícita solicitada agora: ${prompt.trim()}`, usedHistory: true };
    }
  }
  if (isExplicitTopicSwitch(prompt)) return { prompt, usedHistory: false };
  const followUp = understandPragmatics(prompt).likelyFollowUp;
  if (!followUp) return { prompt, usedHistory: false };
  const previousUserTurn = [...turns].reverse().find((turn) => turn.role === "user" && turn.text.trim());
  if (!previousUserTurn) return { prompt, usedHistory: false };
  return { prompt: `${previousUserTurn.text.slice(0, 500)}\n\nContinuação solicitada agora: ${prompt.trim()}`, usedHistory: true };
}

function conversationalizeSpecialistResult(
  result: AgentResult,
  manifest: AgentManifest,
  originalPrompt: string,
  usedHistory: boolean,
  context: AthenaContext,
): AgentResult {
  const body = result.content.trim();
  if (!body || result.metadata?.conversationPresentation === true) return result;

  const explicitStyle = originalPrompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const pragmatic = understandPragmatics(originalPrompt);
  const learnedStyle = agentGuidanceInstruction(context, manifest.id, originalPrompt).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const currentRegister = inferCurrentConversationRegister(originalPrompt);
  const verbosity = confirmedAgentGuidance(context, manifest.id, "verbosity", originalPrompt)
    ?? (pragmatic.requestedVerbosity || (/\b(curto|breve|concis[oa]|resumid[oa]|em poucas palavras|sem rodeios)\b/.test(explicitStyle) ? "concise" : /\b(detalhad[oa]|com detalhes|passo a passo)\b/.test(explicitStyle) ? "detailed" : /prefira uma resposta concisa/.test(learnedStyle) ? "concise" : /desenvolva a resposta/.test(learnedStyle) ? "detailed" : undefined));
  const formality = confirmedAgentGuidance(context, manifest.id, "formality", originalPrompt)
    ?? (/\b(formal|formalidade)\b/.test(explicitStyle) ? "formal" : /\b(informal|descontraid[oa]|casual)\b/.test(explicitStyle) ? "informal" : /registro formal/.test(learnedStyle) ? "formal" : /registro informal/.test(learnedStyle) ? "informal" : currentRegister);
  const identity = manifest.persona.identity.replace(/^Sou\s+[^,;:]+[,;:]?\s*/i, "").trim() || manifest.persona.voice;
  const continuity = usedHistory ? (formality === "formal" ? " Retomando o assunto anterior," : " Voltando ao que conversávamos,") : "";
  const normalizedBody = body.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const normalizedAgentName = manifest.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const alreadyIntroduced = new RegExp(`^(?:sou|aqui e)\\s+${normalizedAgentName}\\b`).test(normalizedBody);
  const alreadyInCharacter = normalizedBody.startsWith("sou ") || normalizedBody.startsWith("como ") || normalizedBody.startsWith("aqui e ");
  const lead = alreadyIntroduced || alreadyInCharacter ? "" : formality === "formal"
    ? `Sou ${manifest.name}; ${identity}${continuity}`
    : `Sou ${manifest.name} — ${identity}${continuity}`;
  const recommendation = result.recommendations?.find((item) => item.trim());
  const nextStep = recommendation
    ? formality === "formal" ? `Como próximo passo, sugiro: ${recommendation}` : recommendation
    : formality === "formal"
      ? result.success ? "Caso deseje, posso aprofundar no ponto que considerar mais importante." : "Para prosseguir com precisão, informe qual dado ou trecho devo considerar."
      : result.success ? "Se quiser, posso aprofundar no ponto que for mais importante para você." : "Para eu continuar com precisão, diga qual informação ou trecho devo considerar.";
  const concise = verbosity === "concise";
  const alreadyInvitesFollowUp = /[?？]|\b(posso|quer|escolha|informe|envie|confirme|revise antes|qual|pe[cç]a)\b/i.test(body);
  const asksForDepth = /\b(?:detalhad[oa]mente|com (?:mais )?detalhes|passo a passo|aprofunde|desenvolva|explique melhor|analise a fundo|com profundidade)\b/i.test(originalPrompt);
  // Put the domain answer first: identity and conversational scaffolding must
  // never make a short answer feel like a fresh introduction instead of a reply.
  const responseAudience = context.responseAudience ?? "SPECIALIST";
  const priorOutcomeHints = specialistExperienceGuidance(context, manifest.id, originalPrompt);
  const hasExistingExperienceHints = /em experiências anteriores, mostrou-se útil:/i.test(body);
  const withExperienceGuidance = hasExistingExperienceHints ? body : `${body}${formatExperienceMethodHints(priorOutcomeHints)}`;
  const content = responseAudience === "ATHENA"
    ? anonymizeSpecialistLead(withExperienceGuidance, manifest.name)
    : `${withExperienceGuidance}${lead ? `\n\n${lead}` : ""}${concise || alreadyInvitesFollowUp || asksForDepth ? "" : `\n\n${nextStep}`}`;

  return {
    ...result,
    content,
    metadata: {
      ...result.metadata,
      conversationPresentation: true,
      conversationAudience: responseAudience,
      conversationReferenceResolved: usedHistory || result.metadata?.conversationReferenceResolved === true,
      presentationPreferences: { ...(verbosity ? { verbosity } : {}), ...(formality ? { formality } : {}) },
      sharedExperienceHints: priorOutcomeHints.length > 0 && !hasExistingExperienceHints ? priorOutcomeHints.length : 0,
    },
  };
}

function anonymizeSpecialistLead(body: string, agentName: string): string {
  const lineBreak = body.indexOf("\n");
  const firstLine = lineBreak < 0 ? body : body.slice(0, lineBreak);
  const remainder = lineBreak < 0 ? "" : body.slice(lineBreak);
  const escapedName = agentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parentheticalIdentity = new RegExp(`\\s*\\(\\s*${escapedName}(?:\\s*&[^)]*)?\\s*\\)`, "gi");
  const inlineIdentity = new RegExp(`\\b${escapedName}\\b`, "gi");
  const lead = firstLine
    .replace(parentheticalIdentity, "")
    .replace(inlineIdentity, "")
    .replace(/(\*\*)\s*[—–-]\s*/g, "$1")
    .replace(/\s+:/g, ":")
    .replace(/\*\*\s*\*\*/g, "")
    .trim();
  return `${lead}${remainder}`.trim();
}

export function prepareAgentConversationHistory(
  turns: ReadonlyArray<{ role: string; text: string; messageId?: string }>,
  currentPrompt: string,
  limit = 6,
): Array<{ role: "user" | "athena"; text: string; messageId?: string }> {
  const priorTurns = [...turns];
  const latest = priorTurns.at(-1);
  if (latest?.role === "user" && latest.text.trim() === currentPrompt.trim()) priorTurns.pop();
  return priorTurns
    .filter((turn): turn is { role: "user" | "athena"; text: string; messageId?: string } => (turn.role === "user" || turn.role === "athena") && typeof turn.text === "string")
    .slice(-Math.max(0, Math.min(6, Math.floor(limit))))
    .map((turn) => ({ ...turn, text: turn.text.slice(0, 1_200) }));
}

export interface AgentKnowledgeSource {
  id: string;
  title: string;
  content: string;
  domain: string;
  sourceReference?: string;
  sourceSpan?: import("@/lib/knowledge/contracts").KnowledgeSourceSpan;
  derivedFromIds?: string[];
  authority: string;
  assertion: string;
  freshness: string;
  truncated: boolean;
}

export interface AgentKnowledgeConsultation {
  domain: string;
  query: string;
  purpose: string;
  sources: AgentKnowledgeSource[];
  truncated: boolean;
}

export interface AthenaAgent {
  manifest: AgentManifest;
  canHandle(task: AthenaTask, context: AthenaContext): boolean;
  execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult>;
  /** Standard conversational entrypoint; keeps each specialist's own execution and voice. */
  converseWithFeedback?(task: AthenaTask, context: AthenaContext): Promise<AgentResult>;
  /** Receives only policy-filtered knowledge facts, never ambient Vault or account context. */
  consultKnowledge?(request: AgentKnowledgeConsultation): Promise<AgentResult>;
  review?(result: AgentResult, context: AthenaContext): Promise<AgentResult>;
}

/** Adds consistent explicit-feedback handling without changing a specialist's domain executor. */
export async function converseAsSpecialist(
  agent: Pick<AthenaAgent, "manifest" | "execute">,
  task: AthenaTask,
  context: AthenaContext,
): Promise<AgentResult> {
  const latestAssistantTurn = [...(context.recentConversation ?? [])].reverse().find((turn) => turn.role === "athena");
  const latestFeedback = context.conversationSessionId && latestAssistantTurn?.messageId
    ? athenaConversationFeedback.latestForMessage(context.conversationSessionId, latestAssistantTurn.messageId, agent.manifest.id)
    : undefined;
  const correction = resolveSpecialistCorrection(task.rawPrompt, context.recentConversation ?? [], agent.manifest.id, latestFeedback);
  if (correction.kind === "clarify") {
    return {
      agentId: agent.manifest.id,
      agentName: agent.manifest.name,
      role: agent.manifest.role,
      success: true,
      content: correction.response,
      confidence: 0.35,
      sources: [],
      recommendations: ["Esclarecer o ajuste desejado antes de gerar uma nova análise ou proposta"],
      metadata: { conversationRepair: true, executedDomainWork: false, authority: agent.manifest.persona.authorityBoundary },
    };
  }
  const resolution = resolveAgentFollowUp(correction.prompt, context);
  const resolvedTask = resolution.prompt === correction.prompt ? task : { ...task, rawPrompt: resolution.prompt };
  const executionTask = correction.repaired ? { ...resolvedTask, rawPrompt: correction.prompt } : resolvedTask;
  const result = await agent.execute(executionTask, context);
  const presented = conversationalizeSpecialistResult(result, agent.manifest, task.rawPrompt, resolution.usedHistory || correction.repaired === true, context);
  const retrievedExperiences = context.experienceContext?.experiences ?? [];
  const experiencesReferencedInResponse = retrievedExperiences.filter((experience) => {
    const recordedAction = experience.action.trim().slice(0, 120);
    return recordedAction.length > 0 && presented.content.includes(recordedAction);
  });
  const experienceTrace: AgentExperienceTrace = {
    agentId: agent.manifest.id,
    retrievedPreferenceIds: (context.experienceContext?.preferences ?? []).map((preference) => preference.id),
    retrievedExperienceIds: retrievedExperiences.map((experience) => experience.id),
    experienceIdsReferencedInResponse: experiencesReferencedInResponse.map((experience) => experience.id),
    evidenceEventIdsReferencedInResponse: [...new Set(experiencesReferencedInResponse.flatMap((experience) => experience.evidence.map((evidence) => evidence.eventId)))],
    instructionPrecedence: context.experienceContext?.instructionPrecedence ?? "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION",
  };
  await recordExperienceDecisionTrace({
    taskId: task.id,
    agentId: agent.manifest.id,
    domain: experienceDomainForAgent(agent.manifest.id, task.scope),
    projectId: context.activeProject?.id || task.targetProjectId,
    sessionId: context.conversationSessionId || (typeof task.metadata?.sessionId === "string" ? task.metadata.sessionId : undefined),
    trace: experienceTrace,
  });
  return {
    ...presented,
    metadata: {
      ...presented.metadata,
      experienceTrace,
      ...(correction.repaired ? { conversationRepair: true, repairedFromExplicitFeedback: true } : {}),
    },
  };
}

