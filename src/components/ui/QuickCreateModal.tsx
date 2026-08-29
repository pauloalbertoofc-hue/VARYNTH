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
} from "lucide-react";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { ProjectCategory, PriorityLevel, VaultItemType, ReadingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type QuickCreateTab = "task" | "note" | "project" | "vault" | "idea" | "person";

export function QuickCreateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<QuickCreateTab>("task");
  const router = useRouter();

  const { projects, addTask, addNote, addProject, addVaultItem, addLabItem, addPerson } = useVarynthStore();

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
  const [noteTags, setNoteTags] = useState("");

  // Project
  const [projTitle, setProjTitle] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projCategory, setProjCategory] = useState<ProjectCategory>("software");
  const [projPriority, setProjPriority] = useState<PriorityLevel>("media");
  const [projDeadline, setProjDeadline] = useState("");
  const [projTags, setProjTags] = useState("");

  // Vault
  const [vaultTitle, setVaultTitle] = useState("");
  const [vaultAuthor, setVaultAuthor] = useState("");
  const [vaultType, setVaultType] = useState<VaultItemType>("artigo");
  const [vaultUrl, setVaultUrl] = useState("");
  const [vaultProject, setVaultProject] = useState("");
  const [vaultNotes, setVaultNotes] = useState("");

  // Lab Idea
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDesc, setIdeaDesc] = useState("");
  const [ideaHypothesis, setIdeaHypothesis] = useState("");
  const [ideaCategory, setIdeaCategory] = useState<ProjectCategory>("software");

  // Person
  const [personName, setPersonName] = useState("");
  const [personRole, setPersonRole] = useState("");
  const [personOrg, setPersonOrg] = useState("");
  const [personEmail, setPersonEmail] = useState("");

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

  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    const tagsArray = noteTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    addNote({
      title: noteTitle.trim(),
      content: noteContent.trim(),
      projectId: noteProject || undefined,
      tags: tagsArray.length ? tagsArray : ["geral"],
      pinned: false,
    });

    setNoteTitle("");
    setNoteContent("");
    setNoteTags("");
    setIsOpen(false);
  };

  const handleSubmitProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim()) return;

    const tagsArray = projTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const newProj = addProject({
      title: projTitle.trim(),
      description: projDesc.trim(),
      category: projCategory,
      priority: projPriority,
      status: "ativo",
      deadline: projDeadline || undefined,
      tags: tagsArray.length ? tagsArray : ["novo"],
      progress: 0,
    });

    setProjTitle("");
    setProjDesc("");
    setProjTags("");
    setIsOpen(false);
    router.push(`/projects/${newProj.id}`);
  };

  const handleSubmitVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultTitle.trim()) return;

    addVaultItem({
      title: vaultTitle.trim(),
      author: vaultAuthor.trim() || undefined,
      type: vaultType,
      url: vaultUrl.trim() || undefined,
      category: "Geral",
      readingStatus: "para_ler",
      notes: vaultNotes.trim() || undefined,
      tags: ["quick-capture"],
      relatedProjectIds: vaultProject ? [vaultProject] : undefined,
    });

    setVaultTitle("");
    setVaultAuthor("");
    setVaultUrl("");
    setVaultNotes("");
    setIsOpen(false);
    router.push("/modules/vault");
  };

  const handleSubmitIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim()) return;

    addLabItem({
      title: ideaTitle.trim(),
      description: ideaDesc.trim(),
      hypothesis: ideaHypothesis.trim() || undefined,
      category: ideaCategory,
      stage: "ideia",
      tags: ["incubacao"],
    });

    setIdeaTitle("");
    setIdeaDesc("");
    setIdeaHypothesis("");
    setIsOpen(false);
    router.push("/modules/labs");
  };

  const handleSubmitPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() || !personRole.trim()) return;

    addPerson({
      name: personName.trim(),
      role: personRole.trim(),
      organization: personOrg.trim() || undefined,
      email: personEmail.trim() || undefined,
      tags: ["colaborador"],
      projectPermissions: [],
    });

    setPersonName("");
    setPersonRole("");
    setPersonOrg("");
    setPersonEmail("");
    setIsOpen(false);
    router.push("/modules/people");
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
            { id: "note", label: "Nota", icon: FileText },
            { id: "project", label: "Projeto", icon: FolderPlus },
            { id: "vault", label: "Vault", icon: BookOpen },
            { id: "idea", label: "Labs", icon: Lightbulb },
            { id: "person", label: "Colaborador", icon: Users },
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
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Critérios de conclusão..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Prazo
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
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
                  className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white glow-accent"
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          )}

          {/* NOTA */}
          {activeTab === "note" && (
            <form onSubmit={handleSubmitNote} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Título da Nota *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Resumo de reunião ou ideia rápida"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Conteúdo
                </label>
                <textarea
                  rows={4}
                  placeholder="Escreva livremente aqui..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
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
                  Salvar Nota
                </button>
              </div>
            </form>
          )}

          {/* PROJETO */}
          {activeTab === "project" && (
            <form onSubmit={handleSubmitProject} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome do Projeto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Artigo sobre Hermenêutica Jurídica"
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Descrição e Escopo
                </label>
                <textarea
                  rows={2}
                  placeholder="Qual o objetivo principal deste projeto?"
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={projCategory}
                    onChange={(e) => setProjCategory(e.target.value as ProjectCategory)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="software">Software</option>
                    <option value="pesquisa">Pesquisa</option>
                    <option value="estudo">Estudo</option>
                    <option value="academico">Acadêmico</option>
                    <option value="negocio">Negócio</option>
                    <option value="pessoal">Pessoal</option>
                    <option value="experimento">Experimento</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Prioridade
                  </label>
                  <select
                    value={projPriority}
                    onChange={(e) => setProjPriority(e.target.value as PriorityLevel)}
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
                  Criar Workspace
                </button>
              </div>
            </form>
          )}

          {/* VAULT */}
          {activeTab === "vault" && (
            <form onSubmit={handleSubmitVault} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Título da Obra / Lei / Artigo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Teoria dos Agentes Autônomos"
                  value={vaultTitle}
                  onChange={(e) => setVaultTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Tipo
                  </label>
                  <select
                    value={vaultType}
                    onChange={(e) => setVaultType(e.target.value as VaultItemType)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="artigo">Artigo</option>
                    <option value="livro">Livro / Doutrina</option>
                    <option value="jurisprudencia">Jurisprudência</option>
                    <option value="lei">Legislação</option>
                    <option value="pdf">PDF / Documento</option>
                    <option value="link">Link Web</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Autor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: STF, Russell & Norvig"
                    value={vaultAuthor}
                    onChange={(e) => setVaultAuthor(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Link / URL de Acesso
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={vaultUrl}
                  onChange={(e) => setVaultUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
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
                  Salvar no Vault
                </button>
              </div>
            </form>
          )}

          {/* LABS */}
          {activeTab === "idea" && (
            <form onSubmit={handleSubmitIdea} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Título da Ideia / Hipótese *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Automação de Ementas via API"
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  placeholder="O que você deseja experimentar?"
                  value={ideaDesc}
                  onChange={(e) => setIdeaDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Hipótese
                </label>
                <input
                  type="text"
                  placeholder="Ex: Se fizermos X, economizamos 5 horas de fichamento..."
                  value={ideaHypothesis}
                  onChange={(e) => setIdeaHypothesis(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
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
                  className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white"
                >
                  Incubar no Labs
                </button>
              </div>
            </form>
          )}

          {/* COLABORADOR */}
          {activeTab === "person" && (
            <form onSubmit={handleSubmitPerson} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mariana Costa"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Cargo / Função *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Diretora de Pesquisa"
                    value={personRole}
                    onChange={(e) => setPersonRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Organização
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Universidade X"
                    value={personOrg}
                    onChange={(e) => setPersonOrg(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
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
                  className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Cadastrar Colaborador
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
