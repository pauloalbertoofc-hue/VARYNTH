"use client";

import { useState, useMemo, useEffect } from "react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  TECHNICAL_DOCS,
  ADR_LIST,
  LESSONS_LEARNED_LIST,
  TechnicalDocItem,
  ComponentStatus,
  ADRItem,
  LessonLearnedItem,
} from "@/lib/docs/docs-data";
import { documentationGuardian } from "@/lib/athena/guardian/documentation-guardian";
import { reviewStore } from "@/lib/athena/guardian/review-store";
import {
  DocumentationHealthReport,
  DocumentationReviewItem,
  DocumentationAuditRecord,
  InteractiveEvidence,
} from "@/lib/athena/guardian/types";
import {
  Search,
  BookOpen,
  Layers,
  Cpu,
  FileCode2,
  ShieldCheck,
  History,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter,
  ArrowRight,
  BookMarked,
  Library,
  Terminal,
  Clock,
  Compass,
  ArrowUpRight,
  ShieldAlert,
  Check,
  X,
  FileCheck,
  Activity,
  RefreshCw,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import { ExportModal } from "@/components/docs/ExportModal";
import { DocumentReviewViewer } from "@/components/docs/DocumentReviewViewer";
import Link from "next/link";

type TabMode = "hub" | "guardian" | "map" | "handbook" | "adrs" | "lessons" | "component";

export default function TechnicalArchivePage() {
  const [activeTab, setActiveTab] = useState<TabMode>("hub");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string>("arch-overview");
  const [selectedAdrId, setSelectedAdrId] = useState<string>("ADR-001");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedHandbookChapter, setSelectedHandbookChapter] = useState(0);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Review Viewer & Center State
  const [selectedReviewItem, setSelectedReviewItem] = useState<DocumentationReviewItem | null>(null);
  const [isReviewViewerOpen, setIsReviewViewerOpen] = useState(false);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>("ALL");
  const [selectedInlineReviewId, setSelectedInlineReviewId] = useState<string>("REV-001");
  const [inlineTab, setInlineTab] = useState<"doc" | "diff" | "evidences" | "edit" | "preview" | "audit">("doc");
  const [inlineEdits, setInlineEdits] = useState<Record<string, string>>({});
  const [inlineRejectingId, setInlineRejectingId] = useState<string | null>(null);
  const [inlineRejectReason, setInlineRejectReason] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Guardian State (initialized from persistent reviewStore)
  const [healthReport, setHealthReport] = useState<DocumentationHealthReport>(() =>
    documentationGuardian.assessHealth()
  );
  const [reviewQueue, setReviewQueue] = useState<DocumentationReviewItem[]>(() =>
    documentationGuardian.listAllReviews()
  );
  const [auditLog, setAuditLog] = useState<DocumentationAuditRecord[]>(() =>
    documentationGuardian.listAuditLog()
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Re-hydrate from localStorage on client-side mount
  useEffect(() => {
  // Synchronize state from storage
  const syncStateFromStore = useCallback(() => {
    reviewStore.reloadFromStorage();
    const all = reviewStore.getAllReviews();
    setReviewQueue(all);
    setAuditLog(reviewStore.getAuditLog());
    setHealthReport(documentationGuardian.assessHealth());
  }, []);

  // Re-hydrate from localStorage on client-side mount
  useEffect(() => {
    syncStateFromStore();
  }, [syncStateFromStore]);

  // Derived counts from source of truth
  const pendingReviewsCount = useMemo(
    () => reviewQueue.filter((r) => r.status === "PENDING_REVIEW").length,
    [reviewQueue]
  );
  const approvedReviewsCount = useMemo(
    () => reviewQueue.filter((r) => r.status === "APPROVED").length,
    [reviewQueue]
  );
  const rejectedReviewsCount = useMemo(
    () => reviewQueue.filter((r) => r.status === "REJECTED").length,
    [reviewQueue]
  );

  // Filtered Review Queue for Master-Detail list
  const filteredReviewQueue = useMemo(() => {
    return reviewQueue.filter(
      (r) => reviewStatusFilter === "ALL" || r.status === reviewStatusFilter
    );
  }, [reviewQueue, reviewStatusFilter]);

  // Active Item in the Workspace
  const activeReviewItem = useMemo(() => {
    return (
      filteredReviewQueue.find((r) => r.id === selectedInlineReviewId) ||
      filteredReviewQueue[0] ||
      reviewQueue[0]
    );
  }, [filteredReviewQueue, selectedInlineReviewId, reviewQueue]);

  // Dynamically merged ADRs (including newly approved ADRs)
  const allADRs = useMemo(() => {
    const approvedADRs = reviewQueue.filter(
      (r) => r.status === "APPROVED" && r.type === "ADR"
    );
    const dynamicList: ADRItem[] = [...ADR_LIST];

    approvedADRs.forEach((approved) => {
      if (!dynamicList.some((a) => a.title.includes("ADR-007") || a.id === "ADR-007")) {
        dynamicList.push({
          id: "ADR-007",
          number: "ADR-007",
          title: "WebAssembly Rust Vector Engine para Busca Semântica Offline",
          status: "Accepted",
          date: approved.reviewedAt ? approved.reviewedAt.slice(0, 10) : "2026-08-29",
          context: approved.rationale,
          decision: "Compilação de motor vetorial nativo em Rust para WebAssembly (WASM) rodando 100% offline no navegador/Node.js.",
          rationale: approved.rationale,
          alternatives: [
            "Embeddings via API de nuvem (Rejeitada por soberania)",
            "Chroma/Qdrant standalone em C++ (Rejeitada por sobrecarga de setup)",
          ],
          consequences: {
            gains: ["Busca semântica em <10ms", "100% offline e sem custos de nuvem"],
            tradeoffs: ["Carregamento inicial de modelo leve de embeddings"],
          },
        });
      }
    });

    return dynamicList;
  }, [reviewQueue]);

  // Dynamically merged Lessons Learned (including newly approved Lessons)
  const allLessons = useMemo(() => {
    const approvedLessons = reviewQueue.filter(
      (r) => r.status === "APPROVED" && r.type === "LESSON_LEARNED"
    );
    const dynamicList: LessonLearnedItem[] = [...LESSONS_LEARNED_LIST];

    approvedLessons.forEach((approved) => {
      if (!dynamicList.some((l) => l.number === "05" || l.id === "les-05")) {
        dynamicList.push({
          id: "les-05",
          number: "05",
          title: "Isolamento Estrito de Escopo em Workspaces de Projetos",
          problem: "Ao consultar projetos em abas específicas, anáforas genéricas misturavam tarefas globais.",
          observation: "O contexto local deve ter prioridade máxima sobre o contexto global.",
          decision: "Injetar targetProjectId ativo como escopo primário e resolver anáforas com precedência local estrita.",
          result: "Zero contaminação entre pesquisas de projetos distintos e resolução determinística no ConversationManager.",
          linkedRegressionTest: "ATH-CONV-004",
        });
      }
    });

    return dynamicList;
  }, [reviewQueue]);

  // Refresh Guardian Health & Sync
  const handleRefreshGuardian = () => {
    reviewStore.reloadFromStorage();
    const report = documentationGuardian.assessHealth();
    setHealthReport(report);
    setReviewQueue(documentationGuardian.listAllReviews());
    setAuditLog(documentationGuardian.listAuditLog());
    syncStateFromStore();
    setActionMessage("Auditoria e fila documental sincronizadas com sucesso.");
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleOpenReview = (item: DocumentationReviewItem) => {
    setSelectedReviewItem(item);
    setIsReviewViewerOpen(true);
  };

  const handleApproveReview = (id: string, editedContent?: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = documentationGuardian.approveReview(id, "Paulo", editedContent);
      if (!result.success) {
        setActionMessage(`Erro: ${result.error}`);
        return;
      }
      const all = documentationGuardian.listAllReviews();
      setReviewQueue(all);
      setAuditLog(documentationGuardian.listAuditLog());
      setHealthReport(documentationGuardian.assessHealth());
      syncStateFromStore();
      setActionMessage(`Proposta ${id} aprovada, publicada e persistida com sucesso.`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  const handleRejectReview = (id: string, reason: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = documentationGuardian.rejectReview(id, "Paulo", reason);
      if (!result.success) {
        setActionMessage(`Erro: ${result.error}`);
        return;
      }
      const all = documentationGuardian.listAllReviews();
      setReviewQueue(all);
      setAuditLog(documentationGuardian.listAuditLog());
      setHealthReport(documentationGuardian.assessHealth());
      syncStateFromStore();
      setActionMessage(`Proposta ${id} rejeitada e registrada na memória de auditoria.`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  const handleNavigateToEvidence = (evidence: InteractiveEvidence) => {
    setIsReviewViewerOpen(false);
    if (evidence.type === "ADR") {
      setSelectedAdrId(evidence.targetId);
      setActiveTab("adrs");
    } else if (evidence.type === "MODULE" || evidence.type === "CODE_FILE") {
      setSelectedDocId(evidence.targetId);
      setActiveTab("component");
    } else if (evidence.type === "REGRESSION_TEST") {
      setSelectedDocId("ath-safety");
      setActiveTab("component");
    }
  };

  // Filtered documents based on search and category
  const filteredDocs = useMemo(() => {
    return TECHNICAL_DOCS.filter((doc) => {
      const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        doc.title.toLowerCase().includes(query) ||
        doc.summary.toLowerCase().includes(query) ||
        doc.tags.some((t) => t.toLowerCase().includes(query)) ||
        doc.content.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, categoryFilter]);

  const selectedDoc = useMemo(() => {
    return TECHNICAL_DOCS.find((d) => d.id === selectedDocId) || TECHNICAL_DOCS[0];
  }, [selectedDocId]);

  const selectedAdr = useMemo(() => {
    return ADR_LIST.find((a) => a.id === selectedAdrId) || ADR_LIST[0];
  }, [selectedAdrId]);
    return allADRs.find((a) => a.id === selectedAdrId) || allADRs[0];
  }, [selectedAdrId, allADRs]);

  const getStatusBadge = (status: ComponentStatus) => {
    switch (status) {
      case "IMPLEMENTED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            IMPLEMENTED
          </span>
        );
      case "PARTIALLY_IMPLEMENTED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            PARTIALLY_IMPLEMENTED
          </span>
        );
      case "PLANNED":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            PLANNED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="Technical Archive"
      subtitle="Manual Arquitetural Oficial, ADRs e Memória de Engenharia do VARYNTH OS"
    >
      <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in text-slate-200">
        {/* ACTION FEEDBACK TOAST */}
        {actionMessage && (
          <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-2xl animate-fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {actionMessage}
            </span>
          </div>
        )}

        {/* TOP STATUS BANNER */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-xl shadow-inner">
                  🏛️
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
                    VARYNTH Technical Archive
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono">
                      v4.0.0
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400">
                    Fonte da verdade técnica oficial mapeada diretamente de <code className="text-cyan-300">/docs</code>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <button
                onClick={() => setIsExportOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Manual / PDF</span>
              </button>

              <button
                onClick={handleRefreshGuardian}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 flex items-center gap-2 transition-all cursor-pointer"
                title="Executar auditoria em tempo real do Documentation Guardian"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-[11px]">Audit Guardian</span>
              </button>

              <div className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  Documentation Health:{" "}
                  <strong className="text-emerald-300">{healthReport.score}% (SYNCED)</strong>
                </span>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>
                  Quality Gates: <strong className="text-cyan-300">73/73 Aprovados (100%)</strong>
                </span>
              </div>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="mt-6 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar documentação técnica, ADRs, lições aprendidas (ex: 'Alex Principle', 'MemoryGate', 'Lixeira', 'ADR-001')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans"
            />
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("hub")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "hub"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <Layers className="w-4 h-4" />
            Navegação do Ecossistema
          </button>

          <button
            onClick={() => setActiveTab("guardian")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "guardian"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Documentation Guardian & Review Center
          </button>

          <button
            onClick={() => setActiveTab("map")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "map"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <Compass className="w-4 h-4" />
            System Map Interativo
          </button>

          <button
            onClick={() => setActiveTab("handbook")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "handbook"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <BookMarked className="w-4 h-4" />
            Technical Handbook (20 Capítulos)
          </button>

          <button
            onClick={() => setActiveTab("adrs")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "adrs"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            Decisões de Arquitetura (ADRs)
            Decisões de Arquitetura (ADRs) ({allADRs.length})
          </button>

          <button
            onClick={() => setActiveTab("lessons")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "lessons"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <History className="w-4 h-4" />
            Lições Aprendidas
            Lições Aprendidas ({allLessons.length})
          </button>

          <button
            onClick={() => setActiveTab("component")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "component"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <Cpu className="w-4 h-4" />
            Ficha Técnica por Componente
          </button>
        </div>

        {/* TAB: DOCUMENTATION GUARDIAN TELEMETRY & REVIEW CENTER */}
        {activeTab === "guardian" && (
          <div className="space-y-8">
            {/* Top Guardian Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold">Health Score</span>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">{healthReport.score}%</div>
                <p className="text-xs text-emerald-400 font-medium">Status: {healthReport.status} (Zero Drift)</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold">Contratos Runtime</span>
                  <Cpu className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {healthReport.runtimeAudits.totalRoutes + healthReport.runtimeAudits.totalTools + healthReport.runtimeAudits.totalAgents}
                </div>
                <p className="text-xs text-slate-400">
                  {healthReport.runtimeAudits.totalRoutes} Rotas • {healthReport.runtimeAudits.totalTools} Tools • {healthReport.runtimeAudits.totalAgents} Agentes
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold">Fila de Revisão Humana</span>
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">{pendingReviewsCount}</div>
                <p className="text-xs text-amber-300 font-medium">
                  {pendingReviewsCount === 0
                    ? "Toda a documentação revisada e sincronizada"
                    : `${pendingReviewsCount} proposta(s) aguardando confirmação`}
                </p>
              </div>
            </div>

            {/* Subsystems Health Grid */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Auditoria de Sincronia por Subsistema
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(healthReport.subsystems).map(([key, sub]) => (
                  <div
                    key={key}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{sub.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {sub.totalDocumented}/{sub.totalActual} contratos verificados
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {sub.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* REVIEW QUEUE (MASTER-DETAIL DOCUMENTATION REVIEW CENTER) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-amber-400" />
                    Centro de Revisão Documental & Workspace Interativa
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Decisões e lições interpretativas geradas que exigem confirmação explícita antes da publicação oficial.
                  </p>
                </div>

                {/* Status Filter Buttons with Dynamic Counts */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
                  {[
                    { id: "ALL", label: `Todos (${reviewQueue.length})` },
                    { id: "PENDING_REVIEW", label: `Aguardando (${pendingReviewsCount})` },
                    { id: "APPROVED", label: `Aprovados (${approvedReviewsCount})` },
                    { id: "REJECTED", label: `Rejeitados (${rejectedReviewsCount})` },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setReviewStatusFilter(filter.id)}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        reviewStatusFilter === filter.id
                          ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* MASTER-DETAIL GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT: DOCUMENT SELECTOR LIST */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>1. Selecione o Arquivo / Proposta:</span>
                    <span className="text-[10px] text-cyan-400">
                      {reviewQueue.filter((r) => reviewStatusFilter === "ALL" || r.status === reviewStatusFilter).length} exibidos
                      {filteredReviewQueue.length} exibidos
                    </span>
                  </div>

                  {reviewQueue.filter((r) => reviewStatusFilter === "ALL" || r.status === reviewStatusFilter).length === 0 ? (
                  {filteredReviewQueue.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs text-slate-500 font-mono">
                      Zero itens encontrados para o filtro selecionado.
                    </div>
                  ) : (
                    reviewQueue
                      .filter((r) => reviewStatusFilter === "ALL" || r.status === reviewStatusFilter)
                      .map((item) => {
                        const isSelected = selectedInlineReviewId === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setSelectedInlineReviewId(item.id);
                              documentationGuardian.markAsRead(item.id, "Paulo");
                            }}
                            className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                              isSelected
                                ? "bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-950/40"
                                : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-cyan-400 animate-pulse" : "bg-slate-600"}`} />
                                <span className="text-xs font-mono font-bold text-cyan-400">{item.id}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {item.type}
                    filteredReviewQueue.map((item) => {
                      const isSelected = activeReviewItem?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedInlineReviewId(item.id);
                            documentationGuardian.markAsRead(item.id, "Paulo");
                          }}
                          className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                            isSelected
                              ? "bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-950/40"
                              : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-cyan-400 animate-pulse" : "bg-slate-600"}`} />
                              <span className="text-xs font-mono font-bold text-cyan-400">{item.id}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {item.type}
                              </span>
                            </div>

                            <div>
                              {item.status === "PENDING_REVIEW" && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                                  Aguardando
                                </span>
                              </div>

                              <div>
                                {item.status === "PENDING_REVIEW" && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                                    Aguardando
                                  </span>
                                )}
                                {item.status === "APPROVED" && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Aprovado
                                  </span>
                                )}
                                {item.status === "REJECTED" && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold flex items-center gap-1">
                                    <X className="w-3 h-3" /> Rejeitado
                                  </span>
                                )}
                              </div>
                              )}
                              {item.status === "APPROVED" && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Aprovado
                                </span>
                              )}
                              {item.status === "REJECTED" && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold flex items-center gap-1">
                                  <X className="w-3 h-3" /> Rejeitado
                                </span>
                              )}
                            </div>
                          </div>

                            <h4 className="text-xs font-bold text-white leading-snug">
                              {item.title}
                            </h4>
                          <h4 className="text-xs font-bold text-white leading-snug">
                            {item.title}
                          </h4>

                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {item.summary}
                            </p>
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {item.summary}
                          </p>

                            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                              <span className="truncate max-w-[200px] text-cyan-300">
                                {item.targetDocument}
                              </span>
                              <span className="text-cyan-400 font-bold flex items-center gap-1">
                                {isSelected ? "✓ Ativo na Workspace" : "Clique para abrir →"}
                              </span>
                            </div>
                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span className="truncate max-w-[200px] text-cyan-300">
                              {item.targetDocument}
                            </span>
                            <span className="text-cyan-400 font-bold flex items-center gap-1">
                              {isSelected ? "✓ Ativo na Workspace" : "Clique para abrir →"}
                            </span>
                          </div>
                        );
                      })
                        </div>
                      );
                    })
                  )}
                </div>

                {/* RIGHT: LIVE INTERACTIVE WORKSPACE */}
                <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl">
                  {(() => {
                    const activeItem = reviewQueue.find((r) => r.id === selectedInlineReviewId) || reviewQueue[0];
                    if (!activeItem) {
                  {!activeReviewItem ? (
                    <div className="p-12 text-center text-slate-500 font-mono text-xs">
                      Nenhum documento selecionado para visualização.
                    </div>
                  ) : (
                    (() => {
                      const activeItem = activeReviewItem;
                      const activeDraftContent =
                        inlineEdits[activeItem.id] ||
                        activeItem.editedContent ||
                        activeItem.fullDraftContent;

                      return (
                        <div className="p-12 text-center text-slate-500 font-mono text-xs">
                          Nenhum documento selecionado para visualização.
                        </div>
                      );
                    }
                        <div className="space-y-4 flex-1 flex flex-col">
                          {/* WORKSPACE HEADER */}
                          <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-cyan-400">{activeItem.id}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                                  {activeItem.changeType === "NEW_DOCUMENT" ? "NOVO DOCUMENTO" : "ATUALIZAÇÃO"}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Alvo: <code className="text-cyan-300">{activeItem.targetDocument}</code>
                                </span>
                              </div>
                              <h3 className="text-sm font-bold text-white leading-tight">
                                {activeItem.title}
                              </h3>
                            </div>

                    const activeDraftContent = inlineEdits[activeItem.id] || activeItem.editedContent || activeItem.fullDraftContent;
                            <button
                              onClick={() => handleOpenReview(activeItem)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                              Abrir em Tela Cheia
                            </button>
                          </div>

                    return (
                      <div className="space-y-4 flex-1 flex flex-col">
                        {/* WORKSPACE HEADER */}
                        <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-cyan-400">{activeItem.id}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                                {activeItem.changeType === "NEW_DOCUMENT" ? "NOVO DOCUMENTO" : "ATUALIZAÇÃO"}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                Alvo: <code className="text-cyan-300">{activeItem.targetDocument}</code>
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-white leading-tight">
                              {activeItem.title}
                            </h3>
                          {/* WORKSPACE TABS */}
                          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800/80 pb-2 text-xs">
                            {[
                              { id: "doc", label: "Documento Completo", icon: FileText },
                              ...(activeItem.currentVersionContent ? [{ id: "diff", label: "Comparação (Diff)", icon: FileCode2 }] : []),
                              { id: "evidences", label: `Evidências (${activeItem.interactiveEvidences.length})`, icon: Sparkles },
                              { id: "edit", label: "Editar Texto", icon: FileCheck },
                              { id: "audit", label: "Trilha de Auditoria", icon: Clock },
                            ].map((t) => {
                              const Icon = t.icon;
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => setInlineTab(t.id as any)}
                                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                                    inlineTab === t.id
                                      ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm"
                                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  {t.label}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            onClick={() => handleOpenReview(activeItem)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                            Abrir em Tela Cheia
                          </button>
                        </div>
                          {/* WORKSPACE CONTENT BODY */}
                          <div className="flex-1 min-h-[360px] max-h-[500px] overflow-y-auto pr-1 space-y-4">
                            {inlineTab === "doc" && (
                              <div className="space-y-4">
                                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                                  <strong className="text-cyan-400 font-mono text-[10px] uppercase">
                                    Resumo & Rationale:
                                  </strong>
                                  <p>{activeItem.summary}</p>
                                  <p className="text-slate-400 text-[11px] pt-1">{activeItem.rationale}</p>
                                </div>

                        {/* WORKSPACE TABS */}
                        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800/80 pb-2 text-xs">
                          {[
                            { id: "doc", label: "Documento Completo", icon: FileText },
                            ...(activeItem.currentVersionContent ? [{ id: "diff", label: "Comparação (Diff)", icon: FileCode2 }] : []),
                            { id: "evidences", label: `Evidências (${activeItem.interactiveEvidences.length})`, icon: Sparkles },
                            { id: "edit", label: "Editar Texto", icon: FileCheck },
                            { id: "audit", label: "Trilha de Auditoria", icon: Clock },
                          ].map((t) => {
                            const Icon = t.icon;
                            return (
                              <button
                                key={t.id}
                                onClick={() => setInlineTab(t.id as any)}
                                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                                  inlineTab === t.id
                                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm"
                                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {t.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* WORKSPACE CONTENT BODY */}
                        <div className="flex-1 min-h-[360px] max-h-[500px] overflow-y-auto pr-1 space-y-4">
                          {inlineTab === "doc" && (
                            <div className="space-y-4">
                              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                                <strong className="text-cyan-400 font-mono text-[10px] uppercase">
                                  Resumo & Rationale:
                                </strong>
                                <p>{activeItem.summary}</p>
                                <p className="text-slate-400 text-[11px] pt-1">{activeItem.rationale}</p>
                                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800/80 font-sans text-xs text-slate-200 leading-relaxed whitespace-pre-line shadow-inner">
                                  {activeDraftContent}
                                </div>
                              </div>
                            )}

                              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800/80 font-sans text-xs text-slate-200 leading-relaxed whitespace-pre-line shadow-inner">
                                {activeDraftContent}
                            {inlineTab === "diff" && activeItem.currentVersionContent && (
                              <div className="space-y-3">
                                <div className="text-[11px] font-mono text-slate-400">
                                  Comparação direta com a versão atual em <code className="text-cyan-300">{activeItem.targetDocument}</code>:
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 space-y-1.5">
                                    <div className="text-[10px] font-mono font-bold text-red-400 uppercase">Versão Atual</div>
                                    <pre className="text-[11px] font-mono text-red-300/80 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                                      {activeItem.currentVersionContent}
                                    </pre>
                                  </div>
                                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 space-y-1.5">
                                    <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Versão Proposta</div>
                                    <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                                      {activeDraftContent}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                            )}

                          {inlineTab === "diff" && activeItem.currentVersionContent && (
                            <div className="space-y-3">
                              <div className="text-[11px] font-mono text-slate-400">
                                Comparação direta com a versão atual em <code className="text-cyan-300">{activeItem.targetDocument}</code>:
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 space-y-1.5">
                                  <div className="text-[10px] font-mono font-bold text-red-400 uppercase">Versão Atual</div>
                                  <pre className="text-[11px] font-mono text-red-300/80 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                                    {activeItem.currentVersionContent}
                                  </pre>
                            {inlineTab === "evidences" && (
                              <div className="space-y-3">
                                <div className="text-xs text-slate-400">
                                  Evidências empíricas e contratuais utilizadas para fundamentar esta proposta:
                                </div>
                                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 space-y-1.5">
                                  <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Versão Proposta</div>
                                  <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                                    {activeDraftContent}
                                  </pre>
                                <div className="grid grid-cols-1 gap-2.5">
                                  {activeItem.interactiveEvidences.map((ev, idx) => (
                                    <div
                                      key={idx}
                                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between group hover:border-cyan-500/40 transition-all"
                                    >
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                                            {ev.type}
                                          </span>
                                          <span className="text-xs font-bold text-white">{ev.label}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400">{ev.description}</p>
                                      </div>

                                      <button
                                        onClick={() => handleNavigateToEvidence(ev)}
                                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono flex items-center gap-1 transition-colors shrink-0"
                                      >
                                        Abrir <ChevronRight className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                            )}

                          {inlineTab === "evidences" && (
                            <div className="space-y-3">
                              <div className="text-xs text-slate-400">
                                Evidências empíricas e contratuais utilizadas para fundamentar esta proposta:
                            {inlineTab === "edit" && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                  <span>Edição direta em Markdown antes da publicação:</span>
                                  <button
                                    onClick={() => {
                                      const next = { ...inlineEdits };
                                      delete next[activeItem.id];
                                      setInlineEdits(next);
                                    }}
                                    className="text-[11px] text-cyan-400 hover:underline"
                                  >
                                    Restaurar Original
                                  </button>
                                </div>

                                <textarea
                                  value={activeDraftContent}
                                  onChange={(e) =>
                                    setInlineEdits({ ...inlineEdits, [activeItem.id]: e.target.value })
                                  }
                                  rows={14}
                                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed"
                                />
                              </div>
                              <div className="grid grid-cols-1 gap-2.5">
                                {activeItem.interactiveEvidences.map((ev, idx) => (
                            )}

                            {inlineTab === "audit" && (
                              <div className="space-y-2">
                                {activeItem.auditTrail.map((audit, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between group hover:border-cyan-500/40 transition-all"
                                    className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-xs flex items-center justify-between"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                                          {ev.type}
                                        </span>
                                        <span className="text-xs font-bold text-white">{ev.label}</span>
                                    <div>
                                      <span className="font-mono text-cyan-400 font-bold">[{audit.action}]</span>{" "}
                                      <span className="text-slate-200">{audit.details}</span>
                                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        Ator: {audit.actor} • {audit.timestamp}
                                      </div>
                                      <p className="text-[11px] text-slate-400">{ev.description}</p>
                                    </div>

                                    <button
                                      onClick={() => handleNavigateToEvidence(ev)}
                                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono flex items-center gap-1 transition-colors shrink-0"
                                    >
                                      Abrir <ChevronRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                            )}
                          </div>

                          {inlineTab === "edit" && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>Edição direta em Markdown antes da publicação:</span>
                                <button
                                  onClick={() => {
                                    const next = { ...inlineEdits };
                                    delete next[activeItem.id];
                                    setInlineEdits(next);
                                  }}
                                  className="text-[11px] text-cyan-400 hover:underline"
                                >
                                  Restaurar Original
                                </button>
                              </div>

                              <textarea
                                value={activeDraftContent}
                                onChange={(e) =>
                                  setInlineEdits({ ...inlineEdits, [activeItem.id]: e.target.value })
                                }
                                rows={14}
                                className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed"
                              />
                          {/* REJECTION REASON BOX IF REJECTED */}
                          {activeItem.status === "REJECTED" && activeItem.rejectionReason && (
                            <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-300">
                              <strong className="text-red-400">Motivo da Rejeição Registrado:</strong> {activeItem.rejectionReason}
                            </div>
                          )}

                          {inlineTab === "audit" && (
                            <div className="space-y-2">
                              {activeItem.auditTrail.map((audit, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-xs flex items-center justify-between"
                                >
                                  <div>
                                    <span className="font-mono text-cyan-400 font-bold">[{audit.action}]</span>{" "}
                                    <span className="text-slate-200">{audit.details}</span>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                      Ator: {audit.actor} • {audit.timestamp}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          {/* WORKSPACE FOOTER ACTIONS */}
                          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              <span>
                                {activeItem.status === "APPROVED"
                                  ? "Documento aprovado e publicado oficialmente na base documental."
                                  : activeItem.status === "REJECTED"
                                  ? "Proposta rejeitada com justificativa registrada no histórico."
                                  : "Documento inspecionado e pronto para decisão humana."}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* REJECTION REASON BOX IF REJECTED */}
                        {activeItem.status === "REJECTED" && activeItem.rejectionReason && (
                          <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-300">
                            <strong className="text-red-400">Motivo da Rejeição Registrado:</strong> {activeItem.rejectionReason}
                          </div>
                        )}
                            <div className="flex items-center gap-2">
                              {activeItem.status === "PENDING_REVIEW" && (
                                <>
                                  <button
                                    onClick={() => {
                                      setInlineRejectingId(activeItem.id);
                                      setInlineRejectReason("");
                                    }}
                                    disabled={isProcessing}
                                    className="px-3.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Rejeitar
                                  </button>

                        {/* WORKSPACE FOOTER ACTIONS */}
                        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>
                              {activeItem.status === "APPROVED"
                                ? "Documento aprovado e publicado oficialmente na base documental."
                                : activeItem.status === "REJECTED"
                                ? "Proposta rejeitada com justificativa registrada no histórico."
                                : "Documento inspecionado e pronto para decisão humana."}
                            </span>
                          </div>
                                  <button
                                    onClick={() => handleApproveReview(activeItem.id, inlineEdits[activeItem.id])}
                                    disabled={isProcessing}
                                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                    Aprovar & Publicar em /docs
                                  </button>
                                </>
                              )}

                          <div className="flex items-center gap-2">
                            {activeItem.status === "PENDING_REVIEW" && (
                              <>
                                <button
                                  onClick={() => {
                                    setInlineRejectingId(activeItem.id);
                                    setInlineRejectReason("");
                                  }}
                                  disabled={isProcessing}
                                  className="px-3.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Rejeitar
                                </button>

                                <button
                                  onClick={() => handleApproveReview(activeItem.id, inlineEdits[activeItem.id])}
                                  disabled={isProcessing}
                                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  Aprovar & Publicar em /docs
                                </button>
                              </>
                            )}

                            {activeItem.status !== "PENDING_REVIEW" && (
                              <span className="text-xs font-mono text-cyan-300 font-bold px-3 py-1 rounded bg-cyan-950/60 border border-cyan-800/60">
                                Decisão concluída ({activeItem.status})
                              </span>
                            )}
                              {activeItem.status !== "PENDING_REVIEW" && (
                                <span className="text-xs font-mono text-cyan-300 font-bold px-3 py-1 rounded bg-cyan-950/60 border border-cyan-800/60">
                                  Decisão concluída ({activeItem.status})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                      );
                    })()
                  )}
                </div>
              </div>
            </div>

            {/* AUDIT LOG */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Histórico Auditado de Atualizações Documentais
              </h3>

              <div className="space-y-2">
                {auditLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-200">{log.description}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Evidência: {log.sourceEvidence} • Arquivos: {log.affectedDocuments.join(", ")}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{log.timestamp.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: HUB / NAVEGAÇÃO */}
        {activeTab === "hub" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto text-xs">
                <span className="text-slate-500 font-mono flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filtrar:
                </span>
                {[
                  { id: "all", label: "Todos os Componentes" },
                  { id: "architecture", label: "Macro-Arquitetura" },
                  { id: "core", label: "VARYNTH Core" },
                  { id: "athena", label: "Athena OS" },
                  { id: "modules", label: "Módulos" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      categoryFilter === cat.id
                        ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                        : "bg-slate-900/60 text-slate-400 hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono text-slate-500">
                {filteredDocs.length} documentos disponíveis
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setActiveTab("component");
                  }}
                  className="bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-5 cursor-pointer transition-all hover:bg-slate-900/90 group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{doc.icon}</span>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        {doc.categoryLabel}
                      </span>
                      <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors mt-0.5">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                        {doc.summary}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-cyan-400 group-hover:translate-x-1 transition-transform">
                    <span className="font-mono text-[10px] text-slate-500">docs/{doc.category}/{doc.id}.md</span>
                    <span className="flex items-center gap-1 font-semibold">
                      Ver Ficha <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: SYSTEM MAP INTERATIVO */}
        {activeTab === "map" && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 space-y-8">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                Mapa Arquitetural do Ecossistema VARYNTH OS
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Representação interativa das camadas de soberania, cognição, barramento de eventos e persistência local.
              </p>
            </div>

            <div className="space-y-6">
              {/* UI LAYER */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    Camada 1: Interface & Apresentação (Next.js 16 + Tailwind CSS)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    21 Rotas
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {["Dashboard", "Workspaces", "Technical Archive", "Vault", "Codex Arena", "Chronos", "Labs", "Lixeira Segura"].map((item) => (
                    <div key={item} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center font-medium">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* ATHENA COGNITIVE LAYER */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    Camada 2: Athena Cognitive OS (Kernel V4 + 3 Vias)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    7 Agentes • 14 Tools
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-300">Fast Path Reflexivo</div>
                    <p className="text-[11px] text-slate-400">Social Check-in, Status e Humor (&lt;10ms)</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-cyan-300">Action Layer Determinística</div>
                    <p className="text-[11px] text-slate-400">14 Ferramentas seguras com Lixeira de 10 dias</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-purple-300">Conselho Cognitivo de Agentes</div>
                    <p className="text-[11px] text-slate-400">Archivist, Critias, Hephaestus, Themis, etc.</p>
                  </div>
                </div>
              </div>

              {/* PERSISTENCE & LOCAL-FIRST LAYER */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">
                    Camada 3: Persistência Local-First & Soberania (Zero Nuvem Comercial)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
                    100% Offline
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {["LocalStorage Cache", "IndexedDB Vault", "JSON Documental", "EventBus Reativo"].map((item) => (
                    <div key={item} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center font-medium">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TECHNICAL HANDBOOK READER */}
        {activeTab === "handbook" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar list */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2 max-h-[700px] overflow-y-auto">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold px-2 py-1">
                Capítulos do Manual
              </h4>
              {TECHNICAL_DOCS.map((doc, idx) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedHandbookChapter(idx)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between ${
                    selectedHandbookChapter === idx
                      ? "bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <span className="truncate">
                    <span className="font-mono text-cyan-400 font-bold mr-1.5">{idx + 1}.</span>
                    {doc.title}
                  </span>
                </button>
              ))}
            </div>

            {/* Chapter details */}
            <div className="md:col-span-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-8 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  Capítulo {selectedHandbookChapter + 1} de {TECHNICAL_DOCS.length}
                </span>
                <h2 className="text-xl font-bold text-white mt-1">
                  {TECHNICAL_DOCS[selectedHandbookChapter].title}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {TECHNICAL_DOCS[selectedHandbookChapter].summary}
                </p>
              </div>

              <div className="prose prose-invert max-w-none text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                {TECHNICAL_DOCS[selectedHandbookChapter].content}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ARCHITECTURE DECISION RECORDS (ADRs) */}
        {activeTab === "adrs" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sidebar ADRs */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold px-2 py-1">
                Registro de Decisões (ADRs)
                Registro de Decisões (ADRs) ({allADRs.length})
              </h4>
              {ADR_LIST.map((adr) => (
              {allADRs.map((adr) => (
                <button
                  key={adr.id}
                  onClick={() => setSelectedAdrId(adr.id)}
                  className={`w-full text-left p-3 rounded-xl text-xs transition-all space-y-1 ${
                    selectedAdrId === adr.id
                      ? "bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-cyan-400 text-[10px]">{adr.number}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                      {adr.status}
                    </span>
                  </div>
                  <div className="font-semibold text-white truncate">{adr.title}</div>
                </button>
              ))}
            </div>

            {/* ADR details */}
            <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-bold">{selectedAdr.number}</span>
                  <h2 className="text-lg font-bold text-white mt-0.5">{selectedAdr.title}</h2>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Data: {selectedAdr.date} • Status: <strong className="text-emerald-400">{selectedAdr.status}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-xs leading-relaxed">
                <div>
                  <h5 className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold">1. Contexto & Problema</h5>
                  <p className="text-slate-300 mt-1">{selectedAdr.context}</p>
                </div>

                <div>
                  <h5 className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-bold">2. Decisão Arquitetural</h5>
                  <p className="text-slate-200 mt-1 font-medium">{selectedAdr.decision}</p>
                </div>

                <div>
                  <h5 className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-bold">3. Rationale (Por quê?)</h5>
                  <p className="text-slate-300 mt-1">{selectedAdr.rationale}</p>
                </div>

                <div>
                  <h5 className="text-[11px] font-mono text-amber-400 uppercase tracking-wider font-bold">4. Alternativas Consideradas</h5>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-slate-400">
                    {selectedAdr.alternatives.map((alt, i) => (
                    {selectedAdr?.alternatives?.map((alt: string, i: number) => (
                      <li key={i}>{alt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LESSONS LEARNED */}
        {activeTab === "lessons" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                Lições Aprendidas & Memória de Engenharia
                Lições Aprendidas & Memória de Engenharia ({allLessons.length})
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Falhas reais observadas em produção, refatorações necessárias e princípios arquiteturais derivados.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LESSONS_LEARNED_LIST.map((lesson) => (
              {allLessons.map((lesson) => (
                <div key={lesson.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">Lição #{lesson.number}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
                      {lesson.linkedRegressionTest}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{lesson.title}</h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong className="text-red-400">Problema:</strong> <span className="text-slate-300">{lesson.problem}</span>
                    </div>
                    <div>
                      <strong className="text-cyan-400">Decisão:</strong> <span className="text-slate-300">{lesson.decision}</span>
                    </div>
                    <div>
                      <strong className="text-emerald-400">Resultado:</strong> <span className="text-slate-300">{lesson.result}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: COMPONENT TECHNICAL SHEET */}
        {activeTab === "component" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sidebar list */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2 max-h-[700px] overflow-y-auto">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold px-2 py-1">
                Componentes Documentados
              </h4>
              {TECHNICAL_DOCS.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between ${
                    selectedDocId === doc.id
                      ? "bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span>{doc.icon}</span>
                    <span className="truncate">{doc.title}</span>
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 uppercase">{doc.status.slice(0, 4)}</span>
                </button>
              ))}
            </div>

            {/* Document details */}
            <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedDoc.icon}</span>
                  <div>
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                      {selectedDoc.categoryLabel}
                    </span>
                    <h2 className="text-lg font-bold text-white mt-0.5">{selectedDoc.title}</h2>
                  </div>
                </div>
                {getStatusBadge(selectedDoc.status)}
              </div>

              <div className="space-y-4 text-xs leading-relaxed">
                <div>
                  <h5 className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold">Resumo Executivo</h5>
                  <p className="text-slate-300 mt-1">{selectedDoc.summary}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <h5 className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-bold mb-2">
                    Especificação Técnica
                  </h5>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line">{selectedDoc.content}</p>
                </div>

                {selectedDoc.relatedADRs && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-slate-500 font-mono text-[11px]">ADRs Vinculados:</span>
                    {selectedDoc.relatedADRs.map((adr) => (
                      <button
                        key={adr}
                        onClick={() => {
                          setSelectedAdrId(adr);
                          setActiveTab("adrs");
                        }}
                        className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono hover:bg-cyan-900"
                      >
                        {adr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* INLINE REJECTION REASON MODAL */}
        {inlineRejectingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <AlertCircle className="w-5 h-5" />
                Registrar Motivo da Rejeição
              </div>
              <p className="text-xs text-slate-400">
                O motivo da rejeição será gravado na memória técnica do Guardian para que a Athena não repita a mesma interpretação no futuro.
              </p>

              <textarea
                value={inlineRejectReason}
                onChange={(e) => setInlineRejectReason(e.target.value)}
                placeholder="Ex: A premissa técnica precisa ser reavaliada antes de aprovação..."
                rows={4}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setInlineRejectingId(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (inlineRejectReason.trim() && inlineRejectingId) {
                      handleRejectReview(inlineRejectingId, inlineRejectReason.trim());
                      setInlineRejectingId(null);
                    }
                  }}
                  disabled={!inlineRejectReason.trim() || isProcessing}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"
                >
                  {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar Rejeição
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EXPORT MODAL */}
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          currentComponentId={selectedDocId}
        />

        {/* DOCUMENT REVIEW VIEWER */}
        <DocumentReviewViewer
          item={selectedReviewItem}
          isOpen={isReviewViewerOpen}
          onClose={() => setIsReviewViewerOpen(false)}
          onApprove={handleApproveReview}
          onReject={handleRejectReview}
          onNavigateToEvidence={handleNavigateToEvidence}
        />
      </div>
    </PageLayout>
  );
}
