import { domainRegistry } from "./domain-registry";

export interface DomainRoute { primaryDomain?: string; relatedDomains: string[]; owner?: string; specialists: string[]; recommendedDelegation: boolean; reason: string; }
export interface DomainDecomposition extends DomainRoute { requiredCapabilities: string[]; }

const rules: Array<{ pattern: RegExp; domain: string; related?: string[] }> = [
  { pattern: /copyright|direito autoral|royalty[- ]free|licen[cç]a.{0,24}(?:comercial|m[uú]sic|trilha|[áa]udio)|(?:m[uú]sic|trilha|[áa]udio).{0,24}licen[cç]a/i, domain: "legal.intellectual-property", related: ["music.asset-provenance"] },
  { pattern: /propriedade intelectual|patente|marca registrada|uso comercial/i, domain: "legal.intellectual-property", related: [] },
  { pattern: /game[ -]?audio|adaptive music|trilha.{0,48}adaptativa|[áa]udio.{0,48}jogo|trilha.{0,48}(?:jogo|game)|m[uú]sica.{0,48}(?:jogo|game)/i, domain: "music.game-audio", related: ["game-development"] },
  { pattern: /harmonia|acorde|progress[aã]o harm[oô]nica/i, domain: "music.theory.harmony" },
  { pattern: /(?:composi[cç][aã]o|arranjo|orquestra[cç][aã]o|songwriting)/i, domain: "music.composition" },
  { pattern: /copyright|licen[cç]a|contrato|direito|lei|jur[ií]dic/i, domain: "legal", related: ["music"] },
  { pattern: /m[uú]sic|[áa]udio|trilha|melodia|bpm|stem/i, domain: "music", related: ["game-development"] },
  { pattern: /jogo|game|mec[aâ]nica|gameplay/i, domain: "game-development", related: ["music"] },
];

export function routeKnowledgeIntent(input: { task: string; currentModule?: string; projectId?: string }): DomainRoute {
  domainRegistry.hydrateBrowserSnapshot();
  const context = `${input.task} ${input.currentModule || ""}`;
  const matches = rules.filter((rule) => rule.pattern.test(context));
  const primary = matches[0];
  if (!primary) return { relatedDomains: [], specialists: [], recommendedDelegation: false, reason: "Domínio não identificado com confiança suficiente." };
  const relatedDomains = [...new Set([
    ...(primary.related || []),
    ...domainRegistry.resolveRelatedDomains(primary.domain),
    ...matches.slice(1).map((match) => match.domain),
    ...matches.slice(1).flatMap((match) => match.related || []),
  ])].filter((domain) => domain !== primary.domain);
  const owner = domainRegistry.resolveOwner(primary.domain);
  const specialists = domainRegistry.resolveSpecialists(primary.domain);
  return { primaryDomain: primary.domain, relatedDomains, owner, specialists, recommendedDelegation: specialists.length > 0, reason: matches.length > 1 ? "Rota interdisciplinar determinada por múltiplas regras estruturadas de domínio." : "Rota determinada por contexto estruturado e vocabulário do domínio." };
}

export function decomposeKnowledgeTask(input: { task: string; currentModule?: string; projectId?: string }): DomainDecomposition {
  const route = routeKnowledgeIntent(input);
  const domains = [route.primaryDomain, ...route.relatedDomains].filter(Boolean) as string[];
  const requiredCapabilities = domains.flatMap((domain) => domainRegistry.resolveCapabilities(domain));
  return { ...route, requiredCapabilities: [...new Set(requiredCapabilities)] };
}
