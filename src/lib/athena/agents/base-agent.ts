import { AthenaTask } from "../domain/task";
import { AthenaContext } from "../domain/context";
import { AgentResult } from "../domain/result";

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
  const followUp = /^(?:(?:e|mas\s+e)\s+(?:isso|essa|esse|ele|ela|eles|elas|os\s+riscos|as\s+consequências|o\s+argumento|a\s+ideia|a\s+tese|a\s+proposta|o\s+tema|esse\s+ponto|quanto\s+a\s+isso)\b[^.!?]{0,70}|(?:continue|desenvolva|explique\s+melhor|fale\s+mais|escreva\s+mais|redija\s+mais|e\s+agora)\b[^.!?]{0,70}|o\s+que\s+(?:isso|essa|esse)\s+tem\s+a\s+ver[^.!?]{0,70})[.!?]?$/i.test(prompt.trim());
  if (!followUp) return { prompt, usedHistory: false };
  const previousUserTurn = [...(context.recentConversation ?? [])].reverse().find((turn) => turn.role === "user" && turn.text.trim());
  if (!previousUserTurn) return { prompt, usedHistory: false };
  return { prompt: `${previousUserTurn.text.slice(0, 500)}\n\nContinuação solicitada agora: ${prompt.trim()}`, usedHistory: true };
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
  /** Receives only policy-filtered knowledge facts, never ambient Vault or account context. */
  consultKnowledge?(request: AgentKnowledgeConsultation): Promise<AgentResult>;
  review?(result: AgentResult, context: AthenaContext): Promise<AgentResult>;
}

