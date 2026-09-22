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

  registerOwner(domainId: string, owner: string): void {
    const domain = this.requireDomain(domainId);
    domain.primaryOwner = owner;
    if (!domain.specialists.includes(owner)) domain.specialists.unshift(owner);
  }

  registerSpecialist(domainId: string, specialist: string): void {
    const domain = this.requireDomain(domainId);
    if (!domain.specialists.includes(specialist)) domain.specialists.push(specialist);
  }

  registerCapability(domainId: string, capability: string): void {
    const domain = this.requireDomain(domainId);
    if (!domain.capabilities.includes(capability)) domain.capabilities.push(capability);
  }

  getDomain(id: string): DomainDefinition | undefined { return this.domains.get(id); }
  listDomains(): DomainDefinition[] { return [...this.domains.values()].filter((domain) => domain.enabled); }
  resolveDomain(id: string): DomainDefinition | undefined {
    return this.getDomain(id) || this.listDomains().find((domain) => id.startsWith(`${domain.id}.`));
  }
  resolveOwner(id: string): string | undefined {
    let current = this.resolveDomain(id);
    while (current) {
      if (current.primaryOwner) return current.primaryOwner;
      current = current.parentId ? this.domains.get(current.parentId) : undefined;
    }
    return undefined;
  }
  resolveSpecialists(id: string): string[] {
    const current = this.resolveDomain(id);
    if (!current) return [];
    const inherited = current.parentId ? this.resolveSpecialists(current.parentId) : [];
    return [...new Set([...current.specialists, ...inherited])];
  }
  resolveRelatedDomains(id: string): string[] {
    const domain = this.resolveDomain(id);
    if (!domain) return [];
    const descendants = this.listDomains().filter((candidate) => candidate.parentId === domain.id).map((candidate) => candidate.id);
    return [...new Set([...domain.relatedDomains, ...descendants])];
  }

  listHierarchy(rootId?: string): DomainDefinition[] {
    return this.listDomains().filter((domain) => !rootId || domain.id === rootId || domain.id.startsWith(`${rootId}.`) || domain.parentId === rootId);
  }

  private requireDomain(id: string): DomainDefinition {
    const domain = this.domains.get(id);
    if (!domain) throw new Error(`[DOMAIN_NOT_FOUND] Domínio inexistente: ${id}`);
    return domain;
  }
}

export const domainRegistry = new DomainRegistry();
domainRegistry.register({ id: "system.orchestration", label: "System Orchestration", primaryOwner: "athena", specialists: ["athena"], capabilities: ["discoverDomain", "delegateTask"], relatedDomains: [], enabled: true });
domainRegistry.register({ id: "music", label: "Music & Audio", primaryOwner: "euterpe", specialists: ["euterpe"], capabilities: ["music.explainTheory", "music.inspectMetadata", "music.analyzeStructure"], relatedDomains: ["game-development", "legal.intellectual-property"], enabled: true });
domainRegistry.register({ id: "legal", label: "Legal", primaryOwner: "justitia", specialists: ["justitia"], capabilities: ["legal.explainConcept", "legal.identifyRelevantDomain"], relatedDomains: ["music", "privacy"], enabled: true });
domainRegistry.register({ id: "game-development", label: "Game Development", specialists: [], capabilities: [], relatedDomains: ["music.game-audio"], enabled: true });
