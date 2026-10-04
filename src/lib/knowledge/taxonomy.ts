import type { KnowledgeItem } from "./contracts";
import type { DomainDefinition } from "./domain-registry";

export interface KnowledgeTaxonomyNode {
  domain: DomainDefinition;
  directItemCount: number;
  subtreeItemCount: number;
  children: KnowledgeTaxonomyNode[];
}

export interface KnowledgeTaxonomy {
  roots: KnowledgeTaxonomyNode[];
  unmappedItemCount: number;
}

/** Build a semantic tree without changing physical Vault placement or exposing item content. */
export function buildKnowledgeTaxonomy(domains: DomainDefinition[], authorizedItems: Pick<KnowledgeItem, "primaryDomain">[]): KnowledgeTaxonomy {
  const nodes = new Map(domains.map((domain) => [domain.id, { domain, directItemCount: 0, subtreeItemCount: 0, children: [] as KnowledgeTaxonomyNode[] }]));
  let unmappedItemCount = 0;
  for (const item of authorizedItems) {
    const node = nodes.get(item.primaryDomain);
    if (node) node.directItemCount += 1;
    else unmappedItemCount += 1;
  }

  const roots: KnowledgeTaxonomyNode[] = [];
  for (const node of [...nodes.values()].sort((left, right) => left.domain.id.localeCompare(right.domain.id))) {
    const parentId = node.domain.parentId;
    const parent = parentId ? nodes.get(parentId) : undefined;
    let cursor = parent;
    const visited = new Set<string>();
    let cycle = false;
    while (cursor && !visited.has(cursor.domain.id)) {
      if (cursor.domain.id === node.domain.id) { cycle = true; break; }
      visited.add(cursor.domain.id);
      cursor = cursor.domain.parentId ? nodes.get(cursor.domain.parentId) : undefined;
    }
    if (parent && !cycle) parent.children.push(node);
    else roots.push(node);
  }

  const countSubtree = (node: KnowledgeTaxonomyNode): number => {
    node.children.sort((left, right) => left.domain.label.localeCompare(right.domain.label) || left.domain.id.localeCompare(right.domain.id));
    node.subtreeItemCount = node.directItemCount + node.children.reduce((sum, child) => sum + countSubtree(child), 0);
    return node.subtreeItemCount;
  };
  roots.sort((left, right) => left.domain.label.localeCompare(right.domain.label) || left.domain.id.localeCompare(right.domain.id));
  roots.forEach(countSubtree);
  return { roots, unmappedItemCount };
}
