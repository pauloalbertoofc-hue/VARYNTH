"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { EvidenceItem, EvidenceStrength, PaperSection, AcademicResearch } from "@/lib/types";
import {
  GraduationCap,
  Layers,
  Plus,
  Trash2,
  Quote,
  Search,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Calendar,
  Tag,
  FolderKanban,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ResearchTab = "board" | "projetos";

const STRENGTH_CONFIG: Record<EvidenceStrength, { label: string; bg: string; text: string; border: string }> = {
  forte: { label: "Evidência Forte", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  moderada: { label: "Evidência Moderada", bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  preliminar: { label: "Preliminar", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  refutada: { label: "Refutada / Risco", bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
};

const SECTION_LABELS: Record<PaperSection, string> = {
  introducao: "Introdução",
  revisao_literatura: "Revisão de Literatura",
  metodologia: "Metodologia",
  resultados: "Resultados",
  discussao: "Discussão",
  conclusao: "Conclusão",
};

export default function ResearchPage() {
  const { researches, evidences, projects, addEvidence, deleteEvidence, addResearch, deleteResearch } = useVarynthStore();

  const [activeTab, setActiveTab] = useState<ResearchTab>("board");
  const [search, setSearch] = useState("");
  const [selectedStrength, setSelectedStrength] = useState<string>("todas");
  const [selectedSection, setSelectedSection] = useState<string>("todas");

  // Evidence modal
  const [isEviModalOpen, setIsEviModalOpen] = useState(false);
  const [claim, setClaim] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState("");
  const [quote, setQuote] = useState("");
  const [strength, setStrength] = useState<EvidenceStrength>("forte");
  const [section, setSection] = useState<PaperSection>("discussao");
  const [eviTags, setEviTags] = useState("");

  // Research modal
  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const [resTitle, setResTitle] = useState("");
  const [resProblem, setResProblem] = useState("");
  const [resHypothesis, setResHypothesis] = useState("");
  const [resMethodology, setResMethodology] = useState("");
  const [resVenue, setResVenue] = useState("");
  const [resDeadline, setResDeadline] = useState("");

  const filteredEvidences = useMemo(() => {
    return evidences.filter((evi) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        evi.claim.toLowerCase().includes(q) ||
        evi.source.toLowerCase().includes(q) ||
        evi.quote.toLowerCase().includes(q) ||
        evi.tags.some((t) => t.toLowerCase().includes(q));

      const matchesStrength = selectedStrength === "todas" || evi.strength === selectedStrength;
      const matchesSection = selectedSection === "todas" || evi.section === selectedSection;

      return matchesSearch && matchesStrength && matchesSection;
    });
  }, [evidences, search, selectedStrength, selectedSection]);

  const handleCreateEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim.trim() || !source.trim() || !quote.trim()) return;

    const tagsArray = eviTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    addEvidence({
      claim: claim.trim(),
      source: source.trim(),
      page: page.trim() || undefined,
      quote: quote.trim(),
      strength,
      section,
      tags: tagsArray.length ? tagsArray : ["evidencia"],
    });

    setClaim("");
    setSource("");
    setPage("");
    setQuote("");
    setEviTags("");
    setIsEviModalOpen(false);
  };

  const handleCreateResearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim() || !resProblem.trim()) return;

    addResearch({
      title: resTitle.trim(),
      problem: resProblem.trim(),
      hypothesis: resHypothesis.trim(),
      objectives: ["Mapeamento bibliográfico", "Coleta empírica", "Redação e submissão"],
      methodology: resMethodology.trim() || "Pesquisa qualitativa e bibliográfica.",
      targetVenue: resVenue.trim() || undefined,
      submissionDeadline: resDeadline || undefined,
      status: "planejamento",
      tags: ["pesquisa", "academico"],
    });

    setResTitle("");
    setResProblem("");
    setResHypothesis("");
    setResMethodology("");
    setResVenue("");
    setResDeadline("");
    setIsResModalOpen(false);
  };

  return (
    <PageLayout title="Research" subtitle="Pesquisas acadêmicas e Evidence Board">
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 glow-accent">
                <GraduationCap size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Research & Evidence Board
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Catalogação sistemática de evidências científicas, proposições probatórias e acompanhamento de artigos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "board" ? (
              <button
                onClick={() => setIsEviModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 glow-accent transition-all"
              >
                <Plus size={16} />
                <span>Nova Evidência</span>
              </button>
            ) : (
              <button
                onClick={() => setIsResModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 glow-accent transition-all"
              >
                <Plus size={16} />
                <span>Nova Pesquisa</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 border-b border-[#1e1e30] pb-1">
          <button
            onClick={() => setActiveTab("board")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              activeTab === "board"
                ? "bg-violet-600/20 text-violet-300 border border-violet-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            )}
          >
            <Layers size={14} />
            <span>Evidence Board ({evidences.length} Evidências)</span>
          </button>

          <button
            onClick={() => setActiveTab("projetos")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              activeTab === "projetos"
                ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            )}
          >
            <GraduationCap size={14} />
            <span>Projetos de Artigo ({researches.length})</span>
          </button>
        </div>

        {/* TAB 1: Evidence Board */}
        {activeTab === "board" && (
          <div className="space-y-6">
            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 bg-[#0f0f1a] rounded-xl border border-[#1e1e30]">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por afirmação, autor, citação ou #tag..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedStrength}
                  onChange={(e) => setSelectedStrength(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                >
                  <option value="todas">Todas as Forças</option>
                  <option value="forte">Forte</option>
                  <option value="moderada">Moderada</option>
                  <option value="preliminar">Preliminar</option>
                  <option value="refutada">Refutada / Risco</option>
                </select>

                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                >
                  <option value="todas">Todas as Seções</option>
                  {Object.entries(SECTION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Evidence Cards */}
            <div>
              {filteredEvidences.length === 0 ? (
                <div className="py-16 text-center rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3">
                  <Quote size={36} className="mx-auto text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">Nenhuma evidência cadastrada no Board</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Adicione trechos de artigos e proposições científicas para fundamentar seus artigos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredEvidences.map((evi) => {
                    const st = STRENGTH_CONFIG[evi.strength] || STRENGTH_CONFIG.forte;
                    return (
                      <div
                        key={evi.id}
                        className="group relative flex flex-col justify-between p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-violet-500/40 transition-all clip-corner"
                      >
                        <div className="space-y-3">
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("text-[10px] px-2 py-0.5 rounded border font-semibold", st.bg, st.text, st.border)}>
                              {st.label}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#14141f] text-slate-400 border border-[#1e1e30] font-mono uppercase">
                              {SECTION_LABELS[evi.section] || evi.section}
                            </span>
                          </div>

                          {/* Claim */}
                          <div>
                            <h3 className="text-xs font-bold text-slate-100 group-hover:text-violet-300 transition-colors">
                              {evi.claim}
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-1 font-medium">
                              Fonte: {evi.source} {evi.page && `(${evi.page})`}
                            </p>
                          </div>

                          {/* Quote Box */}
                          <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-300 italic leading-relaxed">
                            &quot;{evi.quote}&quot;
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-4 pt-3 border-t border-[#1e1e30] flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-1 flex-wrap">
                            {evi.tags.map((t) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.2 rounded bg-[#14141f] text-slate-400">
                                #{t}
                              </span>
                            ))}
                          </div>

                          <button
                            onClick={() => deleteEvidence(evi.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                            title="Remover evidência"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Projetos de Pesquisa */}
        {activeTab === "projetos" && (
          <div className="space-y-4">
            {researches.map((res) => (
              <div
                key={res.id}
                className="p-6 rounded-2xl bg-[#0f0f1a] border border-[#1e1e30] space-y-4 clip-corner"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold uppercase tracking-wider">
                      Status: {res.status.toUpperCase()}
                    </span>
                    <h3 className="text-base font-black text-white mt-1.5">{res.title}</h3>
                  </div>

                  {res.submissionDeadline && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                      <Calendar size={13} />
                      <span>Prazo: {res.submissionDeadline}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e30] space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Pergunta de Pesquisa (Problema)</span>
                    <p className="text-slate-300 leading-relaxed">{res.problem}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e30] space-y-1">
                    <span className="text-[10px] font-bold text-violet-400 uppercase block">Hipótese Principal</span>
                    <p className="text-slate-300 leading-relaxed">{res.hypothesis}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e30] text-xs space-y-1">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase block">Metodologia & Veículo Alvo</span>
                  <p className="text-slate-300">{res.methodology}</p>
                  {res.targetVenue && (
                    <p className="text-violet-300 font-semibold mt-1">🎯 Veículo Alvo: {res.targetVenue}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Nova Evidência */}
        {isEviModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-lg bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#1e1e30] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Quote size={16} className="text-violet-400" />
                  <span>Cadastrar Evidência Científica</span>
                </h2>
                <button onClick={() => setIsEviModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateEvidence} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Afirmação / Proposição Científica *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: A explicabilidade não garante segurança em modelos de alta dimensionalidade"
                    value={claim}
                    onChange={(e) => setClaim(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Fonte / Autor *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Lipton, Z. C. (2018)"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Página / Localizador</label>
                    <input
                      type="text"
                      placeholder="Ex: p. 36-40 ou Art. 14"
                      value={page}
                      onChange={(e) => setPage(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Trecho Exato Citado (Quote) *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Cole o trecho fiel do autor ou da decisão judicial..."
                    value={quote}
                    onChange={(e) => setQuote(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Força Probatória</label>
                    <select
                      value={strength}
                      onChange={(e) => setStrength(e.target.value as EvidenceStrength)}
                      className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="forte">Forte (Doutrina Pacífica / Lei)</option>
                      <option value="moderada">Moderada (Artigo / Estudo)</option>
                      <option value="preliminar">Preliminar (Hipótese inicial)</option>
                      <option value="refutada">Refutada (Contra-evidência)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Seção do Artigo</label>
                    <select
                      value={section}
                      onChange={(e) => setSection(e.target.value as PaperSection)}
                      className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                    >
                      {Object.entries(SECTION_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    placeholder="ia, explicabilidade, epistemologia"
                    value={eviTags}
                    onChange={(e) => setEviTags(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1e1e30]">
                  <button
                    type="button"
                    onClick={() => setIsEviModalOpen(false)}
                    className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 glow-accent"
                  >
                    Fixar no Board
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
