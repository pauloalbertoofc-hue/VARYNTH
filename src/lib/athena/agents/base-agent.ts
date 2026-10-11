import { AthenaTask } from "../domain/task";
import { AthenaContext } from "../domain/context";
import { AgentExperienceTrace, AgentResult } from "../domain/result";
import { resolveSpecialistCorrection } from "../conversation/specialist-correction";
import { athenaConversationFeedback } from "../conversation/quality-feedback";
import { agentGuidanceInstruction, confirmedAgentGuidance } from "./experience-guidance";

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

export function renderAgentPersona(manifest: AgentManifest): string {
  const { persona, name, role } = manifest;
  return [
    `Você é ${name}, ${role}. ${persona.identity}`,
    `Seu espaço de atuação é ${persona.home}.`,
    `Voz: ${persona.voice}. Método: ${persona.approach}.`,
    `Evidência: ${persona.evidenceBoundary}.`,
    `Autoridade: ${persona.authorityBoundary}.`,
    "Converse de modo direto, acompanhe o registro formal ou informal da pessoa e responda ao pedido específico antes de explicar o método.",
  ].join(" ");
}

export function inferCurrentConversationRegister(prompt: string): "formal" | "informal" | undefined {
  const normalized = prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const formalSignals = /\b(por favor|por gentileza|poderia|solicito|prezado|prezada|senhor|senhora|atenciosamente|agradeco desde ja|encaminho|gostaria de solicitar)\b/;
  const informalSignals = /\b(vc|vcs|c[eê]|pra|pro|t[aá]|t[oô]|tava|tavam|blz|valeu|kkk|rsrs|mano|cara|tipo assim|me da uma forca|me ajuda ai|faz pra mim)\b/;
  if (formalSignals.test(normalized)) return "formal";
  if (informalSignals.test(normalized)) return "informal";
  return undefined;
}

/** Resolves only clear follow-up references from the active session's user turns.
 * Assistant turns are intentionally excluded: they are not independent evidence. */
export function resolveAgentFollowUp(prompt: string, context: AthenaContext): { prompt: string; usedHistory: boolean } {
  const followUp = /^(?:(?:e|mas\s+e|quanto\s+a)\s+(?:isso|essa|esse|ele|ela|eles|elas|os\s+riscos|as\s+consequências|o\s+argumento|a\s+ideia|a\s+tese|a\s+proposta|o\s+tema|esse\s+ponto|essa\s+resposta|essa\s+parte|esse\s+detalhe|o\s+exemplo|o\s+resultado|o\s+plano|o\s+texto|o\s+rascunho|a\s+análise|o\s+trecho|a\s+segunda\s+opção|as\s+fontes|essa\s+obra|no\s+cap[ií]tulo)\b[^.!?]{0,90}|(?:continue|desenvolva\s+(?:isso|essa\s+ideia|essa\s+proposta)|explique\s+(?:isso|essa\s+parte|essa\s+resposta|melhor)|fale\s+mais(?:\s+sobre\s+isso)?|escreva\s+mais\s+sobre\s+isso|redija\s+mais\s+sobre\s+isso|e\s+agora|o\s+que\s+mais|pode\s+(?:explicar\s+(?:isso|essa\s+parte)|detalhar\s+isso|desenvolver\s+isso)|me\s+explica(?:r)?\s+(?:isso|essa\s+parte)|qual\s+(?:delas|deles|das\s+opções)|isso\s+(?:funciona|serve|resolve))\b[^.!?]{0,90}|o\s+que\s+(?:isso|essa|esse)\s+tem\s+a\s+ver[^.!?]{0,90}|(?:por\s+que|quais\s+(?:são\s+)?(?:os\s+)?riscos|quais\s+as\s+consequências))\s*[.!?]?$/i.test(prompt.trim()) || /^por\s+quê\s*[.!?]?$/i.test(prompt.trim());
  if (!followUp) return { prompt, usedHistory: false };
  const previousUserTurn = [...(context.recentConversation ?? [])].reverse().find((turn) => turn.role === "user" && turn.text.trim());
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
  const learnedStyle = agentGuidanceInstruction(context, manifest.id, originalPrompt).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const currentRegister = inferCurrentConversationRegister(originalPrompt);
  const verbosity = confirmedAgentGuidance(context, manifest.id, "verbosity", originalPrompt)
    ?? (/\b(curto|breve|concis[oa]|resumid[oa]|em poucas palavras|sem rodeios)\b/.test(explicitStyle) ? "concise" : /\b(detalhad[oa]|com detalhes|passo a passo)\b/.test(explicitStyle) ? "detailed" : /prefira uma resposta concisa/.test(learnedStyle) ? "concise" : /desenvolva a resposta/.test(learnedStyle) ? "detailed" : undefined);
  const formality = confirmedAgentGuidance(context, manifest.id, "formality", originalPrompt)
    ?? (/\b(formal|formalidade)\b/.test(explicitStyle) ? "formal" : /\b(informal|descontraid[oa]|casual)\b/.test(explicitStyle) ? "informal" : /registro formal/.test(learnedStyle) ? "formal" : /registro informal/.test(learnedStyle) ? "informal" : currentRegister);
  const identity = manifest.persona.identity.replace(/^Sou\s+[^,;:]+[,;:]?\s*/i, "").trim() || manifest.persona.voice;
  const continuity = usedHistory ? (formality === "formal" ? " Retomando o assunto anterior," : " Voltando ao que conversávamos,") : "";
  const alreadyIntroduced = body.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").startsWith(`sou ${manifest.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")}`);
  const lead = alreadyIntroduced ? "" : formality === "formal"
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
  // Put the domain answer first: identity and conversational scaffolding must
  // never make a short answer feel like a fresh introduction instead of a reply.
  const responseAudience = context.responseAudience ?? "SPECIALIST";
  const content = responseAudience === "ATHENA"
    ? anonymizeSpecialistLead(body, manifest.name)
    : `${body}${lead ? `\n\n${lead}` : ""}${concise || alreadyInvitesFollowUp ? "" : `\n\n${nextStep}`}`;

  return {
    ...result,
    content,
    metadata: {
      ...result.metadata,
      conversationPresentation: true,
      conversationAudience: responseAudience,
      conversationReferenceResolved: usedHistory || result.metadata?.conversationReferenceResolved === true,
      presentationPreferences: { ...(verbosity ? { verbosity } : {}), ...(formality ? { formality } : {}) },
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
  turns: ReadonlyArray<{ role: string; text: string }>,
  currentPrompt: string,
  limit = 6,
): Array<{ role: "user" | "athena"; text: string }> {
  const priorTurns = [...turns];
  const latest = priorTurns.at(-1);
  if (latest?.role === "user" && latest.text.trim() === currentPrompt.trim()) priorTurns.pop();
  return priorTurns
    .filter((turn): turn is { role: "user" | "athena"; text: string } => (turn.role === "user" || turn.role === "athena") && typeof turn.text === "string")
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
  const latestFeedback = context.conversationSessionId
    ? athenaConversationFeedback.latest(context.conversationSessionId, agent.manifest.id)
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
  const presented = conversationalizeSpecialistResult(result, agent.manifest, task.rawPrompt, resolution.usedHistory, context);
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
  return {
    ...presented,
    metadata: {
      ...presented.metadata,
      experienceTrace,
      ...(correction.repaired ? { conversationRepair: true, repairedFromExplicitFeedback: true } : {}),
    },
  };
}

