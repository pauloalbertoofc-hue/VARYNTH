import { knowledgeRepository } from "../persistence/repositories";
import { KnowledgeItem, KnowledgeQuery } from "./contracts";
import { decideKnowledgeAccess } from "./policy";

export async function storeKnowledge(item: KnowledgeItem): Promise<KnowledgeItem> { return knowledgeRepository.save(item); }

export async function queryKnowledge(request: KnowledgeQuery): Promise<KnowledgeItem[]> {
  const needle = request.query?.trim().toLocaleLowerCase();
  const candidates = await knowledgeRepository.getAll((item) => {
    const inDomain = !request.domain || item.primaryDomain === request.domain || item.relatedDomains.includes(request.domain) || item.primaryDomain.startsWith(`${request.domain}.`);
    const inProject = !request.projectId || item.relatedProjectIds.length === 0 || item.relatedProjectIds.includes(request.projectId);
    const text = `${item.title} ${item.content} ${item.tags.join(" ")}`.toLocaleLowerCase();
    return inDomain && inProject && (!needle || text.includes(needle));
  });
  return candidates.filter((item) => decideKnowledgeAccess(item, request).decision !== "DENY");
}
