import { buildExperienceContext, ExperienceContext } from "../experience";
import { KnowledgeItem, KnowledgeQuery } from "./contracts";
import { queryKnowledge } from "./service";
import { routeKnowledgeIntent } from "./router";

export interface AgentContextRequest extends Omit<KnowledgeQuery, "domain" | "query"> {
  task: string;
  ownerId?: string;
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
  if (budget === 0) {
    const requesterOwnerId = request.ownerId || (request.requester.startsWith("user:") ? request.requester.slice("user:".length) : undefined);
    const experience = await buildExperienceContext({ requester: request.requester, ownerId: requesterOwnerId, agentId: request.agentId, moduleId: request.currentModule, projectId: request.projectId, artifactId: request.artifactId, sessionId: request.sessionId, currentInstruction: request.task, budget: 0 });
    return { relatedDomains: [], knowledge: [], experience, truncated: experience.truncated, generatedAt: new Date().toISOString() };
  }
  const domains = [...new Set([route.primaryDomain, ...route.relatedDomains].filter((domain): domain is string => Boolean(domain)))].slice(0, 5);
  const perDomainLimit = Math.max(1, Math.ceil(budget / Math.max(1, domains.length)));
  const packs = await Promise.all(domains.map((domain) => queryKnowledge({ requester: request.requester, domain, query: request.task, projectId: request.projectId, purpose: request.purpose, scope: request.scope, limit: perDomainLimit })));
  const knowledge = [...new Map(packs.flat().map((item) => [item.id, item])).values()];
  const requesterOwnerId = request.ownerId || (request.requester.startsWith("user:") ? request.requester.slice("user:".length) : undefined);
  const remainingBudget = Math.max(0, budget - knowledge.length);
  const experience = await buildExperienceContext({ requester: request.requester, ownerId: requesterOwnerId, domain: route.primaryDomain, agentId: request.agentId, moduleId: request.currentModule, projectId: request.projectId, artifactId: request.artifactId, sessionId: request.sessionId, currentInstruction: request.task, budget: remainingBudget });
  return {
    primaryDomain: route.primaryDomain,
    relatedDomains: route.relatedDomains,
    specialist: route.owner,
    knowledge: knowledge.slice(0, budget),
    experience,
    truncated: knowledge.length >= budget || experience.truncated,
    generatedAt: new Date().toISOString(),
  };
}
