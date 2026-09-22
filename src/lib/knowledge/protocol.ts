import { KnowledgeItem, KnowledgeQuery } from "./contracts";
import { domainRegistry } from "./domain-registry";
import { queryKnowledge } from "./service";
import { decideKnowledgeAccess } from "./policy";

export interface PublicKnowledgeCapability { id: string; agentId: string; domain: string; description: string; input: string[]; output: string[]; public: true; }
export interface KnowledgeContract { domain: string; providerAgent: string; visibility: "PUBLIC_TO_AGENTS"; allowedConsumers: string[]; categories: string[]; capabilities: string[]; sensitivityPolicy: "PUBLIC_ONLY"; }
export interface PublicKnowledgeProfile { domain: string; ownerAgent?: string; specialists: string[]; capabilities: PublicKnowledgeCapability[]; contract: KnowledgeContract; }
export interface KnowledgePacket { id: string; requester: string; provider: string; domain: string; purpose: string; facts: Array<{ knowledgeId: string; title: string; content: string }>; constraints: string[]; provenanceIds: string[]; createdAt: string; }
export interface DomainResponse { domain: string; specialistAgent: string; answer: string; evidence: string[]; sources: string[]; confidence: number; assumptions: string[]; limitations: string[]; packet: KnowledgePacket; }

export function listPublicCapabilities(): PublicKnowledgeCapability[] {
  return domainRegistry.listDomains().flatMap((domain) => (domain.primaryOwner ? domain.capabilities.map((id) => ({ id, agentId: domain.primaryOwner!, domain: domain.id, description: `Capability pública do domínio ${domain.label}.`, input: ["query", "purpose"], output: ["structured_context", "provenance"], public: true as const })) : []));
}

export function getPublicKnowledgeProfile(domainId: string): PublicKnowledgeProfile | undefined {
  const domain = domainRegistry.resolveDomain(domainId);
  if (!domain) return undefined;
  const capabilities = listPublicCapabilities().filter((capability) => capability.domain === domain.id);
  return { domain: domain.id, ownerAgent: domain.primaryOwner, specialists: domainRegistry.resolveSpecialists(domain.id), capabilities, contract: { domain: domain.id, providerAgent: domain.primaryOwner || "system", visibility: "PUBLIC_TO_AGENTS", allowedConsumers: ["*"], categories: ["public-capability", "public-knowledge"], capabilities: capabilities.map((capability) => capability.id), sensitivityPolicy: "PUBLIC_ONLY" } };
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
    facts: items.slice(0, 8).map((item) => {
      const decision = decideKnowledgeAccess(item, { ...request, domain });
      const content = decision.decision === "ALLOW" ? item.content : `${item.content.slice(0, 280)}${item.content.length > 280 ? "…" : ""}`;
      return { knowledgeId: item.id, title: item.title, content };
    }),
    constraints: ["Somente conhecimento autorizado foi incluído.", "O pacote não contém raciocínio interno."],
    provenanceIds: items.map((item) => item.id),
    createdAt: new Date().toISOString(),
  };
}

export async function requestDomainResponse(request: KnowledgeQuery & { provider?: string }): Promise<DomainResponse> {
  const packet = await requestKnowledgePacket(request);
  const evidence = packet.facts.map((fact) => fact.knowledgeId);
  return {
    domain: packet.domain,
    specialistAgent: packet.provider,
    answer: packet.facts.length ? packet.facts.map((fact) => `${fact.title}: ${fact.content}`).join("\n") : "Nenhum conhecimento autorizado foi encontrado para esta solicitação.",
    evidence,
    sources: packet.provenanceIds,
    confidence: packet.facts.length ? 0.75 : 0,
    assumptions: packet.facts.length ? [] : ["A ausência de resultado não prova que o conhecimento não exista."],
    limitations: ["Resposta limitada ao conhecimento autorizado e indexado."],
    packet,
  };
}
