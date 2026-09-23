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

