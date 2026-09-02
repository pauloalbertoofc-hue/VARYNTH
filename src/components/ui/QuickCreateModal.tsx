"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  CheckSquare,
  FileText,
  FolderKanban,
  Scale,
  GraduationCap,
  Trophy,
  BookOpen,
  Lightbulb,
  X,
  Sparkles,
  Palette,
  Globe,
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
  Gamepad2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import {
  PriorityLevel,
  ProjectCategory,
  VaultItemType,
  EvidenceStrength,
  PaperSection,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { documentService } from "@/lib/studio/document/document-service";
import { webService } from "@/lib/studio/web/web-service";
import { imageService } from "@/lib/studio/image/image-service";
import { audioService } from "@/lib/studio/audio/audio-service";
import { videoService } from "@/lib/studio/video/video-service";
import { gameService } from "@/lib/studio/game/game-service";
import { STUDIO_DEFINITIONS, StudioType } from "@/lib/studio/studio-registry";

type QuickCreateTab =
  | "studio"
  | "project"
  | "note"
  | "task"
  | "thesis"
  | "evidence"
  | "opportunity"
  | "vault"
  | "idea";

const studioIcons: Record<string, React.ElementType> = {
  DOCUMENT: FileText,
  WEB: Globe,
  IMAGE: ImageIcon,
  AUDIO: Music,
  VIDEO: VideoIcon,
  GAME: Gamepad2,
};

export function QuickCreateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<QuickCreateTab>("studio");
  const router = useRouter();

  const {
    projects,
    addProject,
    addNote,
    addTask,
    addThesis,
    addEvidence,
    addOpportunity,
    addVaultItem,
    addLabItem,
  } = useVarynthStore();

  // Project
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectCategory, setProjectCategory] = useState<ProjectCategory>("software");
  const [projectPriority, setProjectPriority] = useState<PriorityLevel>("media");
  const [projectDeadline, setProjectDeadline] = useState("");

  // Note
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteProject, setNoteProject] = useState("");

  // Studio Artifact
  const [studioType, setStudioType] = useState<StudioType>("DOCUMENT");
  const [studioTitle, setStudioTitle] = useState("");
  const [isCreatingStudioArtifact, setIsCreatingStudioArtifact] = useState(false);

  // Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>("media");
  const [taskDueDate, setTaskDueDate] = useState("");

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
        const t = String(e.detail.tab).toLowerCase();
        if (["document", "web", "image", "audio", "video", "game"].includes(t)) {
          setActiveTab("studio");
          setStudioType(t.toUpperCase() as StudioType);
        } else if (t === "studio") {
          setActiveTab("studio");
        } else {
          setActiveTab(e.detail.tab as QuickCreateTab);
        }
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

  const handleSubmitStudioArtifact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioTitle.trim()) return;
    setIsCreatingStudioArtifact(true);

    try {
      const title = studioTitle.trim();
      let createdArtifactId = "";

      if (studioType === "DOCUMENT") {
        const res = await documentService.createDocument({
          title,
          documentType: "ARTICLE",
          createdBy: "USER",
        });
        if (res.success && res.document) createdArtifactId = res.document.artifact.id;
      } else if (studioType === "WEB") {
        const res = await webService.createWebsite({
          name: title,
          actor: "USER",
        });
        if (res.success && res.website) createdArtifactId = res.website.artifact.id;
      } else if (studioType === "IMAGE") {
        const res = await imageService.createImage({
          name: title,
          actor: "USER",
        });
        if (res.success && res.image) createdArtifactId = res.image.artifact.id;
      } else if (studioType === "AUDIO") {
        const res = await audioService.createAudioProject({
          name: title,
          actor: "USER",
        });
        if (res.success && res.audio) createdArtifactId = res.audio.artifact.id;
      } else if (studioType === "VIDEO") {
        const res = await videoService.createVideoProject({
          name: title,
          actor: "USER",
        });
        if (res.success && res.video) createdArtifactId = res.video.artifact.id;
      } else if (studioType === "GAME") {
        const res = await gameService.createGameProject({
          name: title,
          actor: "USER",
        });
        if (res.success && res.game) createdArtifactId = res.game.artifact.id;
      }

      setStudioTitle("");
      setIsOpen(false);
      setIsCreatingStudioArtifact(false);

      if (createdArtifactId) {
        router.push(`/modules/studio?studio=${studioType}&id=${createdArtifactId}`);
      } else {
        router.push(`/modules/studio?studio=${studioType}`);
      }
    } catch (err) {
      setIsCreatingStudioArtifact(false);
    }
  };

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
    setTaskProject("");
    setTaskDueDate("");
    setIsOpen(false);
  };

  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    addNote({
      title: noteTitle.trim(),
      content: noteContent.trim(),
      projectId: noteProject || undefined,
      tags: noteProject ? ["projeto"] : ["nota-rapida"],
      pinned: false,
    });

    setNoteTitle("");
    setNoteContent("");
    setNoteProject("");
    setIsOpen(false);
    router.push(noteProject ? `/projects/${noteProject}` : "/modules/vault");
  };

  const handleSubmitProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;

    const project = addProject({
      title: projectTitle.trim(),
      description: projectDescription.trim(),
      category: projectCategory,
      status: "planejamento",
      priority: projectPriority,
      deadline: projectDeadline || undefined,
      tags: [],
      progress: 0,
    });

    setProjectTitle("");
    setProjectDescription("");
    setProjectCategory("software");
    setProjectPriority("media");
    setProjectDeadline("");
    setIsOpen(false);
    router.push(`/projects/${project.id}`);
  };

  const handleSubmitThesis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thesisTitle.trim() || !thesisQuestion.trim()) return;

    addThesis({
      title: thesisTitle.trim(),
      area: thesisArea,
      question: thesisQuestion.trim(),
      pros: [],
      cons: [],
      precedents: [],
      doctrine: [],
      counterArguments: [],
      conclusion: "",
      status: "em_elaboracao",
      tags: [],
    });

    setThesisTitle("");
    setThesisQuestion("");
    setIsOpen(false);
    router.push("/modules/codex");
  };

  const handleSubmitEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eviClaim.trim() || !eviSource.trim()) return;

    addEvidence({
      claim: eviClaim.trim(),
      source: eviSource.trim(),
      quote: eviQuote.trim(),
      strength: eviStrength,
      section: eviSection,
      tags: [],
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

  const handleSubmitVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultTitle.trim()) return;

    addVaultItem({
      title: vaultTitle.trim(),
      type: vaultType,
      tags: [],
      category: "Geral",
      readingStatus: "para_ler",
    });

    setVaultTitle("");
    setIsOpen(false);
    router.push("/modules/vault");
  };

  const handleSubmitIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim()) return;

    addLabItem({
      title: ideaTitle.trim(),
      description: ideaDesc.trim() || ideaTitle.trim(),
      hypothesis: ideaDesc.trim() || undefined,
      category: "software",
      stage: "ideia",
      tags: [],
    });

    setIdeaTitle("");
    setIdeaDesc("");
    setIsOpen(false);
    router.push("/modules/labs");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl max-h-[90dvh] bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl overflow-hidden clip-corner glow-accent flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e30] bg-[#0a0a0f]/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Plus size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Criação Rápida Universal
                <Sparkles size={13} className="text-violet-400" />
              </h2>
              <p className="text-[11px] text-slate-400">VARYNTH Quick Capture & Creative Studios</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Fechar criação rápida"
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 px-4 py-2 bg-[#0a0a0f]/40 border-b border-[#1e1e30] overflow-x-auto shrink-0">
          {[
            { id: "studio", label: "Studios (6 Criativos)", icon: Palette },
            { id: "project", label: "Projeto", icon: FolderKanban },
            { id: "note", label: "Nota", icon: FileText },
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
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 max-h-[70dvh] sm:max-h-[75vh]">
          {/* PROJETO */}
          {activeTab === "project" && (
            <form onSubmit={handleSubmitProject} className="space-y-3">
              <div>
                <label htmlFor="quick-project-title" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome do Projeto *
                </label>
                <input
                  id="quick-project-title"
                  type="text"
                  required
                  autoFocus
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Ex: Plataforma de Pesquisa Aplicada"
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label htmlFor="quick-project-description" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Descrição
                </label>
                <textarea
                  id="quick-project-description"
                  rows={3}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Objetivo e contexto do projeto..."
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label htmlFor="quick-project-category" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Categoria</label>
                  <select id="quick-project-category" value={projectCategory} onChange={(e) => setProjectCategory(e.target.value as ProjectCategory)} className="w-full bg-[#141422] border border-[#222236] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500">
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
                  <label htmlFor="quick-project-priority" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Prioridade</label>
                  <select id="quick-project-priority" value={projectPriority} onChange={(e) => setProjectPriority(e.target.value as PriorityLevel)} className="w-full bg-[#141422] border border-[#222236] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500">
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="quick-project-deadline" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Prazo</label>
                  <input id="quick-project-deadline" type="date" value={projectDeadline} onChange={(e) => setProjectDeadline(e.target.value)} className="w-full bg-[#141422] border border-[#222236] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e1e30]">
                <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200">Cancelar</button>
                <button type="submit" disabled={!projectTitle.trim()} className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-500/20 transition">
                  Criar Projeto <ArrowRight size={13} />
                </button>
              </div>
            </form>
          )}

          {/* NOTA */}
          {activeTab === "note" && (
            <form onSubmit={handleSubmitNote} className="space-y-3">
              <div>
                <label htmlFor="quick-note-title" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Título da Nota *</label>
                <input id="quick-note-title" type="text" required autoFocus value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Ex: Decisão da reunião" className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label htmlFor="quick-note-content" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Conteúdo</label>
                <textarea id="quick-note-content" rows={4} value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Registre a ideia ou informação..." className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none" />
              </div>
              <div>
                <label htmlFor="quick-note-project" className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Vincular ao projeto</label>
                <select id="quick-note-project" value={noteProject} onChange={(e) => setNoteProject(e.target.value)} className="w-full bg-[#141422] border border-[#222236] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500">
                  <option value="">Nota geral</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e1e30]">
                <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200">Cancelar</button>
                <button type="submit" disabled={!noteTitle.trim()} className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold">Salvar Nota</button>
              </div>
            </form>
          )}

          {/* STUDIOS CRIATIVOS */}
          {activeTab === "studio" && (
            <form onSubmit={handleSubmitStudioArtifact} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Escolha o Studio de Destino
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STUDIO_DEFINITIONS.map((s) => {
                    const Icon = studioIcons[s.type] || Palette;
                    const isSelected = studioType === s.type;
                    return (
                      <button
                        key={s.type}
                        type="button"
                        onClick={() => setStudioType(s.type)}
                        className={cn(
                          "p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all",
                          isSelected
                            ? "bg-violet-600/25 border-violet-500/50 text-white shadow-md shadow-violet-500/10"
                            : "bg-[#111222] border-[#222238] text-slate-400 hover:text-slate-200 hover:bg-white/5"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <Icon size={16} className={isSelected ? "text-violet-400" : "text-slate-500"} />
                          <span className="text-[9px] font-mono text-slate-500">S{s.studioNumber}</span>
                        </div>
                        <span className="text-xs font-semibold truncate">{s.shortLabel}</span>
                        <span className="text-[9px] text-slate-500 truncate">{s.creationLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Título / Nome do Artefato *
                </label>
                <input
                  type="text"
                  required
                  value={studioTitle}
                  onChange={(e) => setStudioTitle(e.target.value)}
                  placeholder={`Ex: ${
                    studioType === "DOCUMENT"
                      ? "Monografia de Direito Digital"
                      : studioType === "WEB"
                      ? "Portal de Jurisprudência"
                      : studioType === "IMAGE"
                      ? "Infográfico Conceitual"
                      : studioType === "AUDIO"
                      ? "Episódio 01 - Podcast"
                      : studioType === "VIDEO"
                      ? "Vídeo Explicativo VARYNTH"
                      : "Protótipo 2D Arena"
                  }`}
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStudioArtifact || !studioTitle.trim()}
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-500/20 transition"
                >
                  {isCreatingStudioArtifact ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Criando...
                    </>
                  ) : (
                    <>
                      Criar & Abrir no Studio <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

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
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Ex: Escrever abstract do paper"
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Detalhes da tarefa..."
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Projeto
                  </label>
                  <select
                    value={taskProject}
                    onChange={(e) => setTaskProject(e.target.value)}
                    className="w-full bg-[#141422] border border-[#222236] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="">Sem projeto</option>
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
                    className="w-full bg-[#141422] border border-[#222236] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
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
                    className="w-full bg-[#141422] border border-[#222236] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-500/20 transition"
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          )}

          {/* TESE */}
          {activeTab === "thesis" && (
            <form onSubmit={handleSubmitThesis} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Título da Tese *
                </label>
                <input
                  type="text"
                  required
                  value={thesisTitle}
                  onChange={(e) => setThesisTitle(e.target.value)}
                  placeholder="Ex: Responsabilidade Civil de Algoritmos"
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Questão-Chave *
                </label>
                <input
                  type="text"
                  required
                  value={thesisQuestion}
                  onChange={(e) => setThesisQuestion(e.target.value)}
                  placeholder="Ex: O desenvolvedor responde objetivamente por alucinações?"
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Área do Conhecimento
                </label>
                <input
                  type="text"
                  value={thesisArea}
                  onChange={(e) => setThesisArea(e.target.value)}
                  placeholder="Ex: Direito Digital, IA, Filosofia"
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-500/20 transition"
                >
                  Cadastrar Tese
                </button>
              </div>
            </form>
          )}

          {/* EVIDÊNCIA */}
          {activeTab === "evidence" && (
            <form onSubmit={handleSubmitEvidence} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Alegação / Claim *
                </label>
                <input
                  type="text"
                  required
                  value={eviClaim}
                  onChange={(e) => setEviClaim(e.target.value)}
                  placeholder="Ex: O STF pacificou que o Marco Civil protege..."
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Fonte (Autor, Obra ou Link) *
                </label>
                <input
                  type="text"
                  required
                  value={eviSource}
                  onChange={(e) => setEviSource(e.target.value)}
                  placeholder="Ex: RE 1037396 / STF, 2024"
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Força Probatória
                  </label>
                  <select
                    value={eviStrength}
                    onChange={(e) => setEviStrength(e.target.value as EvidenceStrength)}
                    className="w-full bg-[#141422] border border-[#222236] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="forte">Forte (Jurisprudência vinculante/Peer-reviewed)</option>
                    <option value="moderada">Moderada (Doutrina/Relatório)</option>
                    <option value="preliminar">Preliminar (Artigo de opinião/Notícia)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Seção do Paper
                  </label>
                  <select
                    value={eviSection}
                    onChange={(e) => setEviSection(e.target.value as PaperSection)}
                    className="w-full bg-[#141422] border border-[#222236] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="introducao">Introdução</option>
                    <option value="metodologia">Metodologia</option>
                    <option value="resultados">Resultados</option>
                    <option value="discussao">Discussão</option>
                    <option value="conclusao">Conclusão</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-500/20 transition"
                >
                  Salvar Evidência
                </button>
              </div>
            </form>
          )}

          {/* EDITAL */}
          {activeTab === "opportunity" && (
            <form onSubmit={handleSubmitOpportunity} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Título do Edital / Chamada *
                </label>
                <input
                  type="text"
                  required
                  value={oppTitle}
                  onChange={(e) => setOppTitle(e.target.value)}
                  placeholder="Ex: Chamada Universal CNPq 2026"
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Instituição *
                  </label>
                  <input
                    type="text"
                    required
                    value={oppInst}
                    onChange={(e) => setOppInst(e.target.value)}
                    placeholder="Ex: CNPq / FAPESP"
                    className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
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
                    className="w-full bg-[#141422] border border-[#222236] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-500/20 transition"
                >
                  Cadastrar Edital
                </button>
              </div>
            </form>
          )}

          {/* VAULT */}
          {activeTab === "vault" && (
            <form onSubmit={handleSubmitVault} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Título do Recurso *
                </label>
                <input
                  type="text"
                  required
                  value={vaultTitle}
                  onChange={(e) => setVaultTitle(e.target.value)}
                  placeholder="Ex: Lei Geral de Proteção de Dados Comentada"
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Tipo de Conteúdo
                </label>
                <select
                  value={vaultType}
                  onChange={(e) => setVaultType(e.target.value as VaultItemType)}
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="artigo">Artigo Científico</option>
                  <option value="livro">Livro / Capítulo</option>
                  <option value="jurisprudencia">Jurisprudência / Acórdão</option>
                  <option value="legislacao">Legislação / Norma</option>
                  <option value="template">Template / Modelo</option>
                  <option value="prompt">Prompt / System Prompt</option>
                  <option value="nota">Nota de Estudo</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-500/20 transition"
                >
                  Adicionar ao Vault
                </button>
              </div>
            </form>
          )}

          {/* LABS */}
          {activeTab === "idea" && (
            <form onSubmit={handleSubmitIdea} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Hipótese / Título do Experimento *
                </label>
                <input
                  type="text"
                  required
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  placeholder="Ex: Fine-tuning de modelo para extração de jurisprudência"
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Descrição e Metodologia
                </label>
                <textarea
                  rows={3}
                  value={ideaDesc}
                  onChange={(e) => setIdeaDesc(e.target.value)}
                  placeholder="Descreva o experimento e as variáveis..."
                  className="w-full bg-[#141422] border border-[#222236] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e1e30]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-500/20 transition"
                >
                  Registrar no Labs
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
