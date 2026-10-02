export interface DomainDefinition {
  id: string;
  label: string;
  parentId?: string;
  primaryOwner?: string;
  coOwners?: string[];
  routingTerms?: string[];
  routingPriority?: number;
  bridges?: DomainBridge[];
  specialists: string[];
  capabilities: string[];
  publicCapabilities?: Array<{ id: string; description: string; input: string[]; output: string[]; allowedConsumers: string[] }>;
  relatedDomains: string[];
  enabled: boolean;
  ownershipHistory?: Array<{ agentId: string; transferredAt: string }>;
}
export interface DomainBridge { id: string; domains: [string, string]; concepts: string[]; description: string; enabled: boolean; }
export interface DomainKnowledgePolicy { domain: string; ownerAgent?: string; publicKnowledge: boolean; allowedVisibility: Array<"DOMAIN" | "CROSS_DOMAIN" | "PUBLIC_TO_AGENTS">; sensitivity: "PUBLIC_ONLY"; }
export interface KnowledgeAwarenessIndex { domains: Array<{ id: string; ownerAgent?: string; coOwners: string[]; specialists: string[]; capabilities: string[]; routingTerms: string[]; relatedDomains: string[] }>; generatedAt: string; contentLoaded: false; }

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
      if (Array.isArray(stored) && stored.length) this.replaceDomains(mergeDomainDefinitions(DEFAULT_DOMAIN_DEFINITIONS, stored as DomainDefinition[]));
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
    const coOwners = normalizeStrings(Array.isArray(domain.coOwners) ? domain.coOwners : []).filter((agent) => agent !== primaryOwner);
    const routingTerms = normalizeStrings(Array.isArray(domain.routingTerms) ? domain.routingTerms : []);
    if (routingTerms.some((term) => term.length > 120)) throw new Error("[DOMAIN_ROUTING_TERM_INVALID] Termo de roteamento excede 120 caracteres.");
    const routingPriority = Number.isFinite(domain.routingPriority) ? Math.max(-1000, Math.min(1000, Math.trunc(domain.routingPriority!))) : 0;
    const specialists = normalizeStrings(domain.specialists);
    if (primaryOwner && !specialists.includes(primaryOwner)) specialists.unshift(primaryOwner);
    const capabilities = normalizeStrings(domain.capabilities);
    const publicCapabilities = (Array.isArray(domain.publicCapabilities) ? domain.publicCapabilities : []).map((capability) => {
      const capabilityId = typeof capability?.id === "string" ? capability.id.trim() : "";
      const description = typeof capability?.description === "string" ? capability.description.trim() : "";
      const input = normalizeStrings(Array.isArray(capability?.input) ? capability.input : []);
      const output = normalizeStrings(Array.isArray(capability?.output) ? capability.output : []);
      const allowedConsumers = normalizeStrings(Array.isArray(capability?.allowedConsumers) ? capability.allowedConsumers : []);
      if (!capabilityId || !description || !capabilities.includes(capabilityId) || !input.length || !output.length || !allowedConsumers.length) {
        throw new Error("[DOMAIN_PUBLIC_CAPABILITY_INVALID] Capability pública precisa estar registrada e declarar descrição, contrato I/O e consumidores permitidos.");
      }
      return { id: capabilityId, description, input, output, allowedConsumers };
    });
    const bridges = (Array.isArray(domain.bridges) ? domain.bridges : []).map((bridge) => {
      const bridgeId = typeof bridge?.id === "string" ? bridge.id.trim() : "";
      const endpoints = Array.isArray(bridge?.domains) ? [...new Set(bridge.domains.map((value) => typeof value === "string" ? value.trim() : ""))] : [];
      const concepts = normalizeStrings(Array.isArray(bridge?.concepts) ? bridge.concepts : []);
      const description = typeof bridge?.description === "string" ? bridge.description.trim() : "";
      if (!bridgeId || !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(bridgeId) || endpoints.length !== 2 || endpoints.some((endpoint) => !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(endpoint)) || !concepts.length || concepts.some((concept) => concept.length > 120) || !description || !endpoints.includes(id)) throw new Error("[DOMAIN_BRIDGE_INVALID] Bridge precisa de id, dois domínios canônicos, conceitos e descrição, e deve pertencer a um dos domínios.");
      return { id: bridgeId, domains: endpoints as [string, string], concepts, description, enabled: bridge.enabled !== false };
    });
    this.domains.set(id, { ...domain, id, primaryOwner, coOwners, routingTerms, routingPriority, bridges, specialists, capabilities, publicCapabilities, relatedDomains: normalizeStrings(domain.relatedDomains), ownershipHistory: (domain.ownershipHistory || []).map((entry) => ({ ...entry })) });
    this.persistBrowserSnapshot();
  }

  replaceDomains(definitions: DomainDefinition[]): void {
    if (!Array.isArray(definitions) || !definitions.length) throw new Error("[DOMAIN_REGISTRY_EMPTY] O registro precisa conter ao menos um domínio.");
    const candidate = new DomainRegistry(false);
    for (const definition of definitions) candidate.register(definition);
    for (const domain of candidate.domains.values()) for (const bridge of domain.bridges || []) {
      if (bridge.domains.some((endpoint) => !candidate.domains.has(endpoint))) throw new Error("[DOMAIN_BRIDGE_DOMAIN_NOT_FOUND] Os dois domínios do bridge devem estar registrados.");
    }
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
    domain.coOwners = (domain.coOwners || []).filter((agent) => agent !== normalizedOwner);
    if (!domain.specialists.includes(normalizedOwner)) domain.specialists.unshift(normalizedOwner);
    this.persistBrowserSnapshot();
  }

  registerCoOwner(domainId: string, coOwner: string): void {
    const domain = this.requireDomain(domainId);
    const normalizedCoOwner = typeof coOwner === "string" ? coOwner.trim() : "";
    if (!normalizedCoOwner) throw new Error("[DOMAIN_CO_OWNER_INVALID] Co-owner obrigatório.");
    if (normalizedCoOwner === domain.primaryOwner) throw new Error("[DOMAIN_CO_OWNER_IS_PRIMARY] O owner primário não pode ser registrado novamente como co-owner.");
    domain.coOwners = [...new Set([...(domain.coOwners || []), normalizedCoOwner])];
    this.persistBrowserSnapshot();
  }

  setRouting(domainId: string, terms: string[], priority?: number): void {
    const domain = this.requireDomain(domainId);
    if (!Array.isArray(terms) || !terms.every((term) => typeof term === "string" && term.trim() && term.trim().length <= 120)) throw new Error("[DOMAIN_ROUTING_TERMS_INVALID] Termos devem ser strings não vazias de até 120 caracteres.");
    if (priority !== undefined && (!Number.isInteger(priority) || priority < -1000 || priority > 1000)) throw new Error("[DOMAIN_ROUTING_PRIORITY_INVALID] Prioridade deve ser um inteiro entre -1000 e 1000.");
    domain.routingTerms = [...new Set(terms.map((term) => term.trim().replace(/\s+/g, " ")))];
    if (priority !== undefined) domain.routingPriority = priority;
    this.persistBrowserSnapshot();
  }

  registerDomainBridge(anchorDomainId: string, bridge: DomainBridge): void {
    const domain = this.requireDomain(anchorDomainId);
    const endpoints = Array.isArray(bridge?.domains) ? [...new Set(bridge.domains.filter((value): value is string => typeof value === "string").map((value) => value.trim()))] : [];
    const concepts = Array.isArray(bridge?.concepts) ? bridge.concepts.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean) : [];
    const next = { ...bridge, id: typeof bridge?.id === "string" ? bridge.id.trim() : "", domains: endpoints as [string, string], concepts };
    if (!next.id || endpoints.length !== 2 || !concepts.length || concepts.some((term) => term.length > 120) || typeof bridge?.description !== "string" || !bridge.description.trim()) throw new Error("[DOMAIN_BRIDGE_INVALID] Bridge requer id, dois domínios, conceitos e descrição válidos.");
    if (next.domains.some((endpoint) => !this.domains.has(endpoint))) throw new Error("[DOMAIN_BRIDGE_DOMAIN_NOT_FOUND] Os dois domínios do bridge devem estar registrados.");
    if (!next.domains.includes(anchorDomainId)) throw new Error("[DOMAIN_BRIDGE_INVALID] O domínio proprietário deve ser um endpoint do bridge.");
    if (this.listDomainBridges().some((candidate) => candidate.id === next.id || candidate.domains.slice().sort().join("|") === next.domains.slice().sort().join("|"))) throw new Error("[DOMAIN_BRIDGE_DUPLICATE] Bridge ou par de domínios já registrado.");
    domain.bridges = [...(domain.bridges || []), next];
    // Re-register through validation so the new bridge is checked against the canonical registry.
    this.register({ ...domain });
  }

  removeDomainBridge(anchorDomainId: string, bridgeId: string): void {
    const domain = this.requireDomain(anchorDomainId);
    if (!(domain.bridges || []).some((bridge) => bridge.id === bridgeId)) throw new Error("[DOMAIN_BRIDGE_NOT_FOUND] Bridge não encontrado neste domínio.");
    domain.bridges = domain.bridges!.filter((bridge) => bridge.id !== bridgeId);
    this.persistBrowserSnapshot();
  }

  listDomainBridges(): DomainBridge[] {
    return this.listDomains().flatMap((domain) => (domain.bridges || []).filter((bridge) => bridge.enabled).map((bridge) => ({ ...bridge, domains: [...bridge.domains] as [string, string], concepts: [...bridge.concepts] })));
  }

  resolveDomainBridges(domainId: string): DomainBridge[] {
    return this.listDomainBridges().filter((bridge) => bridge.domains.includes(domainId));
  }

  removeCoOwner(domainId: string, coOwner: string): void {
    const domain = this.requireDomain(domainId);
    const normalizedCoOwner = typeof coOwner === "string" ? coOwner.trim() : "";
    if (!normalizedCoOwner || !(domain.coOwners || []).includes(normalizedCoOwner)) throw new Error("[DOMAIN_CO_OWNER_NOT_FOUND] Co-owner não registrado neste domínio.");
    domain.coOwners = domain.coOwners!.filter((agent) => agent !== normalizedCoOwner);
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
    return [...new Set([...current.specialists, ...(current.coOwners || []), ...inherited])];
  }
  resolveCoOwners(id: string): string[] { return this.resolveDomain(id)?.coOwners || []; }
  resolveKnowledgePolicy(id: string): DomainKnowledgePolicy | undefined {
    const domain = this.resolveDomain(id);
    if (!domain) return undefined;
    return { domain: domain.id, ownerAgent: this.resolveOwner(domain.id), publicKnowledge: true, allowedVisibility: ["DOMAIN", "CROSS_DOMAIN", "PUBLIC_TO_AGENTS"], sensitivity: "PUBLIC_ONLY" };
  }
  resolveRelatedDomains(id: string): string[] {
    const domain = this.resolveDomain(id);
    if (!domain) return [];
    const descendants = this.listDomains().filter((candidate) => this.isDescendantOf(candidate, domain.id)).map((candidate) => candidate.id);
    const bridged = this.resolveDomainBridges(domain.id).flatMap((bridge) => bridge.domains.filter((endpoint) => endpoint !== domain.id));
    return [...new Set([...domain.relatedDomains, ...descendants, ...bridged])];
  }

  resolveCapabilities(id: string): string[] {
    const domain = this.resolveDomain(id);
    if (!domain) return [];
    return [...new Set([...domain.capabilities, ...(domain.parentId ? this.resolveCapabilities(domain.parentId) : [])])];
  }

  resolvePublicCapabilities(id: string): Array<{ id: string; domain: string; providerAgent: string; description: string; input: string[]; output: string[]; allowedConsumers: string[] }> {
    const domain = this.resolveDomain(id);
    if (!domain) return [];
    return this.listDomains().filter((candidate) => this.isWithinDomain(candidate.id, domain.id)).flatMap((candidate) => {
      const providerAgent = this.resolveOwner(candidate.id);
      if (!providerAgent) return [];
      return (candidate.publicCapabilities || []).map((capability) => ({ ...capability, domain: candidate.id, providerAgent, input: [...capability.input], output: [...capability.output], allowedConsumers: [...capability.allowedConsumers] }));
    });
  }

  isWithinDomain(candidateDomainId: string, scopeDomainId: string): boolean {
    if (!candidateDomainId || !scopeDomainId) return false;
    if (candidateDomainId === scopeDomainId || candidateDomainId.startsWith(`${scopeDomainId}.`)) return true;
    let current = this.resolveDomain(candidateDomainId);
    const visited = new Set<string>();
    while (current?.parentId && !visited.has(current.id)) {
      if (current.parentId === scopeDomainId) return true;
      visited.add(current.id);
      current = this.getDomain(current.parentId);
    }
    return false;
  }

  listHierarchy(rootId?: string): DomainDefinition[] {
    return this.listDomains().filter((domain) => !rootId || domain.id === rootId || this.isDescendantOf(domain, rootId));
  }
  getAwarenessIndex(): KnowledgeAwarenessIndex {
    return { domains: this.listDomains().map((domain) => ({ id: domain.id, ownerAgent: this.resolveOwner(domain.id), coOwners: this.resolveCoOwners(domain.id), specialists: this.resolveSpecialists(domain.id), capabilities: [...domain.capabilities], routingTerms: [...(domain.routingTerms || [])], relatedDomains: this.resolveRelatedDomains(domain.id) })), generatedAt: new Date().toISOString(), contentLoaded: false };
  }

  private requireDomain(id: string): DomainDefinition {
    const domain = this.domains.get(id);
    if (!domain) throw new Error(`[DOMAIN_NOT_FOUND] Domínio inexistente: ${id}`);
    return domain;
  }

  private isDescendantOf(domain: DomainDefinition, ancestorId: string): boolean {
    const visited = new Set<string>();
    let parentId = domain.parentId;
    while (parentId && !visited.has(parentId)) {
      if (parentId === ancestorId) return true;
      visited.add(parentId);
      parentId = this.domains.get(parentId)?.parentId;
    }
    return false;
  }

  private cloneDomain(domain: DomainDefinition): DomainDefinition {
    return { ...domain, coOwners: [...(domain.coOwners || [])], routingTerms: [...(domain.routingTerms || [])], bridges: domain.bridges?.map((bridge) => ({ ...bridge, domains: [...bridge.domains] as [string, string], concepts: [...bridge.concepts] })), specialists: [...domain.specialists], capabilities: [...domain.capabilities], publicCapabilities: domain.publicCapabilities?.map((capability) => ({ ...capability, input: [...capability.input], output: [...capability.output], allowedConsumers: [...capability.allowedConsumers] })), relatedDomains: [...domain.relatedDomains], ownershipHistory: domain.ownershipHistory?.map((entry) => ({ ...entry })) };
  }

  private persistBrowserSnapshot(): void {
    if (!this.browserPersistence || typeof window === "undefined") return;
    try { window.localStorage.setItem(DOMAIN_REGISTRY_LOCAL_KEY, JSON.stringify(this.listAllDomains())); } catch { /* Server persistence remains authoritative. */ }
  }
}

export const DEFAULT_DOMAIN_DEFINITIONS: DomainDefinition[] = [
  { id: "system.orchestration", label: "System Orchestration", primaryOwner: "athena", specialists: ["athena"], capabilities: ["discoverDomain", "delegateTask"], relatedDomains: [], enabled: true },
  { id: "music", label: "Music & Audio", primaryOwner: "euterpe", specialists: ["euterpe"], capabilities: ["music.explainTheory", "music.inspectMetadata", "music.analyzeStructure"], publicCapabilities: [
    { id: "music.inspectMetadata", description: "Interpreta metadados musicais e técnicos fornecidos explicitamente na consulta.", input: ["query", "provided_metadata"], output: ["structured_context", "provenance"], allowedConsumers: ["*"] },
    { id: "music.analyzeStructure", description: "Explica aspectos estruturais de uma composição com base no contexto fornecido.", input: ["query", "provided_context"], output: ["structured_context", "limitations"], allowedConsumers: ["*"] },
  ], routingTerms: ["music", "música", "musica", "audio", "áudio", "trilha", "melody", "melodia", "bpm", "stem"], routingPriority: 40, relatedDomains: ["game-development", "legal.intellectual-property"], enabled: true },
  { id: "legal", label: "Legal", primaryOwner: "justitia", specialists: ["justitia"], capabilities: ["legal.explainConcept", "legal.identifyRelevantDomain"], publicCapabilities: [
    { id: "legal.explainConcept", description: "Fornece contexto conceitual jurídico público; não substitui análise profissional nem consulta de fontes atuais.", input: ["query", "jurisdiction_if_known"], output: ["structured_context", "limitations"], allowedConsumers: ["*"] },
    { id: "legal.identifyRelevantDomain", description: "Ajuda a identificar o ramo jurídico potencialmente relacionado à pergunta.", input: ["query"], output: ["candidate_domains", "limitations"], allowedConsumers: ["*"] },
  ], routingTerms: ["copyright", "licença", "licenca", "contrato", "direito", "lei", "jurídico", "juridico"], routingPriority: 50, relatedDomains: ["music", "privacy"], enabled: true },
  { id: "game-development", label: "Game Development", specialists: [], capabilities: [], routingTerms: ["jogo", "game", "mecânica", "mecanica", "gameplay"], routingPriority: 30, bridges: [{ id: "gameplay-interactive-audio", domains: ["game-development", "music.game-audio"], concepts: ["interactive audio", "adaptive music", "game audio"], description: "Conecta o desenho de gameplay à implementação e à experiência de áudio interativo.", enabled: true }], relatedDomains: ["music.game-audio"], enabled: true },
  { id: "music.listening", label: "Listening & Curation", parentId: "music", specialists: [], capabilities: ["music.curate"], relatedDomains: [], enabled: true },
  { id: "music.theory", label: "Music Theory", parentId: "music", specialists: [], capabilities: ["music.explainTheory"], publicCapabilities: [{ id: "music.explainTheory", description: "Explica conceitos gerais de teoria musical sem presumir dados ausentes.", input: ["query", "provided_context"], output: ["structured_context", "limitations"], allowedConsumers: ["*"] }], relatedDomains: [], enabled: true },
  { id: "music.theory.harmony", label: "Harmony", parentId: "music.theory", specialists: [], capabilities: ["music.explainHarmony"], publicCapabilities: [{ id: "music.explainHarmony", description: "Explica conceitos de harmonia musical com contexto compacto e rastreável.", input: ["query", "provided_context"], output: ["structured_context", "limitations"], allowedConsumers: ["*"] }], routingTerms: ["harmonia", "harmony", "acorde", "acordes", "progressão harmônica", "progressao harmonica"], routingPriority: 80, relatedDomains: [], enabled: true },
  { id: "music.theory.melody", label: "Melody", parentId: "music.theory", specialists: [], capabilities: ["music.explainMelody"], publicCapabilities: [{ id: "music.explainMelody", description: "Explica conceitos de melodia musical com contexto compacto e rastreável.", input: ["query", "provided_context"], output: ["structured_context", "limitations"], allowedConsumers: ["*"] }], routingTerms: ["melodia", "melody"], routingPriority: 70, relatedDomains: [], enabled: true },
  { id: "music.theory.rhythm", label: "Rhythm", parentId: "music.theory", specialists: [], capabilities: ["music.explainRhythm"], publicCapabilities: [{ id: "music.explainRhythm", description: "Explica conceitos de ritmo musical com contexto compacto e rastreável.", input: ["query", "provided_context"], output: ["structured_context", "limitations"], allowedConsumers: ["*"] }], relatedDomains: [], enabled: true },
  { id: "music.theory.scales", label: "Scales", parentId: "music.theory", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "music.theory.notation", label: "Notation", parentId: "music.theory", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "music.composition", label: "Composition", parentId: "music", specialists: [], capabilities: ["music.analyzeStructure"], routingTerms: ["composição", "composicao", "arranjo", "orquestração", "orquestracao", "songwriting"], routingPriority: 70, relatedDomains: [], enabled: true },
  { id: "music.composition.arrangement", label: "Arrangement", parentId: "music.composition", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "music.composition.orchestration", label: "Orchestration", parentId: "music.composition", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "music.composition.songwriting", label: "Songwriting", parentId: "music.composition", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "music.production", label: "Production", parentId: "music", specialists: [], capabilities: ["audio.getTechnicalInfo"], publicCapabilities: [{ id: "audio.getTechnicalInfo", description: "Interpreta especificações de áudio fornecidas na consulta; não lê assets locais por conta própria.", input: ["query", "provided_asset_metadata"], output: ["technical_context", "provenance", "limitations"], allowedConsumers: ["*"] }], relatedDomains: [], enabled: true },
  { id: "music.production.recording", label: "Recording", parentId: "music.production", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "music.production.mixing", label: "Mixing", parentId: "music.production", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "music.production.mastering", label: "Mastering", parentId: "music.production", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "music.voice", label: "Voice", parentId: "music", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "music.sound-design", label: "Sound Design", parentId: "music", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "music.game-audio", label: "Game Audio", parentId: "music", specialists: [], capabilities: ["music.gameAudio", "audio.describeAsset"], routingTerms: ["game audio", "adaptive music", "adaptativa", "trilha sonora", "trilha adaptativa", "audio jogo", "áudio jogo", "trilha jogo", "trilha game", "música jogo", "musica jogo"], routingPriority: 90, publicCapabilities: [
    { id: "music.gameAudio", description: "Explica conceitos de áudio interativo a partir do contexto explicitamente compartilhado.", input: ["query", "provided_game_context"], output: ["structured_context", "limitations"], allowedConsumers: ["*"] },
    { id: "audio.describeAsset", description: "Descreve um asset de áudio usando somente metadados ou conteúdo fornecidos pelo solicitante.", input: ["query", "provided_asset_metadata"], output: ["description", "provenance", "limitations"], allowedConsumers: ["*"] },
  ], relatedDomains: ["game-development"], enabled: true },
  { id: "music.technology", label: "Music Technology", parentId: "music", specialists: [], capabilities: ["music.inspectMetadata", "audio.getTechnicalInfo"], relatedDomains: [], enabled: true },
  { id: "music.asset-provenance", label: "Music Asset Provenance", parentId: "music", specialists: [], capabilities: ["music.inspectMetadata"], relatedDomains: ["legal.intellectual-property"], enabled: true },
  { id: "legal.constitutional", label: "Constitutional", parentId: "legal", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "legal.criminal", label: "Criminal", parentId: "legal", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "legal.civil", label: "Civil", parentId: "legal", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "legal.labor", label: "Labor", parentId: "legal", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "legal.family", label: "Family", parentId: "legal", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "legal.procedural", label: "Procedural", parentId: "legal", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "legal.intellectual-property", label: "Intellectual Property", parentId: "legal", specialists: [], capabilities: ["legal.explainConcept", "legal.getPublicReferenceContext"], routingTerms: ["copyright", "direito autoral", "royalty free", "royalty-free", "licença", "licenca", "propriedade intelectual", "patente", "marca registrada", "uso comercial", "licença de música", "licenca de musica", "licença de trilha", "licenca de trilha", "licença de áudio", "licenca de audio"], routingPriority: 100, bridges: [{ id: "ip-music-provenance", domains: ["legal.intellectual-property", "music.asset-provenance"], concepts: ["copyright", "music licensing", "chain of title"], description: "Distingue a análise de direitos e licenciamento da proveniência documental do asset musical.", enabled: true }], relatedDomains: ["music.asset-provenance", "game-development"], enabled: true },
  { id: "legal.privacy", label: "Privacy", parentId: "legal", specialists: [], capabilities: [], relatedDomains: [], enabled: true },
  { id: "legal.technology", label: "Technology Law", parentId: "legal", specialists: [], capabilities: [], relatedDomains: ["music.technology"], enabled: true },
];

export function mergeDomainDefinitions(defaults: DomainDefinition[], persisted: DomainDefinition[]): DomainDefinition[] {
  const defaultsById = new Map(defaults.map((domain) => [domain.id, domain]));
  const domains = new Map(defaults.map((domain) => [domain.id, domain]));
  for (const domain of persisted) {
    const baseline = defaultsById.get(domain.id);
    const mergedCapabilities = Array.isArray(domain.capabilities) ? domain.capabilities : baseline?.capabilities || [];
    const publicCapabilities = Object.prototype.hasOwnProperty.call(domain, "publicCapabilities")
      ? domain.publicCapabilities
      : baseline?.publicCapabilities?.filter((capability) => mergedCapabilities.includes(capability.id));
    domains.set(domain.id, {
      ...baseline,
      ...domain,
      coOwners: Object.prototype.hasOwnProperty.call(domain, "coOwners") ? domain.coOwners : baseline?.coOwners,
      routingTerms: Object.prototype.hasOwnProperty.call(domain, "routingTerms") ? domain.routingTerms : baseline?.routingTerms,
      routingPriority: Object.prototype.hasOwnProperty.call(domain, "routingPriority") ? domain.routingPriority : baseline?.routingPriority,
      bridges: Object.prototype.hasOwnProperty.call(domain, "bridges") ? domain.bridges : baseline?.bridges,
      // Older snapshots predate explicit publication contracts. Preserve the
      // reviewed defaults only when the field is absent; an explicit [] remains
      // a deliberate revocation of all public capability exposure.
      publicCapabilities: publicCapabilities?.filter((capability) => mergedCapabilities.includes(capability.id)),
    });
  }
  return [...domains.values()];
}

export const domainRegistry = new DomainRegistry();
for (const domain of DEFAULT_DOMAIN_DEFINITIONS) if (!domainRegistry.getDomain(domain.id)) domainRegistry.register(domain);
