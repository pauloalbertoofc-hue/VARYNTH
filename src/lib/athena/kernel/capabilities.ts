import { AthenaCapability, StandardCapabilityId } from "../domain/capabilities";

export class CapabilityRegistry {
  private capabilities: Map<string, AthenaCapability> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // Local Core Capabilities (Always 100% Available without network/LLM)
    this.register({
      id: "TASK_CREATION",
      name: "Criação Inteligente de Tarefas",
      description: "Cria tarefas com urgência e vinculação automática a projetos no VARYNTH OS.",
      available: true,
      source: "core",
      requiresNetwork: false,
    });

    this.register({
      id: "NOTE_CAPTURE",
      name: "Captura Rápida de Notas",
      description: "Armazena anotações com tags automáticas nas Notas Globais do sistema.",
      available: true,
      source: "core",
      requiresNetwork: false,
    });

    this.register({
      id: "CHRONOS_DEADLINE_SYNC",
      name: "Sincronização de Prazos & Chronos",
      description: "Mapeia entregas e compromissos temporais das workspaces e do calendário.",
      available: true,
      source: "core",
      requiresNetwork: false,
    });

    this.register({
      id: "VAULT_LOCAL_SEARCH",
      name: "Pesquisa no Acervo do Vault",
      description: "Recupera doutrinas, livros, artigos e precedentes arquivados localmente.",
      available: true,
      source: "tool",
      requiresNetwork: false,
    });

    this.register({
      id: "CODEX_ARGUMENT_ANALYSIS",
      name: "Análise Hermenêutica no Codex",
      description: "Examina teses, prós, contras e precedentes na Argument Arena.",
      available: true,
      source: "agent",
      requiresNetwork: false,
    });

    this.register({
      id: "RESEARCH_EVIDENCE_BOARD",
      name: "Validação Epistêmica no Evidence Board",
      description: "Analisa evidências empíricas e classificação de força metodológica.",
      available: true,
      source: "agent",
      requiresNetwork: false,
    });

    this.register({
      id: "SAFE_TRASH_PROTOCOL",
      name: "Protocolo de Exclusão Segura (Lixeira 10d)",
      description: "Proteção contra destruição permanente de dados com retenção e Auto-Purge.",
      available: true,
      source: "core",
      requiresNetwork: false,
    });

    this.register({
      id: "GLOBAL_UNDO_MANAGEMENT",
      name: "Gerenciador de Undo Global",
      description: "Notificações reversíveis imediatas com restauração 1-clique.",
      available: true,
      source: "core",
      requiresNetwork: false,
    });

    this.register({
      id: "AUDIT_TRAIL_OBSERVABILITY",
      name: "Audit Trail & Observabilidade",
      description: "Rastreamento imutável de todas as mutações com carimbo de ator.",
      available: true,
      source: "core",
      requiresNetwork: false,
    });

    this.register({
      id: "COUNCIL_DELIBERATION_ENGINE",
      name: "Conselho Deliberativo da Athena",
      description: "Deliberação estruturada de 7 especialistas (Justitia, Logos, Sophia, Musa, Strategos, Mnemosyne, Critias).",
      available: true,
      source: "agent",
      requiresNetwork: false,
    });

    this.register({
      id: "REFLECTION_VALIDATION_ENGINE",
      name: "Motor de Reflexão e Blindagem (Critias)",
      description: "Validação pré-entrega de coerência e mitigação de vulnerabilidades lógicas.",
      available: true,
      source: "agent",
      requiresNetwork: false,
    });

    // Optional Future Model Capabilities (Marked cleanly as unavailable in the current baseline)
    this.register({
      id: "LOCAL_MODEL_INFERENCE",
      name: "Inferência com Modelos Locais (Ollama / Llama.cpp)",
      description: "Execução de modelos abertos no hardware local do usuário sem custos de API.",
      available: false,
      source: "local-model",
      reason: "Nenhum runtime local (Ollama/Llama.cpp) conectado nesta fase. Kernel operando no modo determinístico baseline.",
      requiresNetwork: false,
    });

    this.register({
      id: "EXTERNAL_MODEL_INFERENCE",
      name: "Inferência em Nuvem Opcional (OpenAI / Gemini / Claude)",
      description: "Plugins externos opcionais e configuráveis pelo usuário.",
      available: false,
      source: "external",
      reason: "Desabilitado por padrão conforme a Política de Soberania Tecnológica Local-First.",
      requiresNetwork: true,
    });

    this.register({
      id: "WEB_LIVE_SEARCH",
      name: "Busca Web em Tempo Real",
      description: "Varredura externa de jurisprudência e notícias em tempo real.",
      available: false,
      source: "external",
      reason: "Indisponível no modo offline soberano.",
      requiresNetwork: true,
    });
  }

  register(capability: AthenaCapability): void {
    this.capabilities.set(capability.id, capability);
  }

  get(id: StandardCapabilityId | string): AthenaCapability | undefined {
    return this.capabilities.get(id);
  }

  isAvailable(id: StandardCapabilityId | string): boolean {
    return this.capabilities.get(id)?.available ?? false;
  }

  listCapabilities(): AthenaCapability[] {
    return Array.from(this.capabilities.values());
  }

  listAvailable(): AthenaCapability[] {
    return this.listCapabilities().filter((c) => c.available);
  }
}

export const capabilityRegistry = new CapabilityRegistry();

