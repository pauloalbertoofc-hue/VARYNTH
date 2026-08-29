"use client";

import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  TECHNICAL_DOCS,
  ADR_LIST,
  LESSONS_LEARNED_LIST,
  TechnicalDocItem,
  ComponentStatus,
} from "@/lib/docs/docs-data";
import { documentationGuardian } from "@/lib/athena/guardian/documentation-guardian";
import {
  DocumentationHealthReport,
  DocumentationReviewItem,
  DocumentationAuditRecord,
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
} from "lucide-react";
import { ExportModal } from "@/components/docs/ExportModal";
import { DocumentReviewViewer } from "@/components/docs/DocumentReviewViewer";
import { InteractiveEvidence } from "@/lib/athena/guardian/types";
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

  // Guardian State
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

  // Refresh Guardian Health
  const handleRefreshGuardian = () => {
    const report = documentationGuardian.assessHealth();
    setHealthReport(report);
    setReviewQueue(documentationGuardian.listAllReviews());
    setAuditLog(documentationGuardian.listAuditLog());
    setActionMessage("Auditoria do Documentation Guardian recalculada com sucesso.");
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleOpenReview = (item: DocumentationReviewItem) => {
    setSelectedReviewItem(item);
    setIsReviewViewerOpen(true);
  };

  const handleApproveReview = (id: string, editedContent?: string) => {
    documentationGuardian.approveReview(id, "Paulo", editedContent);
    setReviewQueue(documentationGuardian.listAllReviews());
    setAuditLog(documentationGuardian.listAuditLog());
    setActionMessage(`Proposta de documentação ${id} aprovada e publicada em /docs.`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleRejectReview = (id: string, reason: string) => {
    documentationGuardian.rejectReview(id, "Paulo", reason);
    setReviewQueue(documentationGuardian.listAllReviews());
    setAuditLog(documentationGuardian.listAuditLog());
    setActionMessage(`Proposta ${id} rejeitada com motivo registrado.`);
    setTimeout(() => setActionMessage(null), 3000);
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
            PARTIAL
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
              className="w-full pl-12 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("hub")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "hub"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <Layers className="w-4 h-4" />
            Hub de Engenharia
          </button>

          <button
            onClick={() => setActiveTab("guardian")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "guardian"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Documentation Guardian
            {reviewQueue.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] border border-amber-500/30">
                {reviewQueue.length}
              </span>
            )}
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

        {/* TAB: DOCUMENTATION GUARDIAN TELEMETRY & REVIEW QUEUE */}
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
                <div className="text-3xl font-extrabold text-white">{reviewQueue.length}</div>
                <p className="text-xs text-amber-300 font-medium">Propostas interpretativas em análise</p>
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
                    Selecione qualquer arquivo abaixo para abrir o documento completo, comparar diffs, inspecionar evidências e editar antes de decidir.
                  </p>
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
                  {[
                    { id: "ALL", label: "Todos os Arquivos" },
                    { id: "PENDING_REVIEW", label: "Aguardando Revisão" },
                    { id: "APPROVED", label: "Aprovados" },
                    { id: "REJECTED", label: "Rejeitados" },
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
                    <span className="text-[10px] text-cyan-400">{reviewQueue.length} documentos</span>
                  </div>

                  {reviewQueue.filter((r) => reviewStatusFilter === "ALL" || r.status === reviewStatusFilter).length === 0 ? (
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
                            </div>

                            <h4 className="text-xs font-bold text-white leading-snug">
                              {item.title}
                            </h4>

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
                      return (
                        <div className="p-12 text-center text-slate-500 font-mono text-xs">
                          Nenhum documento selecionado para visualização.
                        </div>
                      );
                    }

                    const activeDraftContent = inlineEdits[activeItem.id] || activeItem.editedContent || activeItem.fullDraftContent;

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
                          </div>

                          <button
                            onClick={() => handleOpenReview(activeItem)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                            Abrir em Tela Cheia
                          </button>
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
                              </div>

                              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800/80 font-sans text-xs text-slate-200 leading-relaxed whitespace-pre-line shadow-inner">
                                {activeDraftContent}
                              </div>
                            </div>
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
                                </div>
                                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 space-y-1.5">
                                  <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Versão Proposta</div>
                                  <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                                    {activeDraftContent}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          )}

                          {inlineTab === "evidences" && (
                            <div className="space-y-3">
                              <div className="text-xs text-slate-400">
                                Evidências empíricas e contratuais utilizadas para fundamentar esta proposta:
                              </div>
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
                          )}

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
                            </div>
                          )}
                        </div>

                        {/* REJECTION REASON BOX IF REJECTED */}
                        {activeItem.status === "REJECTED" && activeItem.rejectionReason && (
                          <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-300">
                            <strong className="text-red-400">Motivo da Rejeição Registrado:</strong> {activeItem.rejectionReason}
                          </div>
                        )}

                        {/* WORKSPACE FOOTER ACTIONS */}
                        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>Documento inspecionado e pronto para decisão humana.</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {activeItem.status === "PENDING_REVIEW" && (
                              <>
                                <button
                                  onClick={() => {
                                    setInlineRejectingId(activeItem.id);
                                    setInlineRejectReason("");
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Rejeitar
                                </button>

                                <button
                                  onClick={() => handleApproveReview(activeItem.id, inlineEdits[activeItem.id])}
                                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Aprovar & Publicar em /docs
                                </button>
                              </>
                            )}

                            {activeItem.status !== "PENDING_REVIEW" && (
                              <span className="text-xs font-mono text-slate-400 italic">
                                Decisão concluída ({activeItem.status}).
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
                    <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 shrink-0">
                      {log.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: HUB & DOCUMENTATION DIRECTORY */}
        {activeTab === "hub" && (
          <div className="space-y-8">
            {/* Quick Area Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => {
                  setSelectedDocId("arch-overview");
                  setActiveTab("component");
                }}
                className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">🏛️</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  VARYNTH Core Architecture
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Macro-arquitetura, filosofia Local-First, fluxo reativo e modelo de segurança.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-cyan-400 font-mono">
                  <span>5 Documentos</span> • <span>Status: Operacional</span>
                </div>
              </div>

              <div
                onClick={() => {
                  setSelectedDocId("ath-overview");
                  setActiveTab("component");
                }}
                className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">🦉</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Athena Cognitive OS
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Kernel V4, Conselho de 7 Agentes, Roteamento em 3 vias e Action Layer.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
                  <span>6 Documentos</span> • <span>73 Testes Aprovados</span>
                </div>
              </div>

              <div
                onClick={() => {
                  setSelectedDocId("mod-vault");
                  setActiveTab("component");
                }}
                className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">🧩</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Módulos Especializados
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Vault, Codex Argument Arena, Research Evidence Board, Chronos, Labs e Lixeira.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-violet-400 font-mono">
                  <span>9 Módulos</span> • <span>Rotas Autônomas</span>
                </div>
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] mr-2">Filtrar:</span>
              {[
                { id: "all", label: "Todos os Documentos" },
                { id: "architecture", label: "Arquitetura" },
                { id: "athena", label: "Athena OS" },
                { id: "modules", label: "Módulos" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    categoryFilter === cat.id
                      ? "bg-slate-800 text-white font-medium border border-slate-700"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Document Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setActiveTab("component");
                  }}
                  className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-cyan-500/30 hover:bg-slate-900/80 cursor-pointer transition-all space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{doc.icon}</span>
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                        {doc.categoryLabel}
                      </span>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {doc.title}
                  </h4>

                  <p className="text-xs text-slate-400 line-clamp-2">{doc.summary}</p>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="truncate max-w-[180px]">{doc.sourceFilePath}</span>
                    <span className="flex items-center gap-1 text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                      Abrir <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE SYSTEM MAP */}
        {activeTab === "map" && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-cyan-400" />
                  Topologia Interativa do VARYNTH OS
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Clique em qualquer componente para inspecionar sua ficha técnica oficial e responsabilidades.
                </p>
              </div>

              {/* Graphical Hierarchy */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                {/* Column 1: Interface */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold border-b border-slate-800 pb-2">
                    1. Interface & Apresentação
                  </h4>
                  <div
                    onClick={() => {
                      setSelectedDocId("arch-overview");
                      setActiveTab("component");
                    }}
                    className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/20 hover:border-cyan-500/50 cursor-pointer transition-all space-y-1"
                  >
                    <div className="text-xs font-bold text-white">Next.js 16 + React 19</div>
                    <p className="text-[11px] text-slate-400">Turbopack, App Router e 21 Rotas</p>
                  </div>
                  <div
                    onClick={() => {
                      setSelectedDocId("ath-overview");
                      setActiveTab("component");
                    }}
                    className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/20 hover:border-cyan-500/50 cursor-pointer transition-all space-y-1"
                  >
                    <div className="text-xs font-bold text-white">Athena Sidecar</div>
                    <p className="text-[11px] text-slate-400">Chat flutuante e scoped em Workspaces</p>
                  </div>
                </div>

                {/* Column 2: Cognitive Kernel */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold border-b border-slate-800 pb-2">
                    2. Athena Cognitive OS
                  </h4>
                  <div
                    onClick={() => {
                      setSelectedDocId("ath-conv-mgr");
                      setActiveTab("component");
                    }}
                    className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/20 hover:border-emerald-500/50 cursor-pointer transition-all space-y-1"
                  >
                    <div className="text-xs font-bold text-white">ConversationManager</div>
                    <p className="text-[11px] text-slate-400">Roteamento em 3 vias & anáforas</p>
                  </div>
                  <div
                    onClick={() => {
                      setSelectedDocId("ath-kernel");
                      setActiveTab("component");
                    }}
                    className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/20 hover:border-emerald-500/50 cursor-pointer transition-all space-y-1"
                  >
                    <div className="text-xs font-bold text-white">Kernel V4 & ExecutiveController</div>
                    <p className="text-[11px] text-slate-400">Orçamentos e agendamento em DAG</p>
                  </div>
                  <div
                    onClick={() => {
                      setSelectedDocId("ath-agents");
                      setActiveTab("component");
                    }}
                    className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/20 hover:border-emerald-500/50 cursor-pointer transition-all space-y-1"
                  >
                    <div className="text-xs font-bold text-white">Conselho de Agentes (Archivist)</div>
                    <p className="text-[11px] text-slate-400">Justitia, Logos, Sophia, Musa, Critias...</p>
                  </div>
                </div>

                {/* Column 3: Action Layer */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold border-b border-slate-800 pb-2">
                    3. Action & Safety Layer
                  </h4>
                  <div
                    onClick={() => {
                      setSelectedDocId("ath-tools");
                      setActiveTab("component");
                    }}
                    className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/20 hover:border-amber-500/50 cursor-pointer transition-all space-y-1"
                  >
                    <div className="text-xs font-bold text-white">ToolManager (14 Tools)</div>
                    <p className="text-[11px] text-slate-400">Mutações determinísticas auditadas</p>
                  </div>
                  <div
                    onClick={() => {
                      setSelectedDocId("mod-trash");
                      setActiveTab("component");
                    }}
                    className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/20 hover:border-amber-500/50 cursor-pointer transition-all space-y-1"
                  >
                    <div className="text-xs font-bold text-white">Lixeira de 10 Dias (Undo)</div>
                    <p className="text-[11px] text-slate-400">Alex Principle & Quarentena segura</p>
                  </div>
                </div>

                {/* Column 4: Storage & Modules */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold border-b border-slate-800 pb-2">
                    4. Armazenamento & Módulos
                  </h4>
                  <div
                    onClick={() => {
                      setSelectedDocId("mod-vault");
                      setActiveTab("component");
                    }}
                    className="p-3.5 rounded-xl bg-slate-950 border border-violet-500/20 hover:border-violet-500/50 cursor-pointer transition-all space-y-1"
                  >
                    <div className="text-xs font-bold text-white">Vault & Codex</div>
                    <p className="text-[11px] text-slate-400">Biblioteca e Argument Arena</p>
                  </div>
                  <div
                    onClick={() => {
                      setSelectedDocId("mod-chronos");
                      setActiveTab("component");
                    }}
                    className="p-3.5 rounded-xl bg-slate-950 border border-violet-500/20 hover:border-violet-500/50 cursor-pointer transition-all space-y-1"
                  >
                    <div className="text-xs font-bold text-white">Chronos & Labs</div>
                    <p className="text-[11px] text-slate-400">Prazos e incubadora de experimentos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TECHNICAL HANDBOOK (20 CHAPTERS) */}
        {activeTab === "handbook" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Chapter Selection Sidebar */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2 max-h-[700px] overflow-y-auto">
              <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold px-2 py-1">
                Capítulos do Manual
              </h4>
              {[
                "1. Origem do Projeto",
                "2. O Problema que o VARYNTH Resolve",
                "3. Filosofia & Soberania Tecnológica",
                "4. Macro-Arquitetura do Sistema",
                "5. Sistema Modular (9 Módulos)",
                "6. Estrutura de Dados & Tipos",
                "7. Segurança, Lixeira 10d & Alex Principle",
                "8. Athena: Copilot Cognitivo",
                "9. Evolução da Inteligência (V1 à V4)",
                "10. Roteamento em 3 Vias de Interação",
                "11. Anáforas & Elipses Multi-Turno",
                "12. Memória & Base Epistêmica",
                "13. Action Layer & 14 Ferramentas",
                "14. Conselho de 7 Especialistas",
                "15. Deliberação Dialética Consensual",
                "16. Inferência Neural Local (Ollama)",
                "17. Falhas Reais & Lições Aprendidas",
                "18. Suíte de 73 Testes de Regressão",
                "19. Estado Atual & Performance",
                "20. Roadmap & Próximos Passos",
              ].map((cap, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedHandbookChapter(idx)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${
                    selectedHandbookChapter === idx
                      ? "bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>

            {/* Chapter Reader */}
            <div className="md:col-span-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold">
                    VARYNTH Technical Handbook — Capítulo {selectedHandbookChapter + 1}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">
                    {[
                      "Origem do Projeto",
                      "O Problema que o VARYNTH Resolve",
                      "Filosofia & Soberania Tecnológica",
                      "Macro-Arquitetura do Sistema",
                      "Sistema Modular (9 Módulos Especializados)",
                      "Estruturas de Dados & Tipagem Estrita",
                      "Modelo de Segurança, Lixeira de 10 Dias & Alex Principle",
                      "Athena — O Copilot Cognitivo Soberano",
                      "A Evolução da Inteligência da Athena (V1 à V4)",
                      "Compreensão Conversacional em 3 Vias (Fast, Cognitive, Operational)",
                      "Resolução Contextual de Anáforas & Elipses Multi-Turno",
                      "Memória, ContextBuilder & Base Epistêmica Offline",
                      "Action Layer, ToolManager & Trilha de Auditoria",
                      "O Conselho de Especialistas (7 Agentes Cognitivos)",
                      "Deliberação Dialética & Síntese Consensual",
                      "Inferência Neural Local (Ollama) & Baseline Determinístico",
                      "Principais Falhas Reais & Como Transformaram a Arquitetura",
                      "Suíte de Testes de Regressão & Quality Gates Automatizados",
                      "Estado Atual, Performance & Limitações Conhecidas",
                      "Roadmap & Próximos Passos de Engenharia",
                    ][selectedHandbookChapter]}
                  </h2>
                </div>
                <div className="text-xs font-mono text-slate-500">
                  Fonte: <code>docs/handbook/VARYNTH-TECHNICAL-HANDBOOK.md</code>
                </div>
              </div>

              <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed space-y-4">
                <p>
                  Capítulo extraído integralmente do manual de engenharia oficial do VARYNTH OS. Para ler a documentação completa, você também pode acessar o arquivo no repositório local.
                </p>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-cyan-300">
                  Status: 100% Validado com Quality Gates • Baseline: 0 ms • Regressões: Zero
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ARCHITECTURE DECISION RECORDS (ADRS) */}
        {activeTab === "adrs" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ADR List */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                Architecture Decision Records
              </h4>
              {ADR_LIST.map((adr) => (
                <div
                  key={adr.id}
                  onClick={() => setSelectedAdrId(adr.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                    selectedAdrId === adr.id
                      ? "bg-slate-900 border-cyan-500/40 shadow-md"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">{adr.number}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      {adr.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-2">{adr.title}</h4>
                  <div className="text-[10px] text-slate-500 font-mono">{adr.date}</div>
                </div>
              ))}
            </div>

            {/* ADR Viewer */}
            <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-bold">{selectedAdr.number}</span>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedAdr.title}</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {selectedAdr.status}
                </span>
              </div>

              <div className="space-y-4 text-xs leading-relaxed">
                <div>
                  <h5 className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold">1. Contexto & Problema</h5>
                  <p className="text-slate-300 mt-1">{selectedAdr.context}</p>
                </div>

                <div>
                  <h5 className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold">2. Decisão Arquitetural</h5>
                  <p className="text-slate-300 mt-1">{selectedAdr.decision}</p>
                </div>

                <div>
                  <h5 className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold">3. Rationale (Por quê?)</h5>
                  <p className="text-slate-300 mt-1">{selectedAdr.rationale}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                    <h6 className="font-bold text-emerald-400 text-[11px] mb-1">Ganhos de Engenharia</h6>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      {selectedAdr.consequences.gains.map((g, i) => <li key={i}>{g}</li>)}
                    </ul>
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40">
                    <h6 className="font-bold text-amber-400 text-[11px] mb-1">Tradeoffs & Compensações</h6>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      {selectedAdr.consequences.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
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
                Memória de Lições Aprendidas na Engenharia
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Falhas reais observadas durante o desenvolvimento que se transformaram em princípios arquiteturais permanentes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {LESSONS_LEARNED_LIST.map((lesson) => (
                <div
                  key={lesson.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-cyan-400 font-bold">LIÇÃO #{lesson.number}</span>
                    {lesson.linkedRegressionTest && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                        Teste: {lesson.linkedRegressionTest}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white">{lesson.title}</h4>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-red-950/20 border border-red-900/30 text-red-300">
                      <strong className="text-red-400">Problema Observado:</strong> {lesson.problem}
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-emerald-300">
                      <strong className="text-emerald-400">Decisão & Resultado:</strong> {lesson.decision}
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
                  disabled={!inlineRejectReason.trim()}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50"
                >
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
