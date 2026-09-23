import { KnowledgeQuery } from "./contracts";
import { domainRegistry } from "./domain-registry";
import { queryKnowledge } from "./service";
import { decideKnowledgeAccess } from "./policy";

export interface PublicKnowledgeCapability { id: string; agentId: string; domain: string; description: string; input: string[]; output: string[]; allowedConsumers: string[]; public: true; }
export interface KnowledgeContract { domain: string; providerAgent: string; visibility: "PUBLIC_TO_AGENTS"; allowedConsumers: string[]; categories: string[]; capabilities: string[]; sensitivityPolicy: "PUBLIC_ONLY"; }
export interface PublicKnowledgeProfile { domain: string; ownerAgent?: string; specialists: string[]; capabilities: PublicKnowledgeCapability[]; contracts: KnowledgeContract[]; }
export interface KnowledgePacket { id: string; requester: string; provider: string; domain: string; purpose: string; facts: Array<{ knowledgeId: string; title: string; content: string }>; constraints: string[]; provenanceIds: string[]; createdAt: string; }
export interface DomainResponse { domain: string; specialistAgent: string; answer: string; evidence: string[]; sources: string[]; confidence: number; assumptions: string[]; limitations: string[]; packet: KnowledgePacket; }

export function listPublicCapabilities(): PublicKnowledgeCapability[] {
  domainRegistry.hydrateBrowserSnapshot();
  return domainRegistry.listDomains().flatMap((domain) => domainRegistry.resolvePublicCapabilities(domain.id)
    .filter((capability) => capability.domain === domain.id)
    .map((capability) => ({ ...capability, agentId: capability.providerAgent, public: true as const })));
}

export function getPublicKnowledgeProfile(domainId: string): PublicKnowledgeProfile | undefined {
  domainRegistry.hydrateBrowserSnapshot();
  const domain = domainRegistry.resolveDomain(domainId);
  if (!domain) return undefined;
  const policy = domainRegistry.resolveKnowledgePolicy(domain.id);
  const capabilities = domainRegistry.resolvePublicCapabilities(domain.id).map((capability) => ({ ...capability, agentId: capability.providerAgent, public: true as const }));
  const contracts = capabilities.map((capability): KnowledgeContract => ({ domain: capability.domain, providerAgent: capability.agentId, visibility: "PUBLIC_TO_AGENTS", allowedConsumers: [...capability.allowedConsumers], categories: ["public-capability", "public-knowledge"], capabilities: [capability.id], sensitivityPolicy: "PUBLIC_ONLY" }));
  return { domain: domain.id, ownerAgent: policy?.ownerAgent, specialists: domainRegistry.resolveSpecialists(domain.id), capabilities, contracts };
}

export async function requestKnowledgePacket(request: KnowledgeQuery & { provider?: string }): Promise<KnowledgePacket> {
  domainRegistry.hydrateBrowserSnapshot();
  const domain = request.domain || "system.orchestration";
  const provider = request.provider || domainRegistry.resolveOwner(domain) || "athena";
  if (!domainRegistry.resolveSpecialists(domain).includes(provider)) throw new Error("[KNOWLEDGE_PROVIDER_UNREGISTERED] Provider não está registrado como especialista do domínio solicitado.");
  const items = await queryKnowledge({ ...request, provider, domain, scope: request.scope || "PUBLIC" });
  const packetItems = items.slice(0, 8);
  return {
    id: `packet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    requester: request.requester,
    provider,
    domain,
    purpose: request.purpose,
    facts: packetItems.map((item) => {
      const decision = decideKnowledgeAccess(item, { ...request, domain });
      const content = decision.decision === "ALLOW" ? item.content : `${item.content.slice(0, 280)}${item.content.length > 280 ? "…" : ""}`;
      return { knowledgeId: item.id, title: item.title, content };
    }),
    constraints: ["Somente conhecimento autorizado foi incluído.", "O pacote não contém raciocínio interno."],
    provenanceIds: packetItems.map((item) => item.id),
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

export async function askSpecialist(request: KnowledgeQuery): Promise<DomainResponse> {
  domainRegistry.hydrateBrowserSnapshot();
  const domain = request.domain || "system.orchestration";
  const provider = domainRegistry.resolveOwner(domain) || "athena";
  return requestDomainResponse({ ...request, domain, provider, scope: request.scope || "PUBLIC" });
}
