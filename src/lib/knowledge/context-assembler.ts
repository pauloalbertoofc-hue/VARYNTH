import { buildExperienceContext, ExperienceContext } from "../experience";
import { KnowledgeItem, KnowledgeQuery } from "./contracts";
import { queryKnowledge } from "./service";
import { routeKnowledgeIntent } from "./router";

export interface AgentContextRequest extends Omit<KnowledgeQuery, "domain" | "query"> {
  task: string;
  currentModule?: string;
  agentId?: string;
  artifactId?: string;
  sessionId?: string;
  budget?: number;
}

export interface AgentContextPack {
  primaryDomain?: string;
  relatedDomains: string[];
  specialist?: string;
  knowledge: KnowledgeItem[];
  experience: ExperienceContext;
  truncated: boolean;
  generatedAt: string;
}

export async function buildAgentContext(request: AgentContextRequest): Promise<AgentContextPack> {
  const route = routeKnowledgeIntent({ task: request.task, currentModule: request.currentModule, projectId: request.projectId });
  const budget = Math.max(0, Math.min(request.budget ?? 8, 20));
  const knowledge = await queryKnowledge({ requester: request.requester, domain: route.primaryDomain, query: request.task, projectId: request.projectId, purpose: request.purpose, scope: request.scope });
  const experience = await buildExperienceContext({ requester: request.requester, domain: route.primaryDomain, agentId: request.agentId, moduleId: request.currentModule, projectId: request.projectId, artifactId: request.artifactId, sessionId: request.sessionId, currentInstruction: request.task, budget });
  return {
    primaryDomain: route.primaryDomain,
    relatedDomains: route.relatedDomains,
    specialist: route.owner,
    knowledge: knowledge.slice(0, budget),
    experience,
    truncated: knowledge.length > budget || experience.truncated,
    generatedAt: new Date().toISOString(),
  };
}
