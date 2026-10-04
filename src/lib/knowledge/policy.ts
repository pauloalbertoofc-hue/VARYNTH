import { KnowledgeAccessDecision, KnowledgeItem, KnowledgeQuery } from "./contracts";
import { domainRegistry } from "./domain-registry";

export function decideKnowledgeAccess(item: KnowledgeItem, request: KnowledgeQuery): KnowledgeAccessDecision {
  domainRegistry.hydrateBrowserSnapshot();
  if (request.operation === "CAN_DISCOVER") return { decision: "ALLOW", reason: "Metadados podem ser descobertos; conteúdo permanece protegido." };
  if (item.visibility === "PRIVATE") return { decision: "DENY", reason: "Conhecimento privado." };
  if (item.sensitivity === "PRIVATE" && item.visibility !== "AGENT_PRIVATE") return { decision: "DENY", reason: "Conhecimento privado." };
  if (item.sensitivity === "SENSITIVE" && item.visibility !== "DOMAIN" && item.visibility !== "PROJECT" && !(item.visibility === "AGENT_PRIVATE" && item.ownerAgent === request.requester)) return { decision: "DENY", reason: "Conhecimento sensível exige acesso de domínio, projeto autorizado ou owner do agente." };
  if (item.visibility === "SYSTEM") return { decision: "ALLOW", reason: "Conhecimento sistêmico." };
  const domainPolicy = domainRegistry.resolveKnowledgePolicy(item.primaryDomain);
  if (domainPolicy && (item.visibility === "DOMAIN" || item.visibility === "CROSS_DOMAIN" || item.visibility === "PUBLIC_TO_AGENTS")) {
    if (!domainPolicy.allowedVisibility.includes(item.visibility)) return { decision: "DENY", reason: "Visibility não permitida pela policy efetiva do domínio." };
    const ownerOrSpecialist = request.requester === domainPolicy.ownerAgent || domainRegistry.resolveSpecialists(item.primaryDomain).includes(request.requester);
    if (!ownerOrSpecialist && !domainPolicy.allowedConsumers.includes("*") && !domainPolicy.allowedConsumers.includes(request.requester)) return { decision: "DENY", reason: "Solicitante fora da lista de consumidores permitidos pelo domínio." };
    if ((item.visibility === "PUBLIC_TO_AGENTS" || item.visibility === "CROSS_DOMAIN") && (!domainPolicy.publicKnowledge || domainPolicy.sensitivity !== "PUBLIC_ONLY")) return { decision: "DENY", reason: "A policy do domínio não permite compartilhamento entre agentes nesta sensibilidade." };
  }
  if (item.visibility === "AGENT_PRIVATE" && item.ownerAgent !== request.requester) return { decision: "DENY", reason: "Conhecimento privado do agente responsável." };
  if (item.visibility === "DOMAIN") {
    const explicitlyAllowedConsumers = (domainPolicy?.allowedConsumers || []).filter((consumer) => consumer !== "*");
    const authorizedAgents = new Set([item.ownerAgent, domainRegistry.resolveOwner(item.primaryDomain), ...domainRegistry.resolveSpecialists(item.primaryDomain), ...explicitlyAllowedConsumers].filter((agent): agent is string => Boolean(agent)));
    if (!authorizedAgents.has(request.requester)) return { decision: "DENY", reason: "Conhecimento restrito ao owner e especialistas do domínio." };
  }
  if (item.visibility === "CROSS_DOMAIN" && request.domain && request.domain !== item.primaryDomain && !item.relatedDomains.includes(request.domain)) return { decision: "DENY", reason: "Domínio não incluído no compartilhamento interdisciplinar." };
  if (item.visibility === "CROSS_DOMAIN" && !request.domain) return { decision: "DENY", reason: "Domínio de consulta obrigatório para conhecimento interdisciplinar." };
  if (item.visibility === "PROJECT" && item.relatedProjectIds.length === 0) return { decision: "DENY", reason: "Conhecimento de projeto sem projeto associado." };
  if (item.visibility === "PROJECT" && !request.projectId) return { decision: "DENY", reason: "Projeto não informado." };
  if (item.visibility === "PROJECT" && request.projectId && !item.relatedProjectIds.includes(request.projectId)) return { decision: "DENY", reason: "Projeto fora do escopo." };
  if (item.visibility === "PROJECT" && request.projectId && item.ownerAgent !== request.requester && !item.contributingAgents.includes(request.requester)) return { decision: "DENY", reason: "Solicitante não possui vínculo registrado com o conhecimento do projeto." };
  if (request.scope === "PUBLIC" && item.visibility !== "PUBLIC_TO_AGENTS" && item.visibility !== "CROSS_DOMAIN") return { decision: "DENY", reason: "A consulta exige conhecimento público entre agentes." };
  const privateOwnerRead = item.visibility === "AGENT_PRIVATE" && item.ownerAgent === request.requester;
  return { decision: item.visibility === "PUBLIC_TO_AGENTS" || item.visibility === "DOMAIN" || privateOwnerRead ? "ALLOW" : "ALLOW_SUMMARY", reason: "Acesso permitido pela política." };
}
