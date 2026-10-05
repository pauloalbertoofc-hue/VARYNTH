import { AthenaTask } from "../domain/task";
import { AthenaContext } from "../domain/context";
import { AgentResult } from "../domain/result";
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

/** Resolves only clear follow-up references from the active session's user turns.
 * Assistant turns are intentionally excluded: they are not independent evidence. */
export function resolveAgentFollowUp(prompt: string, context: AthenaContext): { prompt: string; usedHistory: boolean } {
  const followUp = /^(?:(?:e|mas\s+e)\s+(?:isso|essa|esse|ele|ela|eles|elas|os\s+riscos|as\s+consequências|o\s+argumento|a\s+ideia|a\s+tese|a\s+proposta|o\s+tema|esse\s+ponto|quanto\s+a\s+isso|as\s+fontes|essa\s+obra|no\s+cap[ií]tulo)\b[^.!?]{0,70}|(?:continue|desenvolva|explique\s+melhor|fale\s+mais|escreva\s+mais|redija\s+mais|e\s+agora|o\s+que\s+mais|explique\s+isso\s+melhor)\b[^.!?]{0,70}|o\s+que\s+(?:isso|essa|esse)\s+tem\s+a\s+ver[^.!?]{0,70}|(?:por\s+que|quais\s+(?:são\s+)?(?:os\s+)?riscos|quais\s+as\s+consequências))\s*[.!?]?$/i.test(prompt.trim()) || /^por\s+quê\s*[.!?]?$/i.test(prompt.trim());
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
  const verbosity = confirmedAgentGuidance(context, manifest.id, "verbosity", originalPrompt)
    ?? (/\b(curto|breve|concis[oa]|resumid[oa]|em poucas palavras|sem rodeios)\b/.test(explicitStyle) ? "concise" : /\b(detalhad[oa]|com detalhes|passo a passo)\b/.test(explicitStyle) ? "detailed" : /prefira uma resposta concisa/.test(learnedStyle) ? "concise" : /desenvolva a resposta/.test(learnedStyle) ? "detailed" : undefined);
  const formality = confirmedAgentGuidance(context, manifest.id, "formality", originalPrompt)
    ?? (/\b(formal|formalidade)\b/.test(explicitStyle) ? "formal" : /\b(informal|descontraid[oa]|casual)\b/.test(explicitStyle) ? "informal" : /registro formal/.test(learnedStyle) ? "formal" : /registro informal/.test(learnedStyle) ? "informal" : undefined);
  const identity = manifest.persona.identity.replace(/^Sou\s+[^,;:]+[,;:]?\s*/i, "").trim() || manifest.persona.voice;
  const continuity = usedHistory ? (formality === "formal" ? " Retomando o assunto anterior," : " Voltando ao que conversávamos,") : "";
  const alreadyIntroduced = body.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").startsWith(`sou ${manifest.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")}`);
  const lead = alreadyIntroduced ? "" : formality === "formal"
    ? `Sou ${manifest.name}; ${identity}${continuity}`
    : `Sou ${manifest.name} — ${identity}${continuity}`;
  const nextStep = result.recommendations?.find((item) => item.trim())
    ?? (result.success ? "Se quiser, posso aprofundar no ponto que for mais importante para você." : "Para eu continuar com precisão, diga qual informação ou trecho devo considerar.");
  const concise = verbosity === "concise";
  const alreadyInvitesFollowUp = /[?？]|\b(posso|quer|escolha|informe|envie|confirme|revise antes|qual|pe[cç]a)\b/i.test(body);
  const content = `${lead ? `${lead}\n\n` : ""}${body}${concise || alreadyInvitesFollowUp ? "" : `\n\n${nextStep}`}`;

  return {
    ...result,
    content,
    metadata: {
      ...result.metadata,
      conversationPresentation: true,
      conversationReferenceResolved: usedHistory || result.metadata?.conversationReferenceResolved === true,
      presentationPreferences: { ...(verbosity ? { verbosity } : {}), ...(formality ? { formality } : {}) },
    },
  };
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
  return {
    ...presented,
    metadata: {
      ...presented.metadata,
      ...(correction.repaired ? { conversationRepair: true, repairedFromExplicitFeedback: true } : {}),
    },
  };
}

