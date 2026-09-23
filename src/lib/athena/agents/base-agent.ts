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

export interface AgentKnowledgeSource {
  id: string;
  title: string;
  content: string;
  domain: string;
  sourceReference?: string;
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

