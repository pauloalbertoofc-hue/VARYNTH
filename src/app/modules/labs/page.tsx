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

type ActiveTab = "labs" | "graveyard";

const STAGE_CONFIG: Record<LabStage, { label: string; bg: string; text: string; border: string }> = {
  ideia: { label: "Ideia Solta", bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  experimento: { label: "Experimento Ativo", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  prototipo: { label: "Protótipo Maduro", bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
  promovido: { label: "Promovido a Projeto", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
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
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <FlaskConical size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Labs & Memorial Graveyard
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Pipeline de inovação: Ideia → Experimento → Protótipo → Projeto, e memorial de lições aprendidas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "labs" ? (
              <button
                onClick={() => setIsLabModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-all"
              >
                <Plus size={16} />
                <span>Nova Ideia / Experimento</span>
              </button>
            ) : (
              <button
                onClick={() => setIsGraveModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-700 hover:bg-slate-600 transition-all"
              >
                <Plus size={16} />
                <span>Registrar Post-Mortem</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 border-b border-[#1e1e30] pb-1">
          <button
            onClick={() => setActiveTab("labs")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              activeTab === "labs"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            )}
          >
            <FlaskConical size={14} />
            <span>Incubadora Labs ({labItems.filter((l) => l.stage !== "promovido").length})</span>
          </button>

          <button
            onClick={() => setActiveTab("graveyard")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              activeTab === "graveyard"
                ? "bg-slate-700/40 text-slate-200 border border-slate-600"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
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
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]">
                      <span className={cn("text-xs font-bold uppercase tracking-wider", stageInfo.text)}>
                        {stageInfo.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#14141f] text-slate-400 font-mono">
                        {itemsInStage.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {itemsInStage.length === 0 ? (
                        <div className="py-10 text-center rounded-xl bg-[#0f0f1a]/50 border border-[#1e1e30] text-slate-600 text-xs">
                          Nenhum item nesta etapa.
                        </div>
                      ) : (
                        itemsInStage.map((item) => (
                          <div
                            key={item.id}
                            className="group relative p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-amber-500/40 transition-all space-y-3 clip-corner-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-[#14141f] text-slate-400 border border-[#1e1e30] uppercase font-semibold">
                                {item.category}
                              </span>
                              <button
                                onClick={() => deleteLabItem(item.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                                title="Remover"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <div>
                              <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                                {item.title}
                              </h4>
                              <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">
                                {item.description}
                              </p>
                            </div>

                            {item.hypothesis && (
                              <div className="p-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-[11px] text-amber-300/90 font-mono">
                                💡 {item.hypothesis}
                              </div>
                            )}

                            {/* Actions / Promote button */}
                            <div className="pt-2 border-t border-[#1e1e30] flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1 flex-wrap">
                                {item.tags.map((t) => (
                                  <span key={t} className="text-[9px] text-slate-500">#{t}</span>
                                ))}
                              </div>

                              <button
                                onClick={() => handlePromote(item.id)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 shadow-sm transition-all"
                                title="Promover para Projeto Oficial no VARYNTH"
                              >
                                <FolderPlus size={11} />
                                <span>Promote to Project</span>
                              </button>
                            </div>
                          </div>
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
            <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Skull size={16} className="text-slate-400" />
                <span>Memorial de Projetos Descontinuados</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nenhum projeto é desperdiçado. Guardamos as razões de abandono, lições metodológicas aprendidas e trechos de código ou notas que podem ser reutilizados em iniciativas futuras.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {graveyardItems.length === 0 ? (
                <div className="col-span-2 py-12 text-center rounded-xl bg-[#0f0f1a] border border-[#1e1e30] text-slate-500 text-xs">
                  Nenhum projeto no cemitério.
                </div>
              ) : (
                graveyardItems.map((grave) => (
                  <div
                    key={grave.id}
                    className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-4 clip-corner"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-semibold">
                          {grave.originalCategory}
                        </span>
                        <h4 className="text-sm font-bold text-slate-200 mt-1">{grave.title}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Descontinuado em {grave.abandonedAt}
                        </span>
                      </div>

                      <button
                        onClick={() => deleteGraveyardItem(grave.id)}
                        className="p-1 text-slate-500 hover:text-red-400"
                        title="Remover do memorial"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="p-2.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                          Por que comecei?
                        </span>
                        <p className="text-slate-300">{grave.whyStarted}</p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30]">
                        <span className="text-[10px] font-bold text-amber-400 uppercase block mb-0.5">
                          Por que abandonei?
                        </span>
                        <p className="text-slate-300">{grave.whyAbandoned}</p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-0.5">
                          O que aprendi? (Lições)
                        </span>
                        <p className="text-slate-200">{grave.lessonsLearned}</p>
                      </div>

                      {grave.reusableAssets && (
                        <div className="p-2.5 rounded-lg bg-violet-950/20 border border-violet-500/20">
                          <span className="text-[10px] font-bold text-violet-400 uppercase block mb-0.5">
                            Componentes Reutilizáveis
                          </span>
                          <p className="text-violet-200 font-mono text-[11px]">{grave.reusableAssets}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal: Nova Ideia no Labs */}
        {isLabModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-lg bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e1e30] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <FlaskConical size={16} className="text-amber-400" />
                  <span>Nova Ideia para Incubação</span>
                </h2>
                <button onClick={() => setIsLabModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateLab} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Título da Ideia / Hipótese *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Graph Visualizer para Teses Jurídicas"
                    value={labTitle}
                    onChange={(e) => setLabTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Categoria</label>
                    <select
                      value={labCategory}
                      onChange={(e) => setLabCategory(e.target.value as ProjectCategory)}
                      className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="software">Software</option>
                      <option value="pesquisa">Pesquisa</option>
                      <option value="estudo">Estudo</option>
                      <option value="academico">Acadêmico</option>
                      <option value="experimento">Experimento</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Etapa Inicial</label>
                    <select
                      value={labStage}
                      onChange={(e) => setLabStage(e.target.value as LabStage)}
                      className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="ideia">Ideia Solta</option>
                      <option value="experimento">Experimento Ativo</option>
                      <option value="prototipo">Protótipo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Descrição</label>
                  <textarea
                    rows={2}
                    placeholder="O que é esse experimento e qual problema ele aborda?"
                    value={labDesc}
                    onChange={(e) => setLabDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Hipótese Principal</label>
                  <input
                    type="text"
                    placeholder="Ex: A visualização em grafo reduz o tempo de análise..."
                    value={labHypothesis}
                    onChange={(e) => setLabHypothesis(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    placeholder="ia, canvas, experimento"
                    value={labTags}
                    onChange={(e) => setLabTags(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1e1e30]">
                  <button
                    type="button"
                    onClick={() => setIsLabModalOpen(false)}
                    className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-500"
                  >
                    Incubar Ideia
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Registrar Post-Mortem no Graveyard */}
        {isGraveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-lg bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e1e30] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Skull size={16} className="text-slate-400" />
                  <span>Registrar Post-Mortem (Graveyard)</span>
                </h2>
                <button onClick={() => setIsGraveModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateGraveyard} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Nome do Projeto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bot de Notícias no Telegram"
                    value={graveTitle}
                    onChange={(e) => setGraveTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Por que começou? *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Qual era o objetivo original?"
                    value={graveWhyStarted}
                    onChange={(e) => setGraveWhyStarted(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Por que abandonou? *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Qual foi o gargalo ou mudança de prioridade?"
                    value={graveWhyAbandoned}
                    onChange={(e) => setGraveWhyAbandoned(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">O que aprendeu? (Lições) *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Principais aprendizados técnicos ou estratégicos..."
                    value={graveLessons}
                    onChange={(e) => setGraveLessons(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Componentes Reutilizáveis (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Scripts de parser, templates de markdown..."
                    value={graveAssets}
                    onChange={(e) => setGraveAssets(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1e1e30]">
                  <button
                    type="button"
                    onClick={() => setIsGraveModalOpen(false)}
                    className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-700 hover:bg-slate-600"
                  >
                    Salvar no Memorial
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
