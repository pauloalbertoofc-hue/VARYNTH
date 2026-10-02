import { domainRegistry, type DomainRegistry } from "./domain-registry";

export interface DomainRoute {
  primaryDomain?: string;
  relatedDomains: string[];
  owner?: string;
  specialists: string[];
  matchedDomains: Array<{ domain: string; matchedTerms: string[]; owner?: string; specialists: string[] }>;
  recommendedDelegation: boolean;
  reason: string;
}
export interface DomainDecomposition extends DomainRoute { requiredCapabilities: string[]; }

function normalizeRoutingText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, " ").trim();
}

export function routeKnowledgeIntent(input: { task: string; currentModule?: string; projectId?: string; registry?: DomainRegistry }): DomainRoute {
  const registry = input.registry || domainRegistry;
  registry.hydrateBrowserSnapshot();
  const context = ` ${normalizeRoutingText(`${input.task} ${input.currentModule || ""}`)} `;
  const directMatches = registry.listDomains().flatMap((domain) => {
    const matchedTerms = [...new Set((domain.routingTerms || []).filter((term) => {
      const normalizedTerm = normalizeRoutingText(term);
      return normalizedTerm.length > 0 && context.includes(` ${normalizedTerm} `);
    }))];
    if (!matchedTerms.length) return [];
    return [{ domain: domain.id, matchedTerms, priority: domain.routingPriority || 0, owner: registry.resolveOwner(domain.id), specialists: registry.resolveSpecialists(domain.id) }];
  }).sort((left, right) => right.priority - left.priority
    || Math.max(...right.matchedTerms.map((term) => normalizeRoutingText(term).length)) - Math.max(...left.matchedTerms.map((term) => normalizeRoutingText(term).length))
    || left.domain.localeCompare(right.domain));
  const matchedBridges = registry.listDomainBridges().filter((bridge) => bridge.concepts.some((term) => context.includes(` ${normalizeRoutingText(term)} `)));
  const bridgeMatches = matchedBridges.flatMap((bridge) => {
    const matchedTerms = bridge.concepts.filter((term) => context.includes(` ${normalizeRoutingText(term)} `));
    if (!matchedTerms.length) return [];
    return bridge.domains.map((domainId) => ({ domain: domainId, matchedTerms, priority: registry.getDomain(domainId)?.routingPriority || 0, owner: registry.resolveOwner(domainId), specialists: registry.resolveSpecialists(domainId) }));
  });
  const combinedMatches = new Map<string, typeof directMatches[number]>();
  for (const match of [...directMatches, ...bridgeMatches]) {
    const existing = combinedMatches.get(match.domain);
    combinedMatches.set(match.domain, { ...match, matchedTerms: [...new Set([...(existing?.matchedTerms || []), ...match.matchedTerms])] });
  }
  const matches = [...combinedMatches.values()]
    .sort((left, right) => right.priority - left.priority
      || Math.max(...right.matchedTerms.map((term) => normalizeRoutingText(term).length)) - Math.max(...left.matchedTerms.map((term) => normalizeRoutingText(term).length))
      || left.domain.localeCompare(right.domain));
  const primary = matches[0];
  if (!primary) return { relatedDomains: [], specialists: [], matchedDomains: [], recommendedDelegation: false, reason: "Domínio não identificado com confiança suficiente." };
  const matchedDomainIds = matches.map((match) => match.domain);
  const relatedDomains = [...new Set([
    ...matchedDomainIds.slice(1),
    ...matches.flatMap((match) => registry.resolveRelatedDomains(match.domain)),
  ])].filter((domain) => domain !== primary.domain);
  const specialists = [...new Set(matches.flatMap((match) => match.specialists))];
  return {
    primaryDomain: primary.domain,
    relatedDomains,
    owner: primary.owner,
    specialists,
    matchedDomains: matches.map(({ domain, matchedTerms, owner, specialists: domainSpecialists }) => ({ domain, matchedTerms, owner, specialists: domainSpecialists })),
    recommendedDelegation: specialists.length > 0,
    reason: matchedBridges.length ? "Rota interdisciplinar determinada por conceitos de DomainBridge registrados e pelos termos declarados nos domínios." : matches.length > 1 ? "Rota interdisciplinar determinada pelos termos e prioridades declarados nos domínios registrados." : "Rota determinada pelos termos estruturados declarados no Domain Registry.",
  };
}

export function decomposeKnowledgeTask(input: { task: string; currentModule?: string; projectId?: string; registry?: DomainRegistry }): DomainDecomposition {
  const route = routeKnowledgeIntent(input);
  const domains = [route.primaryDomain, ...route.relatedDomains].filter(Boolean) as string[];
  const registry = input.registry || domainRegistry;
  const requiredCapabilities = domains.flatMap((domain) => registry.resolveCapabilities(domain));
  return { ...route, requiredCapabilities: [...new Set(requiredCapabilities)] };
}
