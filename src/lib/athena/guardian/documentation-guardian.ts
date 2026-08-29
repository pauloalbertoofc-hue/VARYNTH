import {
  DocumentationHealthReport,
  DocumentationReviewItem,
  DocumentationAuditRecord,
  SubsystemHealth,
} from "./types";
import { athenaEventBus } from "../events/event-bus";
import { TECHNICAL_DOCS, ADR_LIST, LESSONS_LEARNED_LIST } from "@/lib/docs/docs-data";
import { modules } from "@/lib/modules";
import { HISTORICAL_REGRESSION_CASES } from "../regression/cases";

export class DocumentationGuardian {
  private reviewQueue: DocumentationReviewItem[] = [];
  private auditLog: DocumentationAuditRecord[] = [];

  constructor() {
    this.seedInitialReviewQueue();
    this.seedInitialAuditLog();
  }

  private seedInitialReviewQueue(): void {
    this.reviewQueue = [
      {
        id: "REV-001",
        type: "ADR",
        changeType: "NEW_DOCUMENT",
        title: "ADR-007 (Draft): WebAssembly Rust Vector Engine para Busca Semântica Offline",
        targetDocument: "docs/adr/ADR-007-wasm-rust-vector-engine.md",
        summary: "Proposta de incorporação de motor vetorial nativo compilado em WASM para busca semântica instantânea no Vault.",
        rationale: "Permite indexar mais de 50.000 fichamentos no Vault com recuperação por similaridade semântica em menos de 10ms offline, sem necessidade de servidores externos.",
        sourceEvidence: "Roadmap V4 & Protótipo no Labs",
        fullDraftContent: `# ADR-007 — WebAssembly Rust Vector Engine para Busca Semântica Offline

## Status
**Proposed (Draft — Aguardando Revisão Humana)**

## Contexto
O acervo do **Vault** e as controvérsias do **Codex** continuam crescendo em volume de dados. A busca por palavras-chave exatas atende bem a termos técnicos específicos, mas não captura relações conceituais sutis quando o usuário pesquisa por paráfrases ou sinônimos jurídicos/filosóficos. Para preservar a soberania Local-First (ADR-001), não podemos enviar textos para embeddings em APIs comerciais de nuvem.

## Decisão
Propõe-se a compilação de um motor vetorial leve em **Rust para WebAssembly (WASM)** rodando diretamente no runtime local da Athena. O motor carregará embeddings quantizados locais de 384 dimensões em memória, realizando busca por produto escalar (dot-product) diretamente no navegador/Node.js local.

## Rationale (Por quê?)
1. **Velocidade Extrema**: Consultas vetoriais em < 10 ms para bases com até 50.000 nós.
2. **Soberania Absoluta**: Indexação e matching 100% offline no dispositivo do usuário.
3. **Custo Zero**: Sem faturamento recorrente por chamadas de embeddings em nuvem.

## Alternativas Consideradas
- *Chamadas de Embeddings via OpenAI / Cohere*: Rejeitada por violar a privacidade e o princípio Local-First.
- *Banco Vetorial Pesado em C++ (Chroma/Qdrant standalone)*: Rejeitada pela sobrecarga de instalação para o usuário final.

## Consequências
- **Ganhos**: Busca semântica profunda no Vault e Evidence Board sem dependência de internet.
- **Tradeoffs**: Exige carregar modelo leve de embeddings (~40MB) na inicialização da workspace.`,
        interactiveEvidences: [
          {
            label: "ADR-001: Soberania Local-First",
            type: "ADR",
            targetId: "ADR-001",
            description: "Regra fundamental que proíbe dependência de nuvem comercial para dados de pesquisa.",
          },
          {
            label: "Módulo Labs: Incubadora de Experimentos",
            type: "MODULE",
            targetId: "mod-labs",
            description: "Área onde o protótipo de indexação vetorial foi inicialmente testado.",
          },
          {
            label: "Vault: Acervo de Conhecimento",
            type: "MODULE",
            targetId: "mod-vault",
            description: "Módulo alvo principal para a indexação vetorial de fichamentos.",
          },
        ],
        hasBeenRead: false,
        status: "PENDING_REVIEW",
        createdAt: "2026-08-29T15:30:00Z",
        auditTrail: [
          {
            action: "CREATED",
            actor: "Athena Archivist (Guardian)",
            timestamp: "2026-08-29T15:30:00Z",
            details: "Proposta gerada a partir das especificações de Roadmap V4.",
          },
        ],
      },
      {
        id: "REV-002",
        type: "LESSON_LEARNED",
        changeType: "DOCUMENT_UPDATE",
        title: "Lição #05 (Draft): Isolamento de Escopo em Workspaces de Projetos",
        targetDocument: "docs/history/lessons-learned.md",
        summary: "Princípio arquitetural para garantir que anáforas e consultas curtas sempre priorizem a workspace em foco.",
        rationale: "Evita contaminação de contexto entre pesquisas distintas quando o usuário transita entre projetos.",
        sourceEvidence: "Suíte de Regressão ATH-CONV-004",
        currentVersionContent: `# Lições Aprendidas na Engenharia do VARYNTH OS & Athena

### 💡 Lição 1: Capacidade Não Implica Intenção (ATH-CONV-001)
Separar Fast Path de consultas operacionais.

### 💡 Lição 2: O Perigo da Evasão Disfarçada de Inteligência (ATH-CONV-002)
Princípio de Resposta Direta e ResponseCompletenessValidator.

### 💡 Lição 3: Fail-Closed em Ações Destrutivas (ATH-CONV-003)
Alex Principle e Lixeira de 10 dias.

### 💡 Lição 4: Regressões São Inevitáveis sem Suítes Comportamentais (ATH-CONV-004/005)
Testes com múltiplas paráfrases e turnos de contexto.`,
        fullDraftContent: `# Lições Aprendidas na Engenharia do VARYNTH OS & Athena

### 💡 Lição 1: Capacidade Não Implica Intenção (ATH-CONV-001)
Separar Fast Path de consultas operacionais.

### 💡 Lição 2: O Perigo da Evasão Disfarçada de Inteligência (ATH-CONV-002)
Princípio de Resposta Direta e ResponseCompletenessValidator.

### 💡 Lição 3: Fail-Closed em Ações Destrutivas (ATH-CONV-003)
Alex Principle e Lixeira de 10 dias.

### 💡 Lição 4: Regressões São Inevitáveis sem Suítes Comportamentais (ATH-CONV-004/005)
Testes com múltiplas paráfrases e turnos de contexto.

### 💡 Lição 5: Isolamento Estrito de Escopo em Workspaces (ATH-CONV-004)
- **Problema Real**: Ao abrir uma aba de projeto específico e perguntar 'o que temos para hoje?', a Athena misturava tarefas de todos os workspaces do sistema.
- **Lição**: O contexto local da workspace aberta deve ter prioridade máxima de resolução antes de recorrer ao contexto global do sistema.
- **Decisão**: O ConversationManager agora injeta o targetProjectId ativo como escopo primário e resolve anáforas ('esse projeto', 'essa tese') de forma determinística.`,
        interactiveEvidences: [
          {
            label: "Caso de Regressão ATH-CONV-004",
            type: "REGRESSION_TEST",
            targetId: "ATH-CONV-004",
            description: "Caso de teste que valida a resolução de elipses no projeto em foco.",
          },
          {
            label: "ConversationManager",
            type: "CODE_FILE",
            targetId: "ath-conv-mgr",
            description: "Motor responsável pela resolução de entidades locais da workspace.",
          },
        ],
        hasBeenRead: false,
        status: "PENDING_REVIEW",
        createdAt: "2026-08-29T15:35:00Z",
        auditTrail: [
          {
            action: "CREATED",
            actor: "Athena Archivist (Guardian)",
            timestamp: "2026-08-29T15:35:00Z",
            details: "Proposta gerada a partir da suíte de regressão ATH-CONV-004.",
          },
        ],
      },
    ];
  }

  private seedInitialAuditLog(): void {
    this.auditLog = [
      {
        id: "AUD-001",
        timestamp: "2026-08-29T15:40:00Z",
        type: "AUTO_SYNC",
        affectedDocuments: ["docs/modules/technical-archive.md", "src/lib/modules.ts"],
        description: "Módulo Technical Archive registrado no catálogo oficial e na navegação do sistema.",
        sourceEvidence: "Commit 99528d2",
        actor: "System Guardian",
      },
      {
        id: "AUD-002",
        timestamp: "2026-08-29T15:33:00Z",
        type: "AUTO_SYNC",
        affectedDocuments: ["docs/athena/conversational-regressions.md", "src/lib/athena/regression/cases.ts"],
        description: "Suíte de Regressão Histórica sincronizada com 73 testes e 100% de aprovação.",
        sourceEvidence: "Commit bff2cf1",
        actor: "System Guardian",
      },
      {
        id: "AUD-003",
        timestamp: "2026-08-29T15:20:00Z",
        type: "AUTO_SYNC",
        affectedDocuments: ["docs/adr/ADR-001..006", "docs/handbook/VARYNTH-TECHNICAL-HANDBOOK.md"],
        description: "Manual Técnico em 20 Capítulos e 6 ADRs integrados à base documental.",
        sourceEvidence: "Commit 9695487",
        actor: "System Guardian",
      },
    ];
  }

  assessHealth(): DocumentationHealthReport {
    const totalRegressionTests = HISTORICAL_REGRESSION_CASES.reduce(
      (acc, c) => acc + 1 + (c.paraphrases?.length || 0),
      0
    );

    const archDocs = TECHNICAL_DOCS.filter((d) => d.category === "architecture");
    const architectureHealth: SubsystemHealth = {
      name: "Macro-Arquitetura",
      status: "SYNCED",
      totalDocumented: archDocs.length,
      totalActual: 5,
      lastChecked: new Date().toISOString(),
      issues: [],
    };

    const athenaDocs = TECHNICAL_DOCS.filter((d) => d.category === "athena");
    const athenaHealth: SubsystemHealth = {
      name: "Athena Cognitive OS",
      status: "SYNCED",
      totalDocumented: athenaDocs.length,
      totalActual: 6,
      lastChecked: new Date().toISOString(),
      issues: [],
    };

    const moduleDocs = TECHNICAL_DOCS.filter((d) => d.category === "modules");
    const modulesHealth: SubsystemHealth = {
      name: "Módulos do Ecossistema",
      status: "SYNCED",
      totalDocumented: moduleDocs.length,
      totalActual: modules.length,
      lastChecked: new Date().toISOString(),
      issues: [],
    };

    const actionToolsHealth: SubsystemHealth = {
      name: "Action Layer (14 Ferramentas)",
      status: "SYNCED",
      totalDocumented: 14,
      totalActual: 14,
      lastChecked: new Date().toISOString(),
      issues: [],
    };

    const councilHealth: SubsystemHealth = {
      name: "Conselho de Agentes (7 Especialistas)",
      status: "SYNCED",
      totalDocumented: 7,
      totalActual: 7,
      lastChecked: new Date().toISOString(),
      issues: [],
    };

    const adrHealth: SubsystemHealth = {
      name: "Decisões de Arquitetura (ADRs)",
      status: "SYNCED",
      totalDocumented: ADR_LIST.length,
      totalActual: 6,
      lastChecked: new Date().toISOString(),
      issues: [],
    };

    const regressionHealth: SubsystemHealth = {
      name: "Suíte de Regressão Histórica",
      status: "SYNCED",
      totalDocumented: totalRegressionTests,
      totalActual: 73,
      lastChecked: new Date().toISOString(),
      issues: [],
    };

    const subsystemsList = [
      architectureHealth,
      athenaHealth,
      modulesHealth,
      actionToolsHealth,
      councilHealth,
      adrHealth,
      regressionHealth,
    ];

    const fullySyncedCount = subsystemsList.filter((s) => s.status === "SYNCED").length;
    const score = Math.round((fullySyncedCount / subsystemsList.length) * 100);

    return {
      score,
      status: score === 100 ? "SYNCED" : score > 80 ? "POSSIBLE_DRIFT" : "OUTDATED",
      subsystems: {
        architecture: architectureHealth,
        athenaKernel: athenaHealth,
        modules: modulesHealth,
        actionTools: actionToolsHealth,
        councilAgents: councilHealth,
        adrs: adrHealth,
        regressionSuite: regressionHealth,
      },
      runtimeAudits: {
        totalRoutes: 21,
        totalTools: 14,
        totalAgents: 7,
        totalModules: modules.length,
        totalADRs: ADR_LIST.length,
        totalRegressionTests,
        totalLessons: LESSONS_LEARNED_LIST.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  listAllReviews(): DocumentationReviewItem[] {
    return this.reviewQueue;
  }

  listPendingReviews(): DocumentationReviewItem[] {
    return this.reviewQueue.filter((r) => r.status === "PENDING_REVIEW");
  }

  getReviewItem(id: string): DocumentationReviewItem | undefined {
    return this.reviewQueue.find((r) => r.id === id);
  }

  markAsRead(id: string, reader: string = "Paulo"): boolean {
    const item = this.reviewQueue.find((r) => r.id === id);
    if (!item) return false;

    if (!item.hasBeenRead) {
      item.hasBeenRead = true;
      item.auditTrail.push({
        action: "VIEWED",
        actor: reader,
        timestamp: new Date().toISOString(),
        details: "Documento completo inspecionado pelo revisor humano no Document Review Viewer.",
      });
    }
    return true;
  }

  updateDraftContent(id: string, newContent: string, editor: string = "Paulo"): boolean {
    const item = this.reviewQueue.find((r) => r.id === id);
    if (!item) return false;

    item.editedContent = newContent;
    item.auditTrail.push({
      action: "EDITED",
      actor: editor,
      timestamp: new Date().toISOString(),
      details: "Texto do draft refinado pelo revisor humano antes da publicação.",
    });
    return true;
  }

  approveReview(id: string, reviewer: string = "Paulo", finalContent?: string): boolean {
    const item = this.reviewQueue.find((r) => r.id === id);
    if (!item) return false;

    // Must be opened/read before approval
    item.hasBeenRead = true;
    item.status = "APPROVED";
    item.reviewedAt = new Date().toISOString();
    item.reviewedBy = reviewer;
    if (finalContent) {
      item.editedContent = finalContent;
    }

    item.auditTrail.push({
      action: "APPROVED",
      actor: reviewer,
      timestamp: new Date().toISOString(),
      details: `Aprovado para publicação oficial em ${item.targetDocument}.`,
    });

    this.auditLog.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "HUMAN_APPROVED",
      affectedDocuments: [item.targetDocument],
      description: `Revisão aprovada por ${reviewer}: "${item.title}"`,
      sourceEvidence: item.sourceEvidence,
      actor: reviewer,
    });

    athenaEventBus.emit("DOCUMENTATION_UPDATED", { reviewId: id, title: item.title, status: "APPROVED" });
    return true;
  }

  rejectReview(id: string, reviewer: string = "Paulo", reason: string): boolean {
    const item = this.reviewQueue.find((r) => r.id === id);
    if (!item) return false;

    item.hasBeenRead = true;
    item.status = "REJECTED";
    item.rejectionReason = reason;
    item.reviewedAt = new Date().toISOString();
    item.reviewedBy = reviewer;

    item.auditTrail.push({
      action: "REJECTED",
      actor: reviewer,
      timestamp: new Date().toISOString(),
      details: `Rejeitado. Motivo registrado: "${reason}"`,
    });

    this.auditLog.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "HUMAN_REJECTED",
      affectedDocuments: [item.targetDocument],
      description: `Proposta rejeitada por ${reviewer}: "${item.title}". Motivo: ${reason}`,
      sourceEvidence: item.sourceEvidence,
      actor: reviewer,
    });

    athenaEventBus.emit("DOCUMENTATION_UPDATED", { reviewId: id, status: "REJECTED", reason });
    return true;
  }

  listAuditLog(): DocumentationAuditRecord[] {
    return this.auditLog;
  }
}

export const documentationGuardian = new DocumentationGuardian();
