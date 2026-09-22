import { KnowledgeAccessDecision, KnowledgeItem, KnowledgeQuery } from "./contracts";

export function decideKnowledgeAccess(item: KnowledgeItem, request: KnowledgeQuery): KnowledgeAccessDecision {
  if (request.operation === "CAN_DISCOVER") return { decision: "ALLOW", reason: "Metadados podem ser descobertos; conteúdo permanece protegido." };
  if (item.visibility === "SYSTEM") return { decision: "ALLOW", reason: "Conhecimento sistêmico." };
  if (item.sensitivity === "PRIVATE" || item.visibility === "PRIVATE") return { decision: "DENY", reason: "Conhecimento privado." };
  if (item.visibility === "AGENT_PRIVATE" && item.ownerAgent !== request.requester) return { decision: "DENY", reason: "Conhecimento privado do agente responsável." };
  if (item.visibility === "CROSS_DOMAIN" && request.domain && request.domain !== item.primaryDomain && !item.relatedDomains.includes(request.domain)) return { decision: "DENY", reason: "Domínio não incluído no compartilhamento interdisciplinar." };
  if (item.visibility === "CROSS_DOMAIN" && !request.domain) return { decision: "DENY", reason: "Domínio de consulta obrigatório para conhecimento interdisciplinar." };
  if (item.visibility === "PROJECT" && item.relatedProjectIds.length === 0) return { decision: "DENY", reason: "Conhecimento de projeto sem projeto associado." };
  if (item.visibility === "PROJECT" && !request.projectId) return { decision: "DENY", reason: "Projeto não informado." };
  if (item.visibility === "PROJECT" && request.projectId && !item.relatedProjectIds.includes(request.projectId)) return { decision: "DENY", reason: "Projeto fora do escopo." };
  if (request.scope === "PUBLIC" && item.visibility !== "PUBLIC_TO_AGENTS" && item.visibility !== "CROSS_DOMAIN") return { decision: "DENY", reason: "A consulta exige conhecimento público entre agentes." };
  return { decision: item.visibility === "PUBLIC_TO_AGENTS" ? "ALLOW" : "ALLOW_SUMMARY", reason: "Acesso permitido pela política." };
}
