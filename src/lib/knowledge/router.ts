import { domainRegistry } from "./domain-registry";

export interface DomainRoute { primaryDomain?: string; relatedDomains: string[]; owner?: string; specialists: string[]; recommendedDelegation: boolean; reason: string; }
export interface DomainDecomposition extends DomainRoute { requiredCapabilities: string[]; }

const rules: Array<{ pattern: RegExp; domain: string; related?: string[] }> = [
  { pattern: /copyright|direito autoral|royalty[- ]free|licen[cç]a.{0,24}(?:m[uú]sic|trilha|[áa]udio)|(?:m[uú]sic|trilha|[áa]udio).{0,24}licen[cç]a/i, domain: "legal.intellectual-property", related: ["music.asset-provenance"] },
  { pattern: /propriedade intelectual|patente|marca registrada|uso comercial/i, domain: "legal.intellectual-property", related: [] },
  { pattern: /game[ -]?audio|adaptive music|[áa]udio.{0,16}jogo|trilha.{0,16}(?:jogo|game)|m[uú]sica.{0,16}(?:jogo|game)/i, domain: "music.game-audio", related: ["game-development"] },
  { pattern: /harmonia|acorde|progress[aã]o harm[oô]nica/i, domain: "music.theory.harmony" },
  { pattern: /(?:composi[cç][aã]o|arranjo|orquestra[cç][aã]o|songwriting)/i, domain: "music.composition" },
  { pattern: /copyright|licen[cç]a|contrato|direito|lei|jur[ií]dic/i, domain: "legal", related: ["music"] },
  { pattern: /m[uú]sic|[áa]udio|trilha|melodia|bpm|stem/i, domain: "music", related: ["game-development"] },
  { pattern: /jogo|game|mec[aâ]nica|gameplay/i, domain: "game-development", related: ["music"] },
];

export function routeKnowledgeIntent(input: { task: string; currentModule?: string; projectId?: string }): DomainRoute {
  domainRegistry.hydrateBrowserSnapshot();
  const match = rules.find((rule) => rule.pattern.test(`${input.task} ${input.currentModule || ""}`));
  if (!match) return { relatedDomains: [], specialists: [], recommendedDelegation: false, reason: "Domínio não identificado com confiança suficiente." };
  const owner = domainRegistry.resolveOwner(match.domain);
  const specialists = domainRegistry.resolveSpecialists(match.domain);
  return { primaryDomain: match.domain, relatedDomains: match.related ?? domainRegistry.resolveRelatedDomains(match.domain), owner, specialists, recommendedDelegation: specialists.length > 0, reason: "Rota determinada por contexto estruturado e vocabulário do domínio." };
}

export function decomposeKnowledgeTask(input: { task: string; currentModule?: string; projectId?: string }): DomainDecomposition {
  const route = routeKnowledgeIntent(input);
  const domains = [route.primaryDomain, ...route.relatedDomains].filter(Boolean) as string[];
  const requiredCapabilities = domains.flatMap((domain) => domainRegistry.resolveCapabilities(domain));
  return { ...route, requiredCapabilities: [...new Set(requiredCapabilities)] };
}
