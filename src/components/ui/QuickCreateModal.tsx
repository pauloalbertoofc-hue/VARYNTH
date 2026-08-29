"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckSquare,
  FolderPlus,
  Lightbulb,
  BookOpen,
  Users,
  X,
  Sparkles,
  Plus,
  Scale,
  GraduationCap,
  Trophy,
} from "lucide-react";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import {
  ProjectCategory,
  PriorityLevel,
  VaultItemType,
  EvidenceStrength,
  PaperSection,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type QuickCreateTab =
  | "task"
  | "note"
  | "project"
  | "thesis"
  | "evidence"
  | "opportunity"
  | "vault"
  | "idea"
  | "person";

export function QuickCreateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<QuickCreateTab>("task");
  const router = useRouter();

  const {
    projects,
    addTask,
    addNote,
    addProject,
    addThesis,
    addEvidence,
    addOpportunity,
    addVaultItem,
    addLabItem,
    addPerson,
  } = useVarynthStore();

  // Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>("media");
  const [taskDueDate, setTaskDueDate] = useState("");

  // Note
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteProject, setNoteProject] = useState("");

  // Project
  const [projTitle, setProjTitle] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projCategory, setProjCategory] = useState<ProjectCategory>("software");

  // Thesis
  const [thesisTitle, setThesisTitle] = useState("");
  const [thesisArea, setThesisArea] = useState("Direito Digital");
  const [thesisQuestion, setThesisQuestion] = useState("");

  // Evidence
  const [eviClaim, setEviClaim] = useState("");
  const [eviSource, setEviSource] = useState("");
  const [eviQuote, setEviQuote] = useState("");
  const [eviStrength, setEviStrength] = useState<EvidenceStrength>("forte");
  const [eviSection, setEviSection] = useState<PaperSection>("discussao");

  // Opportunity
  const [oppTitle, setOppTitle] = useState("");
  const [oppInst, setOppInst] = useState("");
  const [oppDeadline, setOppDeadline] = useState("");
  const [oppPrize, setOppPrize] = useState("");

  // Vault
  const [vaultTitle, setVaultTitle] = useState("");
  const [vaultType, setVaultType] = useState<VaultItemType>("artigo");

  // Lab Idea
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDesc, setIdeaDesc] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = (e: CustomEvent) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
      setIsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-quick-create" as unknown as keyof WindowEventMap, handleCustomOpen as EventListener);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-quick-create" as unknown as keyof WindowEventMap, handleCustomOpen as EventListener);
    };
  }, [isOpen]);

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    addTask({
      title: taskTitle.trim(),
      description: taskDesc.trim() || undefined,
      projectId: taskProject || undefined,
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
      status: "a_fazer",
    });

    setTaskTitle("");
    setTaskDesc("");
    setIsOpen(false);
  };

  const handleSubmitThesis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thesisTitle.trim() || !thesisQuestion.trim()) return;

    addThesis({
      title: thesisTitle.trim(),
      area: thesisArea.trim(),
      question: thesisQuestion.trim(),
      pros: [],
      cons: [],
      precedents: [],
      doctrine: [],
      counterArguments: [],
      conclusion: "Síntese inicial em elaboração...",
      tags: ["quick-thesis"],
      status: "em_elaboracao",
    });

    setThesisTitle("");
    setThesisQuestion("");
    setIsOpen(false);
    router.push("/modules/codex");
  };

  const handleSubmitEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eviClaim.trim() || !eviSource.trim() || !eviQuote.trim()) return;

    addEvidence({
      claim: eviClaim.trim(),
      source: eviSource.trim(),
      quote: eviQuote.trim(),
      strength: eviStrength,
      section: eviSection,
      tags: ["quick-evidence"],
    });

    setEviClaim("");
    setEviSource("");
    setEviQuote("");
    setIsOpen(false);
    router.push("/modules/research");
  };

  const handleSubmitOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppTitle.trim() || !oppInst.trim() || !oppDeadline) return;

    addOpportunity({
      title: oppTitle.trim(),
      institution: oppInst.trim(),
      deadline: oppDeadline,
      prizeOrGrant: oppPrize.trim() || undefined,
      requirements: ["Verificar edital"],
      requiredDocs: ["Documentação padrão"],
      status: "interessado",
    });

    setOppTitle("");
    setOppInst("");
    setOppDeadline("");
    setOppPrize("");
    setIsOpen(false);
    router.push("/modules/opportunities");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl overflow-hidden clip-corner glow-accent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e30] bg-[#0a0a0f]/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Plus size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Criação Rápida Universal
                <Sparkles size={13} className="text-violet-400" />
              </h2>
              <p className="text-[11px] text-slate-400">VARYNTH Quick Capture</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 px-4 py-2 bg-[#0a0a0f]/40 border-b border-[#1e1e30] overflow-x-auto">
          {[
            { id: "task", label: "Tarefa", icon: CheckSquare },
            { id: "thesis", label: "Tese (Codex)", icon: Scale },
            { id: "evidence", label: "Evidência", icon: GraduationCap },
            { id: "opportunity", label: "Edital", icon: Trophy },
            { id: "vault", label: "Vault", icon: BookOpen },
            { id: "idea", label: "Labs", icon: Lightbulb },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as QuickCreateTab)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-violet-600/25 text-violet-300 border border-violet-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-5">
          {/* TAREFA */}
          {activeTab === "task" && (
            <form onSubmit={handleSubmitTask} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Título da Tarefa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fichar capítulo 3 sobre IA generativa"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Projeto
                  </label>
                  <select
                    value={taskProject}
                    onChange={(e) => setTaskProject(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">Geral (Sem projeto)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Prioridade
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as PriorityLevel)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente 🔥</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white glow-accent"
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          )}

          {/* TESE CODEX */}
          {activeTab === "thesis" && (
            <form onSubmit={handleSubmitThesis} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Título da Tese / Matéria *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Responsabilidade por Algoritmos Opacos"
                  value={thesisTitle}
                  onChange={(e) => setThesisTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Questão Controvertida *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Qual a pergunta jurídica central?"
                  value={thesisQuestion}
                  onChange={(e) => setThesisQuestion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white glow-accent"
                >
                  Entrar na Arena
                </button>
              </div>
            </form>
          )}

          {/* EVIDÊNCIA */}
          {activeTab === "evidence" && (
            <form onSubmit={handleSubmitEvidence} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Afirmação Científica *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: O aumento de parâmetros melhora o raciocínio dedutivo..."
                  value={eviClaim}
                  onChange={(e) => setEviClaim(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Fonte / Autor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Vaswani et al. (2017)"
                  value={eviSource}
                  onChange={(e) => setEviSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Trecho Citado (Quote) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Citação textual..."
                  value={eviQuote}
                  onChange={(e) => setEviQuote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none font-sans"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white glow-accent"
                >
                  Salvar no Board
                </button>
              </div>
            </form>
          )}

          {/* EDITAL */}
          {activeTab === "opportunity" && (
            <form onSubmit={handleSubmitOpportunity} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Título da Chamada / Prêmio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Edital PIBIC 2026"
                  value={oppTitle}
                  onChange={(e) => setOppTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Instituição *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CNPq"
                    value={oppInst}
                    onChange={(e) => setOppInst(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Prazo Final *
                  </label>
                  <input
                    type="date"
                    required
                    value={oppDeadline}
                    onChange={(e) => setOppDeadline(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-yellow-600 hover:bg-yellow-500 text-white"
                >
                  Cadastrar Edital
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="absolute inset-0 -z-10" onClick={() => setIsOpen(false)} />
    </div>
  );
}
