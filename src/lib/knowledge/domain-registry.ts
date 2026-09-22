export interface DomainDefinition {
  id: string;
  label: string;
  parentId?: string;
  primaryOwner?: string;
  specialists: string[];
  capabilities: string[];
  relatedDomains: string[];
  enabled: boolean;
}

export class DomainRegistry {
  private readonly domains = new Map<string, DomainDefinition>();

  register(domain: DomainDefinition): void {
    this.domains.set(domain.id, { ...domain, specialists: [...domain.specialists], capabilities: [...domain.capabilities], relatedDomains: [...domain.relatedDomains] });
  }

  getDomain(id: string): DomainDefinition | undefined { return this.domains.get(id); }
  listDomains(): DomainDefinition[] { return [...this.domains.values()].filter((domain) => domain.enabled); }
  resolveDomain(id: string): DomainDefinition | undefined {
    return this.getDomain(id) || this.listDomains().find((domain) => id.startsWith(`${domain.id}.`));
  }
  resolveOwner(id: string): string | undefined { return this.resolveDomain(id)?.primaryOwner; }
  resolveSpecialists(id: string): string[] { return this.resolveDomain(id)?.specialists ?? []; }
  resolveRelatedDomains(id: string): string[] { return this.resolveDomain(id)?.relatedDomains ?? []; }
}

export const domainRegistry = new DomainRegistry();
domainRegistry.register({ id: "system.orchestration", label: "System Orchestration", primaryOwner: "athena", specialists: ["athena"], capabilities: ["discoverDomain", "delegateTask"], relatedDomains: [], enabled: true });
domainRegistry.register({ id: "music", label: "Music & Audio", primaryOwner: "euterpe", specialists: ["euterpe"], capabilities: ["music.explainTheory", "music.inspectMetadata", "music.analyzeStructure"], relatedDomains: ["game-development", "legal.intellectual-property"], enabled: true });
domainRegistry.register({ id: "legal", label: "Legal", primaryOwner: "justitia", specialists: ["justitia"], capabilities: ["legal.explainConcept", "legal.identifyRelevantDomain"], relatedDomains: ["music", "privacy"], enabled: true });
domainRegistry.register({ id: "game-development", label: "Game Development", specialists: [], capabilities: [], relatedDomains: ["music.game-audio"], enabled: true });
