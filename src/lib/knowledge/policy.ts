import { KnowledgeAccessDecision, KnowledgeItem, KnowledgeQuery } from "./contracts";

export function decideKnowledgeAccess(item: KnowledgeItem, request: KnowledgeQuery): KnowledgeAccessDecision {
  if (item.visibility === "SYSTEM") return { decision: "ALLOW", reason: "Conhecimento sistêmico." };
  if (item.sensitivity === "PRIVATE" || item.visibility === "PRIVATE") return { decision: "DENY", reason: "Conhecimento privado." };
  if (item.visibility === "AGENT_PRIVATE" && item.ownerAgent !== request.requester) return { decision: "DENY", reason: "Conhecimento privado do agente responsável." };
  if (item.visibility === "PROJECT" && item.relatedProjectIds.length > 0 && !request.projectId) return { decision: "DENY", reason: "Projeto não informado." };
  if (item.visibility === "PROJECT" && request.projectId && !item.relatedProjectIds.includes(request.projectId)) return { decision: "DENY", reason: "Projeto fora do escopo." };
  if (request.scope === "PUBLIC" && item.visibility !== "PUBLIC_TO_AGENTS") return { decision: "DENY", reason: "A consulta exige conhecimento público entre agentes." };
  return { decision: item.visibility === "PUBLIC_TO_AGENTS" ? "ALLOW" : "ALLOW_SUMMARY", reason: "Acesso permitido pela política." };
}
