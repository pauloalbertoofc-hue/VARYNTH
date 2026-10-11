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
import { Surface } from "@/components/ui/Surface";
import { StatePanel } from "@/components/ui/StatePanel";

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
      <div className="vly-enter space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--vly-border-accent)] bg-[var(--vly-accent-soft)] text-[var(--vly-accent)] glow-accent">
                <GraduationCap size={18} />
              </div>
              <h1 className="text-xl font-black tracking-tight text-[var(--vly-text-primary)] sm:text-2xl">
                Research & Evidence Board
              </h1>
            </div>
            <p className="mt-1 text-xs text-[var(--vly-text-secondary)]">
              Catalogação sistemática de evidências científicas, proposições probatórias e acompanhamento de artigos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "board" ? (
              <button
                onClick={() => setIsEviModalOpen(true)}
                className="vly-interactive flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[var(--vly-text-primary)] bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] border border-[var(--vly-border-accent)]"
              >
                <Plus size={16} />
                <span>Nova Evidência</span>
              </button>
            ) : (
              <button
                onClick={() => setIsResModalOpen(true)}
                className="vly-interactive flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[var(--vly-text-primary)] bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] border border-[var(--vly-border-accent)]"
              >
                <Plus size={16} />
                <span>Nova Pesquisa</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 border-b border-[var(--vly-border-subtle)] pb-1">
          <button
            onClick={() => setActiveTab("board")}
            className={cn(
              "vly-interactive flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold",
                activeTab === "board"
                 ? "bg-[var(--vly-accent-soft)] text-[var(--vly-accent)] border border-[var(--vly-border-accent)]"
                 : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)]"
            )}
          >
            <Layers size={14} />
            <span>Evidence Board ({evidences.length} Evidências)</span>
          </button>

          <button
            onClick={() => setActiveTab("projetos")}
            className={cn(
              "vly-interactive flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold",
                activeTab === "projetos"
                 ? "bg-[var(--vly-info-soft)] text-[var(--vly-info)] border border-[var(--vly-border-info)]"
                 : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)]"
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
            <div className="flex flex-col items-stretch justify-between gap-3 rounded-[var(--vly-radius-md)] border border-[var(--vly-border-default)] bg-[var(--vly-surface)] p-3.5 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por afirmação, autor, citação ou #tag..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Buscar evidências"
                  className="vly-field w-full pl-9 pr-3 py-1.5 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedStrength}
                  onChange={(e) => setSelectedStrength(e.target.value)}
                  aria-label="Filtrar por força da evidência"
                  className="vly-field min-h-0 px-2.5 py-1.5 rounded-lg text-xs"
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
                  aria-label="Filtrar por seção do artigo"
                  className="vly-field min-h-0 px-2.5 py-1.5 rounded-lg text-xs"
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
                <StatePanel tone="empty" title="Nenhuma evidência cadastrada no Board" description="Adicione trechos de artigos e proposições científicas para fundamentar seus artigos." action={<button type="button" onClick={() => setIsEviModalOpen(true)} className="vly-interactive rounded-lg bg-[var(--vly-surface-raised)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)] border border-[var(--vly-border-accent)]">Adicionar evidência</button>} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredEvidences.map((evi) => {
                    const st = STRENGTH_CONFIG[evi.strength] || STRENGTH_CONFIG.forte;
                    return (
                      <div
                        key={evi.id}
                        className="group relative flex flex-col justify-between rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface)] p-5 transition-all hover:border-[var(--vly-border-accent)] clip-corner"
                      >
                        <div className="space-y-3">
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("text-[10px] px-2 py-0.5 rounded border font-semibold", st.bg, st.text, st.border)}>
                              {st.label}
                            </span>
                            <span className="rounded border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--vly-text-secondary)]">
                              {SECTION_LABELS[evi.section] || evi.section}
                            </span>
                          </div>

                          {/* Claim */}
                          <div>
                            <h3 className="text-xs font-bold text-[var(--vly-text-primary)] transition-colors group-hover:text-[var(--vly-accent)]">
                              {evi.claim}
                            </h3>
                            <p className="mt-1 text-[11px] font-medium text-[var(--vly-text-secondary)]">
                              Fonte: {evi.source} {evi.page && `(${evi.page})`}
                            </p>
                          </div>

                          {/* Quote Box */}
                          <div className="rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3 text-xs italic leading-relaxed text-[var(--vly-text-secondary)]">
                            &quot;{evi.quote}&quot;
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-4 flex items-center justify-between border-t border-[var(--vly-border-default)] pt-3 text-[11px] text-[var(--vly-text-muted)]">
                          <div className="flex items-center gap-1 flex-wrap">
                            {evi.tags.map((t) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.2 rounded bg-[#14141f] text-slate-400">
                                #{t}
                              </span>
                            ))}
                          </div>

                          <button
                            onClick={() => deleteEvidence(evi.id)}
                            className="vly-interactive p-1.5 text-[var(--vly-text-muted)] opacity-70 hover:text-[var(--vly-danger)] sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation"
                            title="Remover evidência"
                          >
                            <Trash2 size={13} />
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
            {researches.length === 0 ? <StatePanel tone="empty" title="Nenhum projeto de pesquisa" description="Estruture um problema, hipótese e metodologia para iniciar um artigo." action={<button type="button" onClick={() => setIsResModalOpen(true)} className="vly-interactive rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white">Criar pesquisa</button>} /> : researches.map((res) => (
              <Surface
                key={res.id}
                tone="panel"
                className="space-y-4 rounded-2xl p-6 clip-corner"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="rounded-full border border-[var(--vly-border-accent)] bg-[var(--vly-accent-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--vly-accent)]">
                      Status: {res.status.toUpperCase()}
                    </span>
                    <h3 className="mt-1.5 text-base font-black text-[var(--vly-text-primary)]">{res.title}</h3>
                  </div>

                  {res.submissionDeadline && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-warning)] bg-[var(--vly-warning-soft)] px-3 py-1.5 font-mono text-xs text-[var(--vly-warning)]">
                      <Calendar size={13} />
                      <span>Prazo: {res.submissionDeadline}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                   <div className="space-y-1 rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3.5">
                     <span className="block text-[10px] font-bold uppercase text-[var(--vly-text-secondary)]">Pergunta de Pesquisa (Problema)</span>
                     <p className="leading-relaxed text-[var(--vly-text-secondary)]">{res.problem}</p>
                  </div>

                   <div className="space-y-1 rounded-xl border border-[var(--vly-border-accent)] bg-[var(--vly-accent-soft)] p-3.5">
                     <span className="block text-[10px] font-bold uppercase text-[var(--vly-accent)]">Hipótese Principal</span>
                     <p className="leading-relaxed text-[var(--vly-text-secondary)]">{res.hypothesis}</p>
                  </div>
                </div>

                 <div className="space-y-1 rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3.5 text-xs">
                   <span className="block text-[10px] font-bold uppercase text-[var(--vly-info)]">Metodologia & Veículo Alvo</span>
                   <p className="text-[var(--vly-text-secondary)]">{res.methodology}</p>
                  {res.targetVenue && (
                     <p className="mt-1 font-semibold text-[var(--vly-accent)]">🎯 Veículo Alvo: {res.targetVenue}</p>
                   )}
                  </div>
                </Surface>
            ))}
          </div>
        )}

        {/* Modal: Nova Evidência */}
        {isEviModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-lg bg-[var(--vly-surface-raised)] border border-[var(--vly-border-default)] rounded-xl shadow-2xl p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
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
                    className="vly-field w-full rounded-lg px-3 py-2 text-xs"
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
                      className="vly-field w-full rounded-lg px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Página / Localizador</label>
                    <input
                      type="text"
                      placeholder="Ex: p. 36-40 ou Art. 14"
                      value={page}
                      onChange={(e) => setPage(e.target.value)}
                      className="vly-field w-full rounded-lg px-3 py-2 text-xs"
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
                    className="vly-field w-full resize-none rounded-lg px-3 py-2 text-xs font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Força Probatória</label>
                    <select
                      value={strength}
                      onChange={(e) => setStrength(e.target.value as EvidenceStrength)}
                      className="vly-field w-full rounded-lg px-2.5 py-2 text-xs"
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
                      className="vly-field w-full rounded-lg px-2.5 py-2 text-xs"
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
                    className="vly-field w-full rounded-lg px-3 py-2 text-xs"
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
