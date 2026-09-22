export interface DomainDefinition {
  id: string;
  label: string;
  parentId?: string;
  primaryOwner?: string;
  specialists: string[];
  capabilities: string[];
  relatedDomains: string[];
  enabled: boolean;
  ownershipHistory?: Array<{ agentId: string; transferredAt: string }>;
}
export interface DomainKnowledgePolicy { domain: string; ownerAgent?: string; publicKnowledge: boolean; allowedVisibility: Array<"DOMAIN" | "CROSS_DOMAIN" | "PUBLIC_TO_AGENTS">; sensitivity: "PUBLIC_ONLY"; }
export interface KnowledgeAwarenessIndex { domains: Array<{ id: string; ownerAgent?: string; specialists: string[]; capabilities: string[]; relatedDomains: string[] }>; generatedAt: string; contentLoaded: false; }

const DOMAIN_REGISTRY_LOCAL_KEY = "varynth:knowledge:domains:v1";

export class DomainRegistry {
  private readonly domains = new Map<string, DomainDefinition>();
  private browserSnapshotHydrated = false;

  constructor(private readonly browserPersistence = true) {}

  hydrateBrowserSnapshot(): void {
    if (!this.browserPersistence || typeof window === "undefined" || this.browserSnapshotHydrated) return;
    this.browserSnapshotHydrated = true;
    try {
      const stored = JSON.parse(window.localStorage.getItem(DOMAIN_REGISTRY_LOCAL_KEY) || "null") as unknown;
      if (Array.isArray(stored) && stored.length) this.replaceDomains(stored as DomainDefinition[]);
    } catch { /* Defaults remain available if the local cache is unreadable. */ }
  }

  register(domain: DomainDefinition): void {
    const id = domain.id?.trim();
    if (!id || id !== domain.id || !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(id) || !domain.label?.trim()) throw new Error("[DOMAIN_INVALID] Domínio precisa de id canônico e label.");
    const candidate = new Map(this.domains);
    candidate.set(id, domain);
    const visited = new Set([id]);
    let parentId = domain.parentId;
    while (parentId) {
      if (visited.has(parentId)) throw new Error("[DOMAIN_HIERARCHY_CYCLE] A hierarquia não pode conter ciclos.");
      visited.add(parentId);
      parentId = candidate.get(parentId)?.parentId;
    }
    const primaryOwner = typeof domain.primaryOwner === "string" ? domain.primaryOwner.trim() || undefined : undefined;
    const normalizeStrings = (values: string[]) => [...new Set(values.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean))];
    const specialists = normalizeStrings(domain.specialists);
    if (primaryOwner && !specialists.includes(primaryOwner)) specialists.unshift(primaryOwner);
    this.domains.set(id, { ...domain, id, primaryOwner, specialists, capabilities: normalizeStrings(domain.capabilities), relatedDomains: normalizeStrings(domain.relatedDomains), ownershipHistory: (domain.ownershipHistory || []).map((entry) => ({ ...entry })) });
    this.persistBrowserSnapshot();
  }

  replaceDomains(definitions: DomainDefinition[]): void {
    if (!Array.isArray(definitions) || !definitions.length) throw new Error("[DOMAIN_REGISTRY_EMPTY] O registro precisa conter ao menos um domínio.");
    const candidate = new DomainRegistry(false);
    for (const definition of definitions) candidate.register(definition);
    this.domains.clear();
    for (const domain of candidate.domains.values()) this.domains.set(domain.id, this.cloneDomain(domain));
    this.browserSnapshotHydrated = true;
    this.persistBrowserSnapshot();
  }

  registerOwner(domainId: string, owner: string): void {
    const domain = this.requireDomain(domainId);
    const normalizedOwner = typeof owner === "string" ? owner.trim() : "";
    if (!normalizedOwner) throw new Error("[DOMAIN_OWNER_INVALID] Owner obrigatório.");
    if (domain.primaryOwner && domain.primaryOwner !== normalizedOwner) {
      domain.ownershipHistory = [...(domain.ownershipHistory || []), { agentId: domain.primaryOwner, transferredAt: new Date().toISOString() }];
      domain.specialists = domain.specialists.filter((agent) => agent !== domain.primaryOwner);
    }
    domain.primaryOwner = normalizedOwner;
    if (!domain.specialists.includes(normalizedOwner)) domain.specialists.unshift(normalizedOwner);
    this.persistBrowserSnapshot();
  }

  transferOwnership(domainId: string, nextOwner: string): void {
    const normalizedOwner = typeof nextOwner === "string" ? nextOwner.trim() : "";
    if (!normalizedOwner) throw new Error("[DOMAIN_OWNER_INVALID] Owner obrigatório.");
    this.registerOwner(domainId, normalizedOwner);
  }

  registerSpecialist(domainId: string, specialist: string): void {
    const domain = this.requireDomain(domainId);
    const normalizedSpecialist = typeof specialist === "string" ? specialist.trim() : "";
    if (!normalizedSpecialist) throw new Error("[DOMAIN_SPECIALIST_INVALID] Especialista obrigatório.");
    if (!domain.specialists.includes(normalizedSpecialist)) domain.specialists.push(normalizedSpecialist);
    this.persistBrowserSnapshot();
  }

  registerCapability(domainId: string, capability: string): void {
    const domain = this.requireDomain(domainId);
    const normalizedCapability = typeof capability === "string" ? capability.trim() : "";
    if (!normalizedCapability) throw new Error("[DOMAIN_CAPABILITY_INVALID] Capability obrigatória.");
    if (!domain.capabilities.includes(normalizedCapability)) domain.capabilities.push(normalizedCapability);
    this.persistBrowserSnapshot();
  }

  getDomain(id: string): DomainDefinition | undefined { const domain = this.domains.get(id); return domain ? this.cloneDomain(domain) : undefined; }
  listDomains(): DomainDefinition[] { return [...this.domains.values()].filter((domain) => domain.enabled).map((domain) => this.cloneDomain(domain)); }
  listAllDomains(): DomainDefinition[] { return [...this.domains.values()].map((domain) => this.cloneDomain(domain)); }
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
  resolveKnowledgePolicy(id: string): DomainKnowledgePolicy | undefined {
    const domain = this.resolveDomain(id);
    if (!domain) return undefined;
    return { domain: domain.id, ownerAgent: this.resolveOwner(domain.id), publicKnowledge: true, allowedVisibility: ["DOMAIN", "CROSS_DOMAIN", "PUBLIC_TO_AGENTS"], sensitivity: "PUBLIC_ONLY" };
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
  getAwarenessIndex(): KnowledgeAwarenessIndex {
    return { domains: this.listDomains().map((domain) => ({ id: domain.id, ownerAgent: this.resolveOwner(domain.id), specialists: this.resolveSpecialists(domain.id), capabilities: [...domain.capabilities], relatedDomains: this.resolveRelatedDomains(domain.id) })), generatedAt: new Date().toISOString(), contentLoaded: false };
  }

  private requireDomain(id: string): DomainDefinition {
    const domain = this.domains.get(id);
    if (!domain) throw new Error(`[DOMAIN_NOT_FOUND] Domínio inexistente: ${id}`);
    return domain;
  }

  private cloneDomain(domain: DomainDefinition): DomainDefinition {
    return { ...domain, specialists: [...domain.specialists], capabilities: [...domain.capabilities], relatedDomains: [...domain.relatedDomains], ownershipHistory: domain.ownershipHistory?.map((entry) => ({ ...entry })) };
  }

  private persistBrowserSnapshot(): void {
    if (!this.browserPersistence || typeof window === "undefined") return;
    try { window.localStorage.setItem(DOMAIN_REGISTRY_LOCAL_KEY, JSON.stringify(this.listAllDomains())); } catch { /* Server persistence remains authoritative. */ }
  }
}

export const domainRegistry = new DomainRegistry();
for (const domain of [
  { id: "system.orchestration", label: "System Orchestration", primaryOwner: "athena", specialists: ["athena"], capabilities: ["discoverDomain", "delegateTask"], relatedDomains: [], enabled: true },
  { id: "music", label: "Music & Audio", primaryOwner: "euterpe", specialists: ["euterpe"], capabilities: ["music.explainTheory", "music.inspectMetadata", "music.analyzeStructure"], relatedDomains: ["game-development", "legal.intellectual-property"], enabled: true },
  { id: "legal", label: "Legal", primaryOwner: "justitia", specialists: ["justitia"], capabilities: ["legal.explainConcept", "legal.identifyRelevantDomain"], relatedDomains: ["music", "privacy"], enabled: true },
  { id: "game-development", label: "Game Development", specialists: [], capabilities: [], relatedDomains: ["music.game-audio"], enabled: true },
]) if (!domainRegistry.getDomain(domain.id)) domainRegistry.register(domain);
