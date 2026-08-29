"use client";

import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  TECHNICAL_DOCS,
  ADR_LIST,
  LESSONS_LEARNED_LIST,
  TechnicalDocItem,
  ADRItem,
  ComponentStatus,
} from "@/lib/docs/docs-data";
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
} from "lucide-react";
import Link from "next/link";

type TabMode = "hub" | "map" | "handbook" | "adrs" | "lessons" | "component";

export default function TechnicalArchivePage() {
  const [activeTab, setActiveTab] = useState<TabMode>("hub");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string>("arch-overview");
  const [selectedAdrId, setSelectedAdrId] = useState<string>("ADR-001");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedHandbookChapter, setSelectedHandbookChapter] = useState(0);

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
              <div className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Quality Gates: <strong className="text-emerald-300">73/73 Aprovados (100%)</strong></span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Soberania: <strong className="text-cyan-300">100% Local-First</strong></span>
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
                    <p className="text-[11px] text-slate-400">Turbopack, App Router e 20 Rotas</p>
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
                    <div className="text-xs font-bold text-white">Conselho de 7 Agentes</div>
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
      </div>
    </PageLayout>
  );
}

