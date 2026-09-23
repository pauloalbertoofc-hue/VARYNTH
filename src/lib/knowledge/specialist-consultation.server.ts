import { agentRegistry } from "@/lib/athena/agents/registry";
import type { KnowledgeQuery } from "./contracts";
import { domainRegistry } from "./domain-registry";
import { requestKnowledgePacket, type DomainResponse, type KnowledgePacket } from "./protocol";

function emptyPacket(request: KnowledgeQuery, domain: string, provider: string, constraint: string): KnowledgePacket {
  return {
    id: `packet-${Date.now()}`,
    requester: request.requester,
    provider,
    domain,
    purpose: request.purpose,
    facts: [],
    constraints: [constraint],
    provenanceIds: [],
    truncated: false,
    createdAt: new Date().toISOString(),
  };
}

function unavailableResponse(domain: string, provider: string, packet: KnowledgePacket, answer: string): DomainResponse {
  return {
    domain,
    specialistAgent: provider,
    answer,
    evidence: [],
    sources: [],
    confidence: 0,
    assumptions: ["Nenhuma análise de especialista foi executada."],
    limitations: ["O conteúdo do domínio permanece protegido; disponibilidade do especialista não concede acesso alternativo."],
    packet,
    consultation: { status: "SPECIALIST_UNAVAILABLE", provider },
  };
}

/** Invoke only the registered domain owner, passing only facts already authorized by Knowledge policy. */
export async function askSpecialist(request: KnowledgeQuery): Promise<DomainResponse> {
  domainRegistry.hydrateBrowserSnapshot();
  const domain = request.domain || "system.orchestration";
  const provider = domainRegistry.resolveOwner(domain);
  if (!provider) {
    const packet = emptyPacket(request, domain, "unassigned", "O domínio não possui owner registrado.");
    return unavailableResponse(domain, "unassigned", packet, "Não há especialista responsável registrado para este domínio.");
  }

  const agent = agentRegistry.getAgent(provider);
  if (!agent?.manifest.enabled || !agent.consultKnowledge) {
    const packet = emptyPacket(request, domain, provider, "O owner não possui executor de consulta Knowledge habilitado.");
    return unavailableResponse(domain, provider, packet, `O especialista ${provider} não possui um executor de consulta Knowledge habilitado.`);
  }

  const packet = await requestKnowledgePacket({ ...request, domain, provider, scope: request.scope || "PUBLIC" });
  if (!packet.facts.length) {
    return {
      domain,
      specialistAgent: provider,
      answer: "Nenhuma fonte Knowledge autorizada foi encontrada; o especialista não foi invocado para evitar uma resposta sem evidência.",
      evidence: [],
      sources: [],
      confidence: 0,
      assumptions: ["Ausência de resultados não prova que o conhecimento inexista."],
      limitations: ["Nenhum conteúdo de domínio foi entregue ao agente."],
      packet,
      consultation: { status: "NO_AUTHORIZED_KNOWLEDGE", provider },
    };
  }

  const result = await agent.consultKnowledge({
    domain,
    query: request.query || "",
    purpose: request.purpose,
    truncated: packet.truncated,
    sources: packet.facts.map((fact) => ({
      id: fact.knowledgeId,
      title: fact.title,
      content: fact.content,
      domain: fact.domain,
      sourceReference: fact.sourceReference,
      sourceSpan: fact.sourceSpan,
      derivedFromIds: fact.derivedFromIds,
      authority: fact.authority,
      assertion: fact.assertion,
      freshness: fact.freshness,
      truncated: fact.truncated,
    })),
  });
  const authorizedIds = new Set(packet.provenanceIds);
  const usedSources = [...new Set((result.sources || []).filter((source) => authorizedIds.has(source)))];
  const limitations = result.limitations?.length ? result.limitations : ["A consulta recebeu somente o KnowledgePacket autorizado."];
  return {
    domain,
    specialistAgent: provider,
    answer: result.success ? result.content : "O especialista não conseguiu produzir uma resposta sustentada pelas fontes autorizadas.",
    evidence: usedSources,
    sources: usedSources,
    confidence: result.success ? Math.max(0, Math.min(result.confidence, 0.65)) : 0,
    assumptions: result.success ? [] : ["O conteúdo recuperado não foi suficiente para uma resposta fundamentada."],
    limitations,
    packet,
    consultation: { status: result.success ? "SPECIALIST_INVOKED" : "SPECIALIST_FAILED", provider, executionMode: "REGISTERED_AGENT_KNOWLEDGE_METHOD" },
  };
}
