"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckSquare,
  FolderPlus,
  Lightbulb,
  Link2,
  X,
  Sparkles,
  Plus,
} from "lucide-react";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { ProjectCategory, PriorityLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

type QuickCreateTab = "note" | "task" | "project" | "idea" | "reference";

export function QuickCreateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<QuickCreateTab>("task");
  const router = useRouter();

  const { projects, addTask, addNote, addProject, addReference } = useVarynthStore();

  // Form states
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

  // Reference
  const [refTitle, setRefTitle] = useState("");
  const [refAuthor, setRefAuthor] = useState("");
  const [refUrl, setRefUrl] = useState("");
  const [refType, setRefType] = useState<"artigo" | "livro" | "jurisprudencia" | "lei" | "site" | "video">("artigo");
  const [refProject, setRefProject] = useState("");

  // Global listeners
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

  const handleSubmitReference = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refTitle.trim()) return;

    addReference({
      title: refTitle.trim(),
      author: refAuthor.trim() || undefined,
      url: refUrl.trim() || undefined,
      type: refType,
      projectId: refProject || (projects[0]?.id ?? "proj-varynth"),
    });

    setRefTitle("");
    setRefAuthor("");
    setRefUrl("");
    setIsOpen(false);
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
            { id: "note", label: "Nota / Ideia", icon: FileText },
            { id: "project", label: "Projeto", icon: FolderPlus },
            { id: "reference", label: "Referência", icon: Link2 },
            { id: "idea", label: "Labs / Ideia", icon: Lightbulb },
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

        {/* Form Body */}
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
                  placeholder="Detalhes ou critérios de aceitação..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 resize-none"
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
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none focus:border-violet-500/60"
                  >
                    <option value="">Geral (Sem projeto)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
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
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none focus:border-violet-500/60"
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
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none focus:border-violet-500/60"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white glow-accent transition-colors"
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          )}

          {/* NOTA */}
          {(activeTab === "note" || activeTab === "idea") && (
            <form onSubmit={handleSubmitNote} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Título da Nota *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Resumo da reunião ou nova ideia de arquitetura"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
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
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 resize-none font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Projeto Vinculado
                  </label>
                  <select
                    value={noteProject}
                    onChange={(e) => setNoteProject(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none focus:border-violet-500/60"
                  >
                    <option value="">Geral / Vault</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    placeholder="ideia, pesquisa, direito"
                    value={noteTags}
                    onChange={(e) => setNoteTags(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white glow-accent transition-colors"
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
                  placeholder="Ex: Artigo sobre Hermenêutica e Modelos LLM"
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
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
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={projCategory}
                    onChange={(e) => setProjCategory(e.target.value as ProjectCategory)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none focus:border-violet-500/60"
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
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none focus:border-violet-500/60"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente 🔥</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Prazo Final
                  </label>
                  <input
                    type="date"
                    value={projDeadline}
                    onChange={(e) => setProjDeadline(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none focus:border-violet-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="ia, artigo, q1-2026"
                  value={projTags}
                  onChange={(e) => setProjTags(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white glow-accent transition-colors"
                >
                  Criar Workspace & Abrir
                </button>
              </div>
            </form>
          )}

          {/* REFERÊNCIA */}
          {activeTab === "reference" && (
            <form onSubmit={handleSubmitReference} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Título da Referência / Fonte *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Artigo: Attention is All You Need ou Súmula Vinculante 10"
                  value={refTitle}
                  onChange={(e) => setRefTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Autor / Origem
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Vaswani et al., STF, etc."
                    value={refAuthor}
                    onChange={(e) => setRefAuthor(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Tipo de Fonte
                  </label>
                  <select
                    value={refType}
                    onChange={(e) => setRefType(e.target.value as typeof refType)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none focus:border-violet-500/60"
                  >
                    <option value="artigo">Artigo Científico</option>
                    <option value="livro">Livro / Doutrina</option>
                    <option value="jurisprudencia">Jurisprudência</option>
                    <option value="lei">Legislação / Edital</option>
                    <option value="site">Página Web / Link</option>
                    <option value="video">Vídeo / Aula</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Link / URL (Opcional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={refUrl}
                    onChange={(e) => setRefUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Vincular a Projeto
                  </label>
                  <select
                    value={refProject}
                    onChange={(e) => setRefProject(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none focus:border-violet-500/60"
                  >
                    <option value="">Geral / Vault</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white glow-accent transition-colors"
                >
                  Adicionar Referência
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

