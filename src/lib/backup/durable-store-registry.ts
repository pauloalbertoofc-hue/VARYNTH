/**
 * VARYNTH OS — Durable Store Registry & Backup Coverage Manifest
 *
 * Single Source of Truth classifying every persistent storage key in the OS.
 * Guarantees that every mandatory durable store is either included in the canonical
 * backup manifest or explicitly documented with an exclusion rationale.
 */

export type StoreDataClassification =
  | "AUTHORITATIVE_DURABLE_DATA" // Primary durable user state (Must be in Backup)
  | "DERIVED_CACHE"              // Recomputable from primary stores
  | "SESSION_STATE"               // Ephemeral, viewport, active tabs
  | "TEMPORARY_STATE"            // Transient drafts, UI flags
  | "REBUILDABLE_INDEX";         // Search/Graph indices that auto-generate

export interface DurableStoreDescriptor {
  key: string;
  name: string;
  domain: "SYSTEM" | "PROJECTS" | "STUDIO" | "KNOWLEDGE" | "GOVERNANCE" | "RUNTIME";
  classification: StoreDataClassification;
  backupRequired: boolean;
  exclusionRationale?: string;
  entityNameInBackup?: string;
  description: string;
}

export const DURABLE_STORE_REGISTRY: DurableStoreDescriptor[] = [
  // 1. Projects & Workspaces
  {
    key: "varynth_os_projects",
    name: "Projects",
    domain: "PROJECTS",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "projects",
    description: "Workspaces cadastrados, metadados, prazos e categorias",
  },
  {
    key: "varynth_os_tasks",
    name: "Tasks",
    domain: "PROJECTS",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "tasks",
    description: "Tarefas com prioridades, prazos e status de conclusão",
  },
  {
    key: "varynth_os_notes",
    name: "Notes",
    domain: "PROJECTS",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "notes",
    description: "Anotações e fichamentos associados a projetos",
  },
  {
    key: "varynth_os_files",
    name: "ProjectFiles",
    domain: "PROJECTS",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "files",
    description: "Arquivos anexos registrados dentro dos projetos",
  },
  {
    key: "varynth_os_references",
    name: "ProjectReferences",
    domain: "PROJECTS",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "references",
    description: "Links bibliográficos e referências de projetos",
  },
  {
    key: "varynth_os_timeline",
    name: "ProjectTimeline",
    domain: "PROJECTS",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "timelineEvents",
    description: "Eventos e marcos temporais associados a projetos",
  },

  // 2. Knowledge & Research
  {
    key: "varynth_os_vault",
    name: "VaultItems",
    domain: "KNOWLEDGE",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "vault",
    description: "Segundo cérebro para artigos, doutrina, leis e referências",
  },
  {
    key: "varynth_os_theses",
    name: "CodexTheses",
    domain: "KNOWLEDGE",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "theses",
    description: "Teses dialéticas da Argument Arena com prós, contras e jurisprudência",
  },
  {
    key: "varynth_os_researches",
    name: "Researches",
    domain: "KNOWLEDGE",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "researches",
    description: "Projetos de pesquisa científica e planejamento Qualis",
  },
  {
    key: "varynth_os_evidences",
    name: "Evidences",
    domain: "KNOWLEDGE",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "evidences",
    description: "Proposições e quotes bibliográficos do Evidence Board",
  },

  // 3. System & Operations
  {
    key: "varynth_os_chronos",
    name: "ChronosEvents",
    domain: "SYSTEM",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "chronos",
    description: "Eventos de calendário e rotinas de produtividade",
  },
  {
    key: "varynth_os_historical",
    name: "HistoricalMilestones",
    domain: "SYSTEM",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "historicalMilestones",
    description: "Marcos históricos e conquistas registradas no Chronos",
  },
  {
    key: "varynth_os_people",
    name: "People",
    domain: "SYSTEM",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "people",
    description: "Colaboradores e políticas granulares de permissão por projeto",
  },
  {
    key: "varynth_os_labs",
    name: "Labs",
    domain: "SYSTEM",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "labs",
    description: "Incubadora de experimentos e ideias de novos projetos",
  },
  {
    key: "varynth_os_graveyard",
    name: "Graveyard",
    domain: "SYSTEM",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "graveyardItems",
    description: "Memorial e lições metodológicas de projetos descontinuados",
  },
  {
    key: "varynth_os_opportunities",
    name: "Opportunities",
    domain: "SYSTEM",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "opportunities",
    description: "Radar de editais, bolsas e premiações",
  },
  {
    key: "varynth_os_forge",
    name: "ForgeFiles",
    domain: "SYSTEM",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "forgeFiles",
    description: "Scripts e códigos-fonte desenvolvidos no Forge Studio",
  },
  {
    key: "varynth_os_trash",
    name: "Trash",
    domain: "SYSTEM",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "trash",
    description: "Itens em quarentena de retenção com identidade estável (INV-017)",
  },
  {
    key: "varynth_os_activities",
    name: "Activities",
    domain: "SYSTEM",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "activities",
    description: "Trilha de auditoria cronológica e histórico de ações",
  },

  // 4. Creative Studios & Artifacts
  {
    key: "varynth_artifacts_v4",
    name: "Artifacts",
    domain: "STUDIO",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "artifacts",
    description: "Artefatos dos 6 Studios Criativos com OCC, revisões e histórico",
  },
  {
    key: "varynth_assets_registry_v4",
    name: "Assets",
    domain: "STUDIO",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "assets",
    description: "Registro canônico de assets físicos e gerados",
  },
  {
    key: "varynth_asset_usages_v4",
    name: "AssetUsages",
    domain: "STUDIO",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "assetUsages",
    description: "Grafo de uso e dependência entre artefatos e assets (INV-009)",
  },

  // 5. Governance & Documentation
  {
    key: "varynth_docs_review_queue_v4",
    name: "DocReviews",
    domain: "GOVERNANCE",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "docReviews",
    description: "Fila de revisões e aprovações humanas de documentação",
  },
  {
    key: "varynth_docs_audit_log_v4",
    name: "DocAuditLogs",
    domain: "GOVERNANCE",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "docAuditLogs",
    description: "Log de auditoria das decisões de documentação",
  },
  {
    key: "varynth_notifications_v4",
    name: "Notifications",
    domain: "SYSTEM",
    classification: "AUTHORITATIVE_DURABLE_DATA",
    backupRequired: true,
    entityNameInBackup: "notifications",
    description: "Central de notificações e alertas do OS",
  },

  // 6. Volatile / Runtime Entities (Explicitly Excluded from Persistent Backup)
  {
    key: "varynth_jobs_v4",
    name: "JobsRuntime",
    domain: "RUNTIME",
    classification: "TEMPORARY_STATE",
    backupRequired: false,
    exclusionRationale:
      "Jobs representam processos assíncronos em execução na sessão local; jobs interrompidos são recuperados na inicialização sem necessidade de exportação em arquivo durável.",
    description: "Fila de jobs assíncronos em execução (Render/Compile)",
  },
];

/**
 * Validates that every mandatory store marked as backupRequired is covered in the manifest
 */
export function getRequiredBackupStores(): DurableStoreDescriptor[] {
  return DURABLE_STORE_REGISTRY.filter((s) => s.backupRequired);
}

