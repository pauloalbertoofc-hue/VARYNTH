"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { LabItem, LabStage, GraveyardItem, ProjectCategory } from "@/lib/types";
import {
  FlaskConical,
  Lightbulb,
  Skull,
  Plus,
  ArrowRight,
  Sparkles,
  Trash2,
  Tag,
  CheckCircle2,
  FolderPlus,
  Layers,
  Archive,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatePanel } from "@/components/ui/StatePanel";
import { Surface } from "@/components/ui/Surface";

type ActiveTab = "labs" | "graveyard";

const STAGE_CONFIG: Record<LabStage, { label: string; bg: string; text: string; border: string }> = {
  ideia: { label: "Ideia Solta", bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  experimento: { label: "Experimento Ativo", bg: "bg-[var(--vly-warning-soft)]", text: "text-[var(--vly-warning)]", border: "border-[var(--vly-border-warning)]" },
  prototipo: { label: "Protótipo Maduro", bg: "bg-[color-mix(in_srgb,var(--vly-accent)_10%,var(--vly-surface))]", text: "text-[var(--vly-accent)]", border: "border-[var(--vly-border-accent)]" },
  promovido: { label: "Promovido a Projeto", bg: "bg-[var(--vly-success-soft)]", text: "text-[var(--vly-success)]", border: "border-[var(--vly-border-success)]" },
};

export default function LabsPage() {
  const {
    labItems,
    graveyardItems,
    addLabItem,
    updateLabItem,
    deleteLabItem,
    promoteLabToProject,
    addGraveyardItem,
    deleteGraveyardItem,
  } = useVarynthStore();

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("labs");

  // Lab modal
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [labTitle, setLabTitle] = useState("");
  const [labDesc, setLabDesc] = useState("");
  const [labHypothesis, setLabHypothesis] = useState("");
  const [labCategory, setLabCategory] = useState<ProjectCategory>("software");
  const [labStage, setLabStage] = useState<LabStage>("ideia");
  const [labTags, setLabTags] = useState("");
  const [labNotes, setLabNotes] = useState("");

  // Graveyard modal
  const [isGraveModalOpen, setIsGraveModalOpen] = useState(false);
  const [graveTitle, setGraveTitle] = useState("");
  const [graveCategory, setGraveCategory] = useState<ProjectCategory>("software");
  const [graveWhyStarted, setGraveWhyStarted] = useState("");
  const [graveWhyAbandoned, setGraveWhyAbandoned] = useState("");
  const [graveLessons, setGraveLessons] = useState("");
  const [graveAssets, setGraveAssets] = useState("");
  const [graveTags, setGraveTags] = useState("");

  const handleCreateLab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labTitle.trim()) return;

    const tagsArray = labTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    addLabItem({
      title: labTitle.trim(),
      description: labDesc.trim(),
      hypothesis: labHypothesis.trim() || undefined,
      category: labCategory,
      stage: labStage,
      tags: tagsArray.length ? tagsArray : ["experimento"],
      notes: labNotes.trim() || undefined,
    });

    setLabTitle("");
    setLabDesc("");
    setLabHypothesis("");
    setLabTags("");
    setLabNotes("");
    setIsLabModalOpen(false);
  };

  const handlePromote = (labId: string) => {
    const newProj = promoteLabToProject(labId);
    if (newProj) {
      router.push(`/projects/${newProj.id}`);
    }
  };

  const handleCreateGraveyard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!graveTitle.trim()) return;

    const tagsArray = graveTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    addGraveyardItem({
      title: graveTitle.trim(),
      originalCategory: graveCategory,
      whyStarted: graveWhyStarted.trim(),
      whyAbandoned: graveWhyAbandoned.trim(),
      lessonsLearned: graveLessons.trim(),
      reusableAssets: graveAssets.trim() || undefined,
      tags: tagsArray.length ? tagsArray : ["post-mortem"],
      abandonedAt: new Date().toISOString().split("T")[0],
    });

    setGraveTitle("");
    setGraveWhyStarted("");
    setGraveWhyAbandoned("");
    setGraveLessons("");
    setGraveAssets("");
    setGraveTags("");
    setIsGraveModalOpen(false);
  };

  return (
    <PageLayout title="Labs & Graveyard" subtitle="Incubadora de ideias e memorial de aprendizados">
      <div className="vly-enter mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--vly-border-warning)] bg-[var(--vly-warning-soft)] text-[var(--vly-warning)]">
                <FlaskConical size={18} />
              </div>
              <h1 className="text-xl font-black tracking-tight text-[var(--vly-text-primary)] sm:text-2xl">
                Labs & Memorial Graveyard
              </h1>
            </div>
            <p className="mt-1 text-xs text-[var(--vly-text-secondary)]">
              Pipeline de inovação: Ideia → Experimento → Protótipo → Projeto, e memorial de lições aprendidas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "labs" ? (
              <button
                onClick={() => setIsLabModalOpen(true)}
                className="vly-interactive flex items-center gap-1.5 rounded-[var(--vly-radius-md)] bg-[var(--vly-warning)] px-4 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"
              >
                <Plus size={16} />
                <span>Nova Ideia / Experimento</span>
              </button>
            ) : (
              <button
                onClick={() => setIsGraveModalOpen(true)}
                className="vly-interactive flex items-center gap-1.5 rounded-[var(--vly-radius-md)] bg-[var(--vly-surface-raised)] px-4 py-2 text-xs font-bold text-[var(--vly-text-primary)]"
              >
                <Plus size={16} />
                <span>Registrar Post-Mortem</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 border-b border-[var(--vly-border-subtle)] pb-1">
          <button
            onClick={() => setActiveTab("labs")}
            className={cn(
              "vly-interactive flex items-center gap-2 rounded-[var(--vly-radius-md)] px-4 py-2 text-xs font-semibold",
              activeTab === "labs"
                ? "bg-[var(--vly-warning)]/20 text-[var(--vly-warning)] border border-[var(--vly-border-warning)]"
                : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)]"
            )}
          >
            <FlaskConical size={14} />
            <span>Incubadora Labs ({labItems.filter((l) => l.stage !== "promovido").length})</span>
          </button>

          <button
            onClick={() => setActiveTab("graveyard")}
            className={cn(
              "vly-interactive flex items-center gap-2 rounded-[var(--vly-radius-md)] px-4 py-2 text-xs font-semibold",
              activeTab === "graveyard"
                ? "bg-[var(--vly-surface-active)] text-[var(--vly-text-primary)] border border-[var(--vly-border-strong)]"
                : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)]"
            )}
          >
            <Skull size={14} />
            <span>Memorial Graveyard ({graveyardItems.length})</span>
          </button>
        </div>

        {/* TAB 1: Incubadora Labs */}
        {activeTab === "labs" && (
          <div className="space-y-6">
            {/* 3 Pipeline Columns: Ideias, Experimentos, Protótipos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(["ideia", "experimento", "prototipo"] as LabStage[]).map((stage) => {
                const stageInfo = STAGE_CONFIG[stage];
                const itemsInStage = labItems.filter((l) => l.stage === stage);

                return (
                  <div key={stage} className="space-y-3">
                    <Surface tone="panel" className="flex items-center justify-between p-3">
                      <span className={cn("text-xs font-bold uppercase tracking-wider", stageInfo.text)}>
                        {stageInfo.label}
                      </span>
                      <span className="rounded border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2 py-0.5 font-mono text-xs text-[var(--vly-text-secondary)]">
                        {itemsInStage.length}
                      </span>
                    </Surface>

                    <div className="space-y-3">
                      {itemsInStage.length === 0 ? (
                        <StatePanel tone="empty" title="Nenhum item nesta etapa" description="Novas ideias e experimentos aparecerão aqui conforme forem capturados." />
                      ) : (
                        itemsInStage.map((item) => (
                          <Surface
                            key={item.id}
                            tone="panel"
                            className="group relative p-4 hover:border-[var(--vly-border-warning)] transition-all space-y-3 clip-corner-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="rounded border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--vly-text-secondary)]">
                                {item.category}
                              </span>
                              <button
                                onClick={() => deleteLabItem(item.id)}
                                className="vly-interactive p-1.5 text-[var(--vly-text-muted)] opacity-70 hover:text-[var(--vly-danger)] sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation"
                                title="Remover"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            <div>
                              <h4 className="text-xs font-bold text-[var(--vly-text-primary)] transition-colors group-hover:text-[var(--vly-warning)]">
                                {item.title}
                              </h4>
                              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[var(--vly-text-secondary)]">
                                {item.description}
                              </p>
                            </div>

                            {item.hypothesis && (
                              <div className="rounded-lg border border-[var(--vly-border-warning)] bg-[var(--vly-warning-soft)] p-2 font-mono text-[11px] text-[var(--vly-warning)]">
                                💡 {item.hypothesis}
                              </div>
                            )}

                            {/* Actions / Promote button */}
                            <div className="flex items-center justify-between gap-2 border-t border-[var(--vly-border-default)] pt-2">
                              <div className="flex items-center gap-1 flex-wrap">
                                {item.tags.map((t) => (
                                  <span key={t} className="text-[9px] text-[var(--vly-text-muted)]">#{t}</span>
                                ))}
                              </div>

                              <button
                                onClick={() => handlePromote(item.id)}
                                className="vly-interactive flex items-center gap-1 px-2.5 py-1 rounded-[var(--vly-radius-md)] text-[10px] font-bold text-[var(--vly-accent-contrast)] bg-[var(--vly-accent)] hover:bg-[var(--vly-accent-hover)] shadow-sm transition-all"
                                title="Promover para Projeto Oficial no VARYNTH"
                              >
                                <FolderPlus size={11} />
                                <span>Promote to Project</span>
                              </button>
                            </div>
                          </Surface>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Memorial Graveyard */}
        {activeTab === "graveyard" && (
          <div className="space-y-6">
            <Surface tone="panel" className="p-5 space-y-2">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--vly-text-primary)]">
                <Skull size={16} className="text-[var(--vly-text-secondary)]" />
                <span>Memorial de Projetos Descontinuados</span>
              </h3>
              <p className="text-xs leading-relaxed text-[var(--vly-text-secondary)]">
                Nenhum projeto é desperdiçado. Guardamos as razões de abandono, lições metodológicas aprendidas e trechos de código ou notas que podem ser reutilizados em iniciativas futuras.
              </p>
            </Surface>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {graveyardItems.length === 0 ? (
                <div className="col-span-2"><StatePanel tone="empty" title="Nenhum projeto no cemitério" description="Projetos descontinuados e suas lições aparecerão aqui quando forem registrados." /></div>
              ) : (
                graveyardItems.map((grave) => (
                  <Surface
                    key={grave.id}
                    tone="panel"
                    className="p-5 space-y-4 clip-corner"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="rounded border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--vly-text-secondary)]">
                          {grave.originalCategory}
                        </span>
                        <h4 className="mt-1 text-sm font-bold text-[var(--vly-text-primary)]">{grave.title}</h4>
                        <span className="font-mono text-[10px] text-[var(--vly-text-muted)]">
                          Descontinuado em {grave.abandonedAt}
                        </span>
                      </div>

                      <button
                        onClick={() => deleteGraveyardItem(grave.id)}
                        className="vly-interactive p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-danger)]"
                        title="Remover do memorial"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                       <div className="rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-2.5">
                         <span className="mb-0.5 block text-[10px] font-bold uppercase text-[var(--vly-text-secondary)]">
                          Por que comecei?
                        </span>
                         <p className="text-[var(--vly-text-secondary)]">{grave.whyStarted}</p>
                      </div>

                       <div className="rounded-lg border border-[var(--vly-border-warning)] bg-[var(--vly-warning-soft)] p-2.5">
                         <span className="mb-0.5 block text-[10px] font-bold uppercase text-[var(--vly-warning)]">
                          Por que abandonei?
                        </span>
                         <p className="text-[var(--vly-text-secondary)]">{grave.whyAbandoned}</p>
                      </div>

                       <div className="rounded-lg border border-[var(--vly-border-success)] bg-[var(--vly-success-soft)] p-2.5">
                         <span className="mb-0.5 block text-[10px] font-bold uppercase text-[var(--vly-success)]">
                          O que aprendi? (Lições)
                        </span>
                         <p className="text-[var(--vly-text-primary)]">{grave.lessonsLearned}</p>
                      </div>

                      {grave.reusableAssets && (
                        <div className="p-2.5 rounded-lg bg-[color-mix(in_srgb,var(--vly-accent)_10%,var(--vly-surface))] border border-[var(--vly-border-accent)]">
                          <span className="text-[10px] font-bold text-[var(--vly-accent)] uppercase block mb-0.5">
                            Componentes Reutilizáveis
                          </span>
                          <p className="text-[var(--vly-accent-hover)] font-mono text-[11px]">{grave.reusableAssets}</p>
                        </div>
                      )}
                    </div>
                  </Surface>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal: Nova Ideia no Labs */}
        {isLabModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--vly-overlay)] backdrop-blur-md animate-fade-in">
            <Surface tone="floating" className="w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] pb-3">
                <h2 className="text-sm font-bold text-[var(--vly-text-primary)] flex items-center gap-2">
                  <FlaskConical size={16} className="text-[var(--vly-warning)]" />
                  <span>Nova Ideia para Incubação</span>
                </h2>
                <button onClick={() => setIsLabModalOpen(false)} aria-label="Fechar modal de nova ideia" className="vly-interactive text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateLab} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Título da Ideia / Hipótese *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Graph Visualizer para Teses Jurídicas"
                    value={labTitle}
                    onChange={(e) => setLabTitle(e.target.value)}
                    className="vly-field w-full px-3 py-2 rounded-lg text-xs"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Categoria</label>
                    <select
                      value={labCategory}
                      onChange={(e) => setLabCategory(e.target.value as ProjectCategory)}
                      className="vly-field w-full px-2.5 py-2 rounded-lg text-xs"
                    >
                      <option value="software">Software</option>
                      <option value="pesquisa">Pesquisa</option>
                      <option value="estudo">Estudo</option>
                      <option value="academico">Acadêmico</option>
                      <option value="experimento">Experimento</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Etapa Inicial</label>
                    <select
                      value={labStage}
                      onChange={(e) => setLabStage(e.target.value as LabStage)}
                      className="vly-field w-full px-2.5 py-2 rounded-lg text-xs"
                    >
                      <option value="ideia">Ideia Solta</option>
                      <option value="experimento">Experimento Ativo</option>
                      <option value="prototipo">Protótipo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Descrição</label>
                  <textarea
                    rows={2}
                    placeholder="O que é esse experimento e qual problema ele aborda?"
                    value={labDesc}
                    onChange={(e) => setLabDesc(e.target.value)}
                    className="vly-field w-full px-3 py-2 rounded-lg text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Hipótese Principal</label>
                  <input
                    type="text"
                    placeholder="Ex: A visualização em grafo reduz o tempo de análise..."
                    value={labHypothesis}
                    onChange={(e) => setLabHypothesis(e.target.value)}
                    className="vly-field w-full rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    placeholder="ia, canvas, experimento"
                    value={labTags}
                    onChange={(e) => setLabTags(e.target.value)}
                    className="vly-field w-full rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--vly-border-default)]">
                  <button
                    type="button"
                    onClick={() => setIsLabModalOpen(false)}
                    className="vly-interactive px-4 py-1.5 text-xs text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="vly-interactive px-5 py-1.5 rounded-[var(--vly-radius-md)] text-xs font-bold text-[var(--vly-accent-contrast)] bg-[var(--vly-warning)] hover:bg-[var(--vly-accent-hover)]"
                  >
                    Incubar Ideia
                  </button>
                </div>
              </form>
            </Surface>
          </div>
        )}

        {/* Modal: Registrar Post-Mortem no Graveyard */}
        {isGraveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--vly-overlay)] backdrop-blur-md animate-fade-in">
            <Surface tone="floating" className="w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] pb-3">
                <h2 className="text-sm font-bold text-[var(--vly-text-primary)] flex items-center gap-2">
                  <Skull size={16} className="text-[var(--vly-text-secondary)]" />
                  <span>Registrar Post-Mortem (Graveyard)</span>
                </h2>
                <button onClick={() => setIsGraveModalOpen(false)} className="vly-interactive text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateGraveyard} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Nome do Projeto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bot de Notícias no Telegram"
                    value={graveTitle}
                    onChange={(e) => setGraveTitle(e.target.value)}
                    className="vly-field w-full rounded-lg px-3 py-2 text-xs"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Por que começou? *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Qual era o objetivo original?"
                    value={graveWhyStarted}
                    onChange={(e) => setGraveWhyStarted(e.target.value)}
                    className="vly-field w-full resize-none rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Por que abandonou? *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Qual foi o gargalo ou mudança de prioridade?"
                    value={graveWhyAbandoned}
                    onChange={(e) => setGraveWhyAbandoned(e.target.value)}
                    className="vly-field w-full resize-none rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">O que aprendeu? (Lições) *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Principais aprendizados técnicos ou estratégicos..."
                    value={graveLessons}
                    onChange={(e) => setGraveLessons(e.target.value)}
                    className="vly-field w-full resize-none rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Componentes Reutilizáveis (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Scripts de parser, templates de markdown..."
                    value={graveAssets}
                    onChange={(e) => setGraveAssets(e.target.value)}
                    className="vly-field w-full rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--vly-border-default)]">
                  <button
                    type="button"
                    onClick={() => setIsGraveModalOpen(false)}
                    className="vly-interactive px-4 py-1.5 text-xs text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="vly-interactive px-5 py-1.5 rounded-[var(--vly-radius-md)] text-xs font-bold text-[var(--vly-text-primary)] bg-[var(--vly-surface-active)] hover:bg-[var(--vly-surface-hover)] border border-[var(--vly-border-default)]"
                  >
                    Salvar no Memorial
                  </button>
                </div>
              </form>
            </Surface>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
