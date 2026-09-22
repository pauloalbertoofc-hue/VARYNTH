import { KnowledgeItem, KnowledgeQuery } from "./contracts";
import { domainRegistry } from "./domain-registry";
import { queryKnowledge } from "./service";

export interface PublicKnowledgeCapability { id: string; agentId: string; domain: string; description: string; input: string[]; output: string[]; public: true; }
export interface KnowledgePacket { id: string; requester: string; provider: string; domain: string; purpose: string; facts: Array<{ knowledgeId: string; title: string; content: string }>; constraints: string[]; provenanceIds: string[]; createdAt: string; }
export interface DomainResponse { domain: string; specialistAgent: string; answer: string; evidence: string[]; sources: string[]; confidence: number; assumptions: string[]; limitations: string[]; packet: KnowledgePacket; }

export function listPublicCapabilities(): PublicKnowledgeCapability[] {
  return domainRegistry.listDomains().flatMap((domain) => (domain.primaryOwner ? domain.capabilities.map((id) => ({ id, agentId: domain.primaryOwner!, domain: domain.id, description: `Capability pública do domínio ${domain.label}.`, input: ["query", "purpose"], output: ["structured_context", "provenance"], public: true as const })) : []));
}

export async function requestKnowledgePacket(request: KnowledgeQuery & { provider?: string }): Promise<KnowledgePacket> {
  const domain = request.domain || "system.orchestration";
  const provider = request.provider || domainRegistry.resolveOwner(domain) || "athena";
  const items = await queryKnowledge({ ...request, domain, scope: request.scope || "PUBLIC" });
  return {
    id: `packet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    requester: request.requester,
    provider,
    domain,
    purpose: request.purpose,
    facts: items.slice(0, 8).map((item) => ({ knowledgeId: item.id, title: item.title, content: item.content })),
    constraints: ["Somente conhecimento autorizado foi incluído.", "O pacote não contém raciocínio interno."],
    provenanceIds: items.map((item) => item.id),
    createdAt: new Date().toISOString(),
  };
}
