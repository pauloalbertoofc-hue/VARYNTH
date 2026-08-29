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

type CodexTab = "arena" | "materias";

export default function CodexPage() {
  const { theses, addThesis, updateThesis, deleteThesis } = useVarynthStore();

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
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Scale size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Codex & Argument Arena
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Construtor dialético de teses, confronto de precedentes, doutrina e fichamentos por matérias.
            </p>
          </div>

          <button
            onClick={() => setIsThesisModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 glow-accent transition-all duration-200"
          >
            <Plus size={16} />
            <span>Nova Tese na Arena</span>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 border-b border-[#1e1e30] pb-1">
          <button
            onClick={() => setActiveTab("arena")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              activeTab === "arena"
                ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            )}
          >
            <Swords size={14} />
            <span>Argument Arena ({theses.length} Teses)</span>
          </button>

          <button
            onClick={() => setActiveTab("materias")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
              activeTab === "materias"
                ? "bg-violet-600/20 text-violet-300 border border-violet-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            )}
          >
            <GraduationCap size={14} />
            <span>Matérias & Fichamentos</span>
          </button>
        </div>

        {/* TAB 1: Argument Arena */}
        {activeTab === "arena" && (
          <div className="space-y-6">
            {theses.length === 0 ? (
              <div className="py-16 text-center rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3">
                <Scale size={36} className="mx-auto text-slate-600" />
                <p className="text-sm font-semibold text-slate-300">Nenhuma tese jurídica na Arena</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Crie sua primeira tese dialética para estruturar argumentos a favor, contra e precedentes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Thesis Selector (4 cols) */}
                <div className="lg:col-span-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Teses Registradas
                    </span>
                    <span className="text-xs text-slate-500">{theses.length} ativas</span>
                  </div>

                  <div className="space-y-2">
                    {theses.map((t) => {
                      const isSelected = t.id === activeThesis?.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedThesisId(t.id)}
                          className={cn(
                            "p-3.5 rounded-xl border text-left cursor-pointer transition-all clip-corner-sm",
                            isSelected
                              ? "bg-cyan-950/30 border-cyan-500/50 shadow-sm"
                              : "bg-[#0f0f1a] border-[#1e1e30] hover:border-slate-700"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] px-2 py-0.2 rounded bg-[#14141f] text-cyan-400 border border-cyan-500/20 font-semibold uppercase">
                              {t.area}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteThesis(t.id);
                              }}
                              className="p-1 text-slate-500 hover:text-red-400"
                              title="Remover tese"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                          <h4 className="text-xs font-bold text-slate-100 line-clamp-1">{t.title}</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{t.question}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Arena Board (8 cols) */}
                {activeThesis && (
                  <div className="lg:col-span-8 space-y-6">
                    {/* Active Question Banner */}
                    <div className="p-5 rounded-xl bg-[#0f0f1a] border border-cyan-500/30 space-y-2 clip-corner">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase tracking-wider">
                          {activeThesis.area}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Status: {activeThesis.status.toUpperCase()}
                        </span>
                      </div>

                      <h2 className="text-sm sm:text-base font-black text-white">{activeThesis.title}</h2>
                      <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-cyan-200/90 font-medium leading-relaxed">
                        ⚖️ <span className="font-semibold text-white">Questão Central:</span> {activeThesis.question}
                      </div>
                    </div>

                    {/* Dialectical Arena Columns (Pros vs Cons) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* PROS */}
                      <div className="p-4 rounded-xl bg-[#0f0f1a] border border-emerald-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck size={14} />
                            <span>Argumentos a Favor ({activeThesis.pros.length})</span>
                          </span>
                        </div>

                        <div className="space-y-2">
                          {activeThesis.pros.map((p) => (
                            <div
                              key={p.id}
                              className="p-3 rounded-lg bg-[#14141f] border border-emerald-500/15 text-xs text-slate-200 leading-relaxed"
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
                            className="flex-1 px-2.5 py-1 rounded bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                          >
                            +
                          </button>
                        </form>
                      </div>

                      {/* CONS */}
                      <div className="p-4 rounded-xl bg-[#0f0f1a] border border-red-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle size={14} />
                            <span>Argumentos Contra ({activeThesis.cons.length})</span>
                          </span>
                        </div>

                        <div className="space-y-2">
                          {activeThesis.cons.map((c) => (
                            <div
                              key={c.id}
                              className="p-3 rounded-lg bg-[#14141f] border border-red-500/15 text-xs text-slate-200 leading-relaxed"
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
                            className="flex-1 px-2.5 py-1 rounded bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none focus:border-red-500/50"
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-xs font-bold text-white"
                          >
                            +
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Precedents & Doctrine */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Precedents */}
                      <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-2">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Precedentes & Jurisprudência (STF/STJ)
                        </span>
                        <div className="space-y-1.5">
                          {activeThesis.precedents.map((prec, i) => (
                            <div key={i} className="p-2 rounded bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-300">
                              🏛️ {prec}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Doctrine */}
                      <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-2">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Doutrina Aplicável
                        </span>
                        <div className="space-y-1.5">
                          {activeThesis.doctrine.map((doc, i) => (
                            <div key={i} className="p-2 rounded bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-300">
                              📖 {doc}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Synthesis / Personal Conclusion */}
                    <div className="p-5 rounded-xl bg-[#0f0f1a] border border-violet-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                          <FileCheck size={15} />
                          <span>Síntese Hermenêutica & Conclusão Pessoal</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed bg-[#0a0a0f] p-3.5 rounded-lg border border-[#1e1e30] whitespace-pre-wrap">
                        {activeThesis.conclusion}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Matérias & Fichamentos */}
        {activeTab === "materias" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Direito Digital & IA", prof: "Dr. Roberto Silva", count: 12, tags: ["ia", "lgpd", "marco-civil"] },
              { name: "Direito Constitucional", prof: "Profa. Cláudia", count: 18, tags: ["controle-constitucionalidade", "direitos-fundamentais"] },
              { name: "Direito Civil & Obrigações", prof: "Dr. Marcelo", count: 14, tags: ["contratos", "responsabilidade-civil"] },
              { name: "Direito Processual Civil", prof: "Dr. Fernando", count: 9, tags: ["recursos", "tutela-provisoria"] },
              { name: "Filosofia & Teoria do Direito", prof: "Dr. André", count: 11, tags: ["hermeneutica", "positivismo", "pos-positivismo"] },
            ].map((mat) => (
              <div
                key={mat.name}
                className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-violet-500/40 transition-all space-y-3 clip-corner"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs">
                    <BookOpen size={14} />
                  </div>
                  <span className="text-xs font-mono text-violet-400 font-bold">{mat.count} fichamentos</span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-100">{mat.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{mat.prof}</p>
                </div>

                <div className="flex items-center gap-1 flex-wrap pt-2 border-t border-[#1e1e30]">
                  {mat.tags.map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.2 rounded bg-[#14141f] text-slate-400">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Nova Tese */}
        {isThesisModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-xl bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#1e1e30] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Swords size={16} className="text-cyan-400" />
                  <span>Estruturar Tese na Argument Arena</span>
                </h2>
                <button onClick={() => setIsThesisModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateThesis} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Título da Tese *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Responsabilidade Civil de Agentes Autônomos de IA"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Área do Direito</label>
                  <input
                    type="text"
                    placeholder="Ex: Direito Digital, Direito Constitucional"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Questão Central Controversa *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Qual a controvérsia jurídica a ser resolvida dialeticamente?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-400 uppercase block mb-1">Argumento Pró (A Favor)</label>
                    <textarea
                      rows={2}
                      placeholder="Principal fundamento a favor..."
                      value={initialPro}
                      onChange={(e) => setInitialPro(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-red-400 uppercase block mb-1">Argumento Contra</label>
                    <textarea
                      rows={2}
                      placeholder="Principal risco ou contra-argumento..."
                      value={initialCon}
                      onChange={(e) => setInitialCon(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Precedente (STF/STJ)</label>
                    <input
                      type="text"
                      placeholder="Ex: STF REsp 12345..."
                      value={precedent}
                      onChange={(e) => setPrecedent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Doutrina</label>
                    <input
                      type="text"
                      placeholder="Ex: Pontes de Miranda..."
                      value={doctrine}
                      onChange={(e) => setDoctrine(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-violet-400 uppercase block mb-1">Síntese / Conclusão</label>
                  <textarea
                    rows={2}
                    placeholder="Sua posição consolidada sobre a matéria..."
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1e1e30]">
                  <button
                    type="button"
                    onClick={() => setIsThesisModalOpen(false)}
                    className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 glow-accent"
                  >
                    Entrar na Arena
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
