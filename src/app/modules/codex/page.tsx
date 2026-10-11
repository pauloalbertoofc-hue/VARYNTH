"use client";

import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { ArgumentThesis, ArgumentPoint } from "@/lib/types";
import {
  Scale,
  Swords,
  BookMarked,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  GraduationCap,
  Layers,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatePanel } from "@/components/ui/StatePanel";
import { Surface } from "@/components/ui/Surface";

type CodexTab = "arena" | "materias";

export default function CodexPage() {
  const { theses, notes, vaultItems, addThesis, updateThesis, deleteThesis } = useVarynthStore();

  const [activeTab, setActiveTab] = useState<CodexTab>("arena");
  const [selectedThesisId, setSelectedThesisId] = useState<string>(theses[0]?.id || "");

  // Thesis modal
  const [isThesisModalOpen, setIsThesisModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("Direito Digital & Civil");
  const [question, setQuestion] = useState("");
  const [initialPro, setInitialPro] = useState("");
  const [initialCon, setInitialCon] = useState("");
  const [precedent, setPrecedent] = useState("");
  const [doctrine, setDoctrine] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [tags, setTags] = useState("");

  // New argument input within selected thesis
  const [newProText, setNewProText] = useState("");
  const [newConText, setNewConText] = useState("");

  const activeThesis = theses.find((t) => t.id === selectedThesisId) || theses[0];

  const handleCreateThesis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !question.trim()) return;

    const tagsArray = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const newT = addThesis({
      title: title.trim(),
      area: area.trim(),
      question: question.trim(),
      pros: initialPro.trim() ? [{ id: "p-" + Date.now(), statement: initialPro.trim() }] : [],
      cons: initialCon.trim() ? [{ id: "c-" + Date.now(), statement: initialCon.trim() }] : [],
      precedents: precedent.trim() ? [precedent.trim()] : [],
      doctrine: doctrine.trim() ? [doctrine.trim()] : [],
      counterArguments: [],
      conclusion: conclusion.trim() || "Síntese hermenêutica em elaboração...",
      tags: tagsArray.length ? tagsArray : ["tese"],
      status: "em_elaboracao",
    });

    setSelectedThesisId(newT.id);
    setTitle("");
    setQuestion("");
    setInitialPro("");
    setInitialCon("");
    setPrecedent("");
    setDoctrine("");
    setConclusion("");
    setTags("");
    setIsThesisModalOpen(false);
  };

  const handleAddPro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProText.trim() || !activeThesis) return;

    const updatedPros = [
      ...activeThesis.pros,
      { id: "p-" + Date.now(), statement: newProText.trim() },
    ];
    updateThesis(activeThesis.id, { pros: updatedPros });
    setNewProText("");
  };

  const handleAddCon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConText.trim() || !activeThesis) return;

    const updatedCons = [
      ...activeThesis.cons,
      { id: "c-" + Date.now(), statement: newConText.trim() },
    ];
    updateThesis(activeThesis.id, { cons: updatedCons });
    setNewConText("");
  };

  return (
    <PageLayout title="Codex" subtitle="Ambiente jurídico e Argument Arena dialética">
      <div className="vly-enter space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--vly-info)_16%,transparent)] border border-[color-mix(in_srgb,var(--vly-info)_30%,transparent)] flex items-center justify-center text-[var(--vly-info)]">
                <Scale size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[var(--vly-text-primary)] tracking-tight">
                Codex & Argument Arena
              </h1>
            </div>
            <p className="text-xs text-[var(--vly-text-secondary)] mt-1">
              Construtor dialético de teses, confronto de precedentes, doutrina e fichamentos por matérias.
            </p>
          </div>

          <button
            onClick={() => setIsThesisModalOpen(true)}
            className="vly-interactive flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--vly-info)] text-[var(--vly-accent-contrast)] glow-accent"
          >
            <Plus size={16} />
            <span>Nova Tese na Arena</span>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 border-b border-[var(--vly-border-subtle)] pb-1" role="tablist" aria-label="Seções do Codex">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "arena"}
            aria-controls="codex-arena-panel"
            onClick={() => setActiveTab("arena")}
            className={cn(
              "vly-interactive flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold",
              activeTab === "arena"
                ? "bg-[color-mix(in_srgb,var(--vly-info)_16%,transparent)] text-[var(--vly-info)] border border-[color-mix(in_srgb,var(--vly-info)_40%,transparent)]"
                : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)]"
            )}
          >
            <Swords size={14} />
            <span>Argument Arena ({theses.length} Teses)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "materias"}
            aria-controls="codex-materias-panel"
            onClick={() => setActiveTab("materias")}
            className={cn(
              "vly-interactive flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold",
              activeTab === "materias"
                ? "bg-[color-mix(in_srgb,var(--vly-accent)_16%,transparent)] text-[var(--vly-accent)] border border-[color-mix(in_srgb,var(--vly-accent)_40%,transparent)]"
                : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)]"
            )}
          >
            <GraduationCap size={14} />
            <span>Matérias & Fichamentos</span>
          </button>
        </div>

        {/* TAB 1: Argument Arena */}
        {activeTab === "arena" && (
          <div id="codex-arena-panel" className="space-y-6" role="tabpanel" aria-label="Argument Arena">
            {theses.length === 0 ? (
              <StatePanel
                tone="empty"
                title="Nenhuma tese jurídica na Arena"
                description="Crie sua primeira tese dialética para estruturar argumentos a favor, contra e precedentes."
                action={<button type="button" onClick={() => setIsThesisModalOpen(true)} className="vly-interactive rounded-lg bg-[var(--vly-info)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]">Criar tese</button>}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Thesis Selector (4 cols) */}
                <div className="lg:col-span-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--vly-text-secondary)] uppercase tracking-wider">
                      Teses Registradas
                    </span>
                    <span className="text-xs text-[var(--vly-text-muted)]">{theses.length} ativas</span>
                  </div>

                  <div className="space-y-2">
                    {theses.map((t) => {
                      const isSelected = t.id === activeThesis?.id;
                      return (
                        <Surface
                          key={t.id}
                          onClick={() => setSelectedThesisId(t.id)}
                          className={cn(
                            "p-3.5 rounded-xl border text-left cursor-pointer transition-all clip-corner-sm",
                            isSelected
                              ? "bg-[color-mix(in_srgb,var(--vly-info)_12%,transparent)] border-[color-mix(in_srgb,var(--vly-info)_50%,transparent)] shadow-sm"
                              : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] hover:border-[var(--vly-border-strong)]"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] px-2 py-0.2 rounded bg-[var(--vly-surface)] text-[var(--vly-info)] border border-[color-mix(in_srgb,var(--vly-info)_20%,transparent)] font-semibold uppercase">
                              {t.area}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteThesis(t.id);
                              }}
                              type="button"
                              aria-label={`Remover tese ${t.title}`}
                              className="p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-danger)]"
                              title="Remover tese"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                          <h4 className="text-xs font-bold text-[var(--vly-text-primary)] line-clamp-1">{t.title}</h4>
                          <p className="text-[11px] text-[var(--vly-text-secondary)] line-clamp-2 mt-1">{t.question}</p>
                        </Surface>
                      );
                    })}
                  </div>
                </div>

                {/* Right Arena Board (8 cols) */}
                {activeThesis && (
                  <div className="lg:col-span-8 space-y-6">
                    {/* Active Question Banner */}
                    <Surface tone="panel" className="p-5 rounded-xl border-[color-mix(in_srgb,var(--vly-info)_30%,transparent)] space-y-2 clip-corner">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--vly-info)_10%,transparent)] text-[var(--vly-info)] border border-[color-mix(in_srgb,var(--vly-info)_20%,transparent)] font-bold uppercase tracking-wider">
                          {activeThesis.area}
                        </span>
                        <span className="text-[10px] text-[var(--vly-text-secondary)] font-mono">
                          Status: {activeThesis.status.toUpperCase()}
                        </span>
                      </div>

                      <h2 className="text-sm sm:text-base font-black text-[var(--vly-text-primary)]">{activeThesis.title}</h2>
                      <div className="p-3 rounded-lg bg-[var(--vly-world)] border border-[var(--vly-border-subtle)] text-xs text-cyan-200/90 font-medium leading-relaxed">
                        ⚖️ <span className="font-semibold text-[var(--vly-text-primary)]">Questão Central:</span> {activeThesis.question}
                      </div>
                    </Surface>

                    {/* Dialectical Arena Columns (Pros vs Cons) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* PROS */}
                      <Surface tone="panel" className="p-4 border-[color-mix(in_srgb,var(--vly-success)_20%,transparent)] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--vly-success)] uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck size={14} />
                            <span>Argumentos a Favor ({activeThesis.pros.length})</span>
                          </span>
                        </div>

                        <div className="space-y-2">
                          {activeThesis.pros.map((p) => (
                            <div
                              key={p.id}
                              className="p-3 rounded-lg bg-[var(--vly-surface-raised)] border border-[color-mix(in_srgb,var(--vly-success)_15%,transparent)] text-xs text-[var(--vly-text-primary)] leading-relaxed"
                            >
                              ✓ {p.statement}
                            </div>
                          ))}
                        </div>

                        <form onSubmit={handleAddPro} className="flex gap-1.5 pt-2">
                          <input
                            type="text"
                            placeholder="Adicionar argumento pró..."
                            value={newProText}
                            onChange={(e) => setNewProText(e.target.value)}
                            aria-label="Novo argumento a favor"
                            className="vly-field min-h-0 flex-1 px-2.5 py-1 rounded text-xs"
                          />
                          <button
                            type="submit"
                            className="vly-interactive px-2.5 py-1 rounded bg-[var(--vly-success)] hover:brightness-110 text-xs font-bold text-[var(--vly-accent-contrast)]"
                          >
                            +
                          </button>
                        </form>
                      </Surface>

                      {/* CONS */}
                      <Surface tone="panel" className="p-4 border-[color-mix(in_srgb,var(--vly-danger)_20%,transparent)] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--vly-danger)] uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle size={14} />
                            <span>Argumentos Contra ({activeThesis.cons.length})</span>
                          </span>
                        </div>

                        <div className="space-y-2">
                          {activeThesis.cons.map((c) => (
                            <div
                              key={c.id}
                              className="p-3 rounded-lg bg-[var(--vly-surface-raised)] border border-[color-mix(in_srgb,var(--vly-danger)_15%,transparent)] text-xs text-[var(--vly-text-primary)] leading-relaxed"
                            >
                              ✕ {c.statement}
                            </div>
                          ))}
                        </div>

                        <form onSubmit={handleAddCon} className="flex gap-1.5 pt-2">
                          <input
                            type="text"
                            placeholder="Adicionar argumento contra..."
                            value={newConText}
                            onChange={(e) => setNewConText(e.target.value)}
                            aria-label="Novo argumento contra"
                            className="vly-field min-h-0 flex-1 px-2.5 py-1 rounded text-xs"
                          />
                          <button
                            type="submit"
                            className="vly-interactive px-2.5 py-1 rounded bg-[var(--vly-danger)] hover:brightness-110 text-xs font-bold text-[var(--vly-accent-contrast)]"
                          >
                            +
                          </button>
                        </form>
                      </Surface>
                    </div>

                    {/* Precedents & Doctrine */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Precedents */}
                      <Surface tone="panel" className="p-4 space-y-2">
                        <span className="text-xs font-bold text-[var(--vly-text-secondary)] uppercase tracking-wider block">
                          Precedentes & Jurisprudência (STF/STJ)
                        </span>
                        <div className="space-y-1.5">
                          {activeThesis.precedents.map((prec, i) => (
                            <div key={i} className="p-2 rounded bg-[var(--vly-surface-raised)] border border-[var(--vly-border-subtle)] text-xs text-[var(--vly-text-secondary)]">
                              🏛️ {prec}
                            </div>
                          ))}
                        </div>
                      </Surface>

                      {/* Doctrine */}
                      <Surface tone="panel" className="p-4 space-y-2">
                        <span className="text-xs font-bold text-[var(--vly-text-secondary)] uppercase tracking-wider block">
                          Doutrina Aplicável
                        </span>
                        <div className="space-y-1.5">
                          {activeThesis.doctrine.map((doc, i) => (
                            <div key={i} className="p-2 rounded bg-[var(--vly-surface-raised)] border border-[var(--vly-border-subtle)] text-xs text-[var(--vly-text-secondary)]">
                              📖 {doc}
                            </div>
                          ))}
                        </div>
                      </Surface>
                    </div>

                    {/* Synthesis / Personal Conclusion */}
                    <Surface tone="panel" className="p-5 border-[color-mix(in_srgb,var(--vly-accent)_30%,transparent)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--vly-accent)] uppercase tracking-wider flex items-center gap-1.5">
                          <FileCheck size={15} />
                          <span>Síntese Hermenêutica & Conclusão Pessoal</span>
                        </span>
                      </div>
                      <p className="text-xs text-[var(--vly-text-primary)] leading-relaxed bg-[var(--vly-surface)] p-3.5 rounded-lg border border-[var(--vly-border-subtle)] whitespace-pre-wrap">
                        {activeThesis.conclusion}
                      </p>
                    </Surface>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Matérias & Fichamentos */}
        {activeTab === "materias" && (
          <div id="codex-materias-panel" className="space-y-4" role="tabpanel" aria-label="Matérias e fichamentos">
            {notes.length === 0 && vaultItems.length === 0 ? (
              <StatePanel
                tone="empty"
                title="Nenhuma matéria ou fichamento cadastrado"
                description="Crie notas ou catalogação no Vault para categorizar seus fichamentos dogmáticos por disciplina."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from(new Set([...notes.flatMap((n) => n.tags), ...vaultItems.flatMap((v) => v.tags)])).map((tag) => {
                  const tagNotes = notes.filter((n) => n.tags.includes(tag));
                  const tagVault = vaultItems.filter((v) => v.tags.includes(tag));
                  const total = tagNotes.length + tagVault.length;

                  return (
                    <Surface tone="panel"
                      key={tag}
                      className="p-5 hover:border-[color-mix(in_srgb,var(--vly-accent)_40%,transparent)] transition-all space-y-3 clip-corner"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--vly-accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--vly-accent)_20%,transparent)] flex items-center justify-center text-[var(--vly-accent)] font-bold text-xs">
                          <BookOpen size={14} />
                        </div>
                        <span className="text-xs font-mono text-[var(--vly-accent)] font-bold">{total} itens</span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-[var(--vly-text-primary)] capitalize">#{tag}</h4>
                        <p className="text-xs text-[var(--vly-text-secondary)] mt-0.5">{tagNotes.length} notas · {tagVault.length} obras</p>
                      </div>
                    </Surface>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal: Nova Tese */}
        {isThesisModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--vly-world)_78%,transparent)] backdrop-blur-md animate-fade-in" role="presentation">
            <Surface tone="floating" role="dialog" aria-modal="true" aria-labelledby="codex-thesis-dialog-title" className="w-full max-w-xl p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] pb-3">
                <h2 id="codex-thesis-dialog-title" className="text-sm font-bold text-[var(--vly-text-primary)] flex items-center gap-2">
                  <Swords size={16} className="text-[var(--vly-info)]" />
                  <span>Estruturar Tese na Argument Arena</span>
                </h2>
                <button type="button" aria-label="Fechar criação de tese" onClick={() => setIsThesisModalOpen(false)} className="text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateThesis} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Título da Tese *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Responsabilidade Civil de Agentes Autônomos de IA"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="vly-field w-full text-xs"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Área do Direito</label>
                  <input
                    type="text"
                    placeholder="Ex: Direito Digital, Direito Constitucional"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="vly-field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Questão Central Controversa *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Qual a controvérsia jurídica a ser resolvida dialeticamente?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="vly-field w-full text-xs resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-success)] uppercase block mb-1">Argumento Pró (A Favor)</label>
                    <textarea
                      rows={2}
                      placeholder="Principal fundamento a favor..."
                      value={initialPro}
                      onChange={(e) => setInitialPro(e.target.value)}
                      className="vly-field w-full text-xs resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-danger)] uppercase block mb-1">Argumento Contra</label>
                    <textarea
                      rows={2}
                      placeholder="Principal risco ou contra-argumento..."
                      value={initialCon}
                      onChange={(e) => setInitialCon(e.target.value)}
                      className="vly-field w-full text-xs resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Precedente (STF/STJ)</label>
                    <input
                      type="text"
                      placeholder="Ex: STF REsp 12345..."
                      value={precedent}
                      onChange={(e) => setPrecedent(e.target.value)}
                      className="vly-field w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Doutrina</label>
                    <input
                      type="text"
                      placeholder="Ex: Pontes de Miranda..."
                      value={doctrine}
                      onChange={(e) => setDoctrine(e.target.value)}
                      className="vly-field w-full text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-accent)] uppercase block mb-1">Síntese / Conclusão</label>
                  <textarea
                    rows={2}
                    placeholder="Sua posição consolidada sobre a matéria..."
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                    className="vly-field w-full text-xs resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--vly-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setIsThesisModalOpen(false)}
                    className="px-4 py-1.5 text-xs text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="vly-interactive px-5 py-1.5 rounded-lg text-xs font-bold text-[var(--vly-accent-contrast)] bg-[var(--vly-info)] hover:brightness-110 glow-accent"
                  >
                    Entrar na Arena
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
