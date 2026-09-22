import { domainRegistry } from "./domain-registry";

export interface DomainRoute { primaryDomain?: string; relatedDomains: string[]; owner?: string; specialists: string[]; recommendedDelegation: boolean; reason: string; }

const rules: Array<{ pattern: RegExp; domain: string; related?: string[] }> = [
  { pattern: /copyright|licen[cç]a|contrato|direito|lei|jur[ií]dic/i, domain: "legal", related: ["music"] },
  { pattern: /m[uú]sic|[áa]udio|trilha|melodia|harmonia|bpm|stem/i, domain: "music", related: ["game-development"] },
  { pattern: /jogo|game|mec[aâ]nica|gameplay/i, domain: "game-development", related: ["music"] },
];

export function routeKnowledgeIntent(input: { task: string; currentModule?: string; projectId?: string }): DomainRoute {
  const match = rules.find((rule) => rule.pattern.test(`${input.task} ${input.currentModule || ""}`));
  if (!match) return { relatedDomains: [], specialists: [], recommendedDelegation: false, reason: "Domínio não identificado com confiança suficiente." };
  const owner = domainRegistry.resolveOwner(match.domain);
  const specialists = domainRegistry.resolveSpecialists(match.domain);
  return { primaryDomain: match.domain, relatedDomains: match.related || domainRegistry.resolveRelatedDomains(match.domain), owner, specialists, recommendedDelegation: specialists.length > 0, reason: "Rota determinada por contexto estruturado e vocabulário do domínio." };
}
