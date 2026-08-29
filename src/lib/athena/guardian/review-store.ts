import {
  DocumentationReviewItem,
  DocumentationAuditRecord,
} from "./types";
import { athenaEventBus } from "../events/event-bus";

const STORAGE_KEY_REVIEWS = "varynth_docs_review_queue_v4";
const STORAGE_KEY_AUDIT = "varynth_docs_audit_log_v4";

export class ReviewStore {
  private reviews: DocumentationReviewItem[] = [];
  private auditLog: DocumentationAuditRecord[] = [];
  private isLoaded: boolean = false;

  constructor() {
    this.init();
    this.setupStorageListener();
  }

  private setupStorageListener(): void {
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY_REVIEWS || event.key === STORAGE_KEY_AUDIT) {
          this.reloadFromStorage();
          athenaEventBus.emit("DOCUMENTATION_UPDATED", {
            source: "storage_event",
          });
        }
      });
    }
  }

  private init(): void {
    // If running in browser, try to load from localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const storedReviews = localStorage.getItem(STORAGE_KEY_REVIEWS);
        const storedAudit = localStorage.getItem(STORAGE_KEY_AUDIT);

        if (storedReviews) {
          const parsed = JSON.parse(storedReviews);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.reviews = parsed;
          } else {
            this.reviews = this.getInitialSeedReviews();
            this.saveToStorage();
          }
        } else {
          this.reviews = this.getInitialSeedReviews();
          this.saveToStorage();
        }

        if (storedAudit) {
          const parsedAudit = JSON.parse(storedAudit);
          if (Array.isArray(parsedAudit) && parsedAudit.length > 0) {
            this.auditLog = parsedAudit;
          } else {
            this.auditLog = this.getInitialSeedAudit();
            this.saveToStorage();
          }
        } else {
          this.auditLog = this.getInitialSeedAudit();
          this.saveToStorage();
        }

        this.isLoaded = true;
        return;
      } catch (err) {
        console.warn("[ReviewStore] Falha ao carregar do localStorage, usando fallback em memória:", err);
      }
    }

    // SSR / Node.js fallback (used during automated tests and Next.js build)
    this.reviews = this.getInitialSeedReviews();
    this.auditLog = this.getInitialSeedAudit();
    this.isLoaded = true;
  }

  private saveToStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(this.reviews));
        localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(this.auditLog));
      } catch (err) {
        console.error("[ReviewStore] Erro ao persistir no localStorage:", err);
      }
    }
  }

  public reloadFromStorage(): void {
    this.init();
  }

  public getAllReviews(): DocumentationReviewItem[] {
    return JSON.parse(JSON.stringify(this.reviews));
  }

  public getPendingReviews(): DocumentationReviewItem[] {
    return JSON.parse(
      JSON.stringify(this.reviews.filter((r) => r.status === "PENDING_REVIEW"))
    );
  }

  public getApprovedReviews(): DocumentationReviewItem[] {
    return JSON.parse(
      JSON.stringify(this.reviews.filter((r) => r.status === "APPROVED"))
    );
  }

  public getRejectedReviews(): DocumentationReviewItem[] {
    return JSON.parse(
      JSON.stringify(this.reviews.filter((r) => r.status === "REJECTED"))
    );
  }

  public getReviewById(id: string): DocumentationReviewItem | undefined {
    const item = this.reviews.find((r) => r.id === id);
    return item ? JSON.parse(JSON.stringify(item)) : undefined;
  }

  public getAuditLog(): DocumentationAuditRecord[] {
    return JSON.parse(JSON.stringify(this.auditLog));
  }

  public markAsRead(id: string, reader: string = "Paulo"): boolean {
    const item = this.reviews.find((r) => r.id === id);
    if (!item) return false;

    if (!item.hasBeenRead) {
      item.hasBeenRead = true;
      item.auditTrail.push({
        action: "VIEWED",
        actor: reader,
        timestamp: new Date().toISOString(),
        details: "Documento integral inspecionado no Document Review Viewer.",
      });
      this.saveToStorage();
    }
    return true;
  }

  public updateDraftContent(id: string, newContent: string, editor: string = "Paulo"): boolean {
    const item = this.reviews.find((r) => r.id === id);
    if (!item) return false;
    if (item.status !== "PENDING_REVIEW") {
      throw new Error(`Não é possível editar uma proposta já finalizada (${item.status}).`);
    }

    item.editedContent = newContent;
    item.auditTrail.push({
      action: "EDITED",
      actor: editor,
      timestamp: new Date().toISOString(),
      details: "Texto do draft refinado pelo revisor humano.",
    });

    this.saveToStorage();
    return true;
  }

  public approveAndPublish(
    id: string,
    reviewer: string = "Paulo",
    finalContent?: string
  ): { success: boolean; error?: string; item?: DocumentationReviewItem } {
    const item = this.reviews.find((r) => r.id === id);
    if (!item) {
      return { success: false, error: `Documento de revisão "${id}" não encontrado.` };
    }

    // Idempotency check: Cannot approve twice
    if (item.status === "APPROVED") {
      return { success: false, error: `Proposta "${id}" já foi aprovada e publicada anteriormente.` };
    }

    if (item.status === "REJECTED") {
      return { success: false, error: `Proposta "${id}" já foi rejeitada e não pode ser aprovada diretamente.` };
    }

    // Apply approval state
    item.hasBeenRead = true;
    item.status = "APPROVED";
    item.reviewedAt = new Date().toISOString();
    item.reviewedBy = reviewer;
    if (finalContent) {
      item.editedContent = finalContent;
    }

    const timestamp = new Date().toISOString();

    item.auditTrail.push({
      action: "APPROVED",
      actor: reviewer,
      timestamp,
      details: `Aprovado e publicado oficialmente em ${item.targetDocument}.`,
    });

    // Write audit record
    const auditRecord: DocumentationAuditRecord = {
      id: `AUD-${Date.now()}`,
      timestamp,
      type: "HUMAN_APPROVED",
      affectedDocuments: [item.targetDocument],
      description: `Revisão aprovada e publicada por ${reviewer}: "${item.title}"`,
      sourceEvidence: item.sourceEvidence,
      actor: reviewer,
    };
    this.auditLog.unshift(auditRecord);

    // Commit to persistent storage
    this.saveToStorage();

    // Broadcast event
    athenaEventBus.emit("DOCUMENTATION_UPDATED", {
      reviewId: id,
      title: item.title,
      status: "APPROVED",
      targetDocument: item.targetDocument,
    });

    return { success: true, item: JSON.parse(JSON.stringify(item)) };
  }

  public rejectReview(
    id: string,
    reviewer: string = "Paulo",
    reason: string
  ): { success: boolean; error?: string; item?: DocumentationReviewItem } {
    const item = this.reviews.find((r) => r.id === id);
    if (!item) {
      return { success: false, error: `Documento de revisão "${id}" não encontrado.` };
    }

    if (item.status !== "PENDING_REVIEW") {
      return { success: false, error: `Proposta "${id}" já possui decisão registrada (${item.status}).` };
    }

    const timestamp = new Date().toISOString();
    item.hasBeenRead = true;
    item.status = "REJECTED";
    item.rejectionReason = reason;
    item.reviewedAt = timestamp;
    item.reviewedBy = reviewer;

    item.auditTrail.push({
      action: "REJECTED",
      actor: reviewer,
      timestamp,
      details: `Proposta rejeitada. Motivo: "${reason}"`,
    });

    const auditRecord: DocumentationAuditRecord = {
      id: `AUD-${Date.now()}`,
      timestamp,
      type: "HUMAN_REJECTED",
      affectedDocuments: [item.targetDocument],
      description: `Proposta rejeitada por ${reviewer}: "${item.title}". Motivo: ${reason}`,
      sourceEvidence: item.sourceEvidence,
      actor: reviewer,
    };
    this.auditLog.unshift(auditRecord);

    this.saveToStorage();

    athenaEventBus.emit("DOCUMENTATION_UPDATED", {
      reviewId: id,
      status: "REJECTED",
      reason,
    });

    return { success: true, item: JSON.parse(JSON.stringify(item)) };
  }

  public resetToDemo(): void {
    this.reviews = this.getInitialSeedReviews();
    this.auditLog = this.getInitialSeedAudit();
    this.saveToStorage();
  }

  private getInitialSeedReviews(): DocumentationReviewItem[] {
    return [
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

  private getInitialSeedAudit(): DocumentationAuditRecord[] {
    return [
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
}

export const reviewStore = new ReviewStore();
