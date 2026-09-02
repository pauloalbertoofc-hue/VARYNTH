"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  FileText,
  CheckSquare,
  Bot,
  User,
  Plus,
  ArrowRight,
  X,
  ExternalLink,
  Sparkles,
  BookOpen,
  Clock,
  Users,
  FlaskConical,
  Scale,
  GraduationCap,
  Trophy,
  Swords,
  Layers,
  Code2,
  Terminal,
  Palette,
  Globe,
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
  Gamepad2,
} from "lucide-react";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { modules } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { STUDIO_DEFINITIONS, getStudioByArtifactType } from "@/lib/studio/studio-registry";
import { artifactStore } from "@/lib/artifacts/artifact-store";

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType | string;
  category:
    | "Studios Criativos"
    | "Ações Criativas"
    | "Artefatos Criativos"
    | "Ações Globais"
    | "Projetos"
    | "Tarefas"
    | "Forge (Código)"
    | "Vault & Conhecimento"
    | "Codex & Teses"
    | "Research & Evidências"
    | "Editais & Oportunidades"
    | "Colaboradores"
    | "Labs & Ideias"
    | "Módulos & Apps"
    | "Navegação";
  action: () => void;
  keywords?: string[];
  external?: boolean;
}

const studioIconMap: Record<string, React.ElementType> = {
  FileText,
  Globe,
  Image: ImageIcon,
  Music,
  Video: VideoIcon,
  Gamepad2,
};

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    projects,
    tasks,
    vaultItems,
    theses,
    evidences,
    opportunities,
    forgeFiles,
    people,
    labItems,
    graveyardItems,
    historicalMilestones,
    toggleTask,
  } = useVarynthStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    // 1. Creative Studios (Navigation)
    list.push({
      id: "studio-hub",
      title: "Studios (Hub Criativo)",
      description: "Acessar Suíte Criativa 6-em-1 (Document, Web, Image, Audio, Video, Game)",
      icon: Palette,
      category: "Studios Criativos",
      action: () => router.push("/modules/studio"),
      keywords: ["studio", "studios", "hub", "criacao", "multimidia", "suite"],
    });

    STUDIO_DEFINITIONS.forEach((studio) => {
      const Icon = studioIconMap[studio.iconName] || Palette;
      list.push({
        id: `studio-nav-${studio.type}`,
        title: studio.label,
        description: `Abrir ${studio.label} (${studio.badge}) · ${studio.description.slice(0, 60)}...`,
        icon: Icon,
        category: "Studios Criativos",
        action: () => router.push(studio.href),
        keywords: [studio.label.toLowerCase(), studio.type.toLowerCase(), ...studio.keywords],
      });
    });

    // 2. Creative Actions (Quick Creation)
    STUDIO_DEFINITIONS.forEach((studio) => {
      const Icon = studioIconMap[studio.iconName] || Palette;
      list.push({
        id: `studio-action-${studio.type}`,
        title: studio.quickActionTitle,
        description: studio.quickActionDescription,
        icon: Icon,
        category: "Ações Criativas",
        action: () => {
          window.dispatchEvent(
            new CustomEvent("open-quick-create", {
              detail: { tab: studio.type.toLowerCase() },
            })
          );
        },
        keywords: [
          "criar",
          "novo",
          studio.creationLabel.toLowerCase(),
          studio.label.toLowerCase(),
          ...studio.keywords,
        ],
      });
    });

    // 3. Creative Artifacts (Lightweight search from ArtifactStore)
    try {
      const allArtifacts = artifactStore.getAll().filter((a) => a.status !== "TRASHED");
      allArtifacts.forEach((art) => {
        const studioDef = getStudioByArtifactType(art.type);
        const Icon = studioDef ? studioIconMap[studioDef.iconName] : FileText;
        const studioType = studioDef ? studioDef.type : "DOCUMENT";

        list.push({
          id: `artifact-${art.id}`,
          title: art.name,
          description: `${studioDef?.label || "Artefato"} · v${art.versions?.length || 1}.0 · Status: ${art.status}`,
          icon: Icon,
          category: "Artefatos Criativos",
          action: () => router.push(`/modules/studio?studio=${studioType}&id=${art.id}`),
          keywords: [
            art.name.toLowerCase(),
            art.type.toLowerCase(),
            studioDef?.label.toLowerCase() || "",
            ...(art.tags || []),
            art.description?.toLowerCase() || "",
          ],
        });
      });
    } catch (err) {
      // ArtifactStore read safe fallback
    }

    // 4. Global Quick Actions
    list.push(
      {
        id: "action-new-code",
        title: "Abrir Forge Studio (IDE)",
        description: "Editar e executar scripts em Python, TS, SQL",
        icon: Code2,
        category: "Ações Globais",
        action: () => router.push("/modules/forge"),
        keywords: ["forge", "codigo", "ide", "script", "python", "typescript", "+"],
      },
      {
        id: "action-new-task",
        title: "Criar Nova Tarefa",
        description: "Adicionar uma tarefa com prioridade e prazo",
        icon: Plus,
        category: "Ações Globais",
        action: () => {
          window.dispatchEvent(new CustomEvent("open-quick-create", { detail: { tab: "task" } }));
        },
        keywords: ["nova tarefa", "task", "todo", "+"],
      },
      {
        id: "action-new-thesis",
        title: "Estruturar Tese na Argument Arena",
        description: "Criar controvérsia dialética com prós e contras",
        icon: Swords,
        category: "Ações Globais",
        action: () => router.push("/modules/codex"),
        keywords: ["tese", "arena", "direito", "argumento", "+"],
      },
      {
        id: "action-new-evidence",
        title: "Cadastrar Evidência Científica",
        description: "Adicionar quote bibliográfico com força probatória",
        icon: GraduationCap,
        category: "Ações Globais",
        action: () => router.push("/modules/research"),
        keywords: ["evidencia", "pesquisa", "quote", "artigo", "+"],
      },
      {
        id: "action-new-opp",
        title: "Cadastrar Edital no Radar",
        description: "Registrar chamada PIBIC, bolsa ou prêmio",
        icon: Trophy,
        category: "Ações Globais",
        action: () => router.push("/modules/opportunities"),
        keywords: ["edital", "bolsa", "premio", "concurso", "+"],
      }
    );

    // 5. Forge Files
    forgeFiles.forEach((file) => {
      list.push({
        id: `forge-${file.id}`,
        title: file.name,
        description: `Código [${file.language.toUpperCase()}] · Forge Studio`,
        icon: Code2,
        category: "Forge (Código)",
        action: () => router.push("/modules/forge"),
        keywords: [file.name.toLowerCase(), file.language, "codigo", "script"],
      });
    });

    // 6. Projects
    projects.forEach((proj) => {
      list.push({
        id: `proj-${proj.id}`,
        title: proj.title,
        description: `Projeto (${proj.category}) · Status: ${proj.status}`,
        icon: FolderKanban,
        category: "Projetos",
        action: () => router.push(`/projects/${proj.id}`),
        keywords: [proj.title.toLowerCase(), proj.category, ...proj.tags],
      });
    });

    // 7. Codex Theses
    theses.forEach((t) => {
      list.push({
        id: `thesis-${t.id}`,
        title: t.title,
        description: `Tese Arena [${t.area}] · ${t.pros.length} Prós / ${t.cons.length} Contras`,
        icon: Scale,
        category: "Codex & Teses",
        action: () => router.push("/modules/codex"),
        keywords: [t.title.toLowerCase(), t.area.toLowerCase(), t.question.toLowerCase(), ...t.tags],
      });
    });

    // 8. Research Evidences
    evidences.forEach((e) => {
      list.push({
        id: `evi-${e.id}`,
        title: e.claim,
        description: `Evidência [${e.strength.toUpperCase()}] · ${e.source}`,
        icon: GraduationCap,
        category: "Research & Evidências",
        action: () => router.push("/modules/research"),
        keywords: [e.claim.toLowerCase(), e.source.toLowerCase(), e.quote.toLowerCase(), ...e.tags],
      });
    });

    // 9. Opportunities
    opportunities.forEach((o) => {
      list.push({
        id: `opp-${o.id}`,
        title: o.title,
        description: `Edital [${o.status.toUpperCase()}] · ${o.institution}`,
        icon: Trophy,
        category: "Editais & Oportunidades",
        action: () => router.push("/modules/opportunities"),
        keywords: [o.title.toLowerCase(), o.institution.toLowerCase(), o.status],
      });
    });

    // 10. Vault Items
    vaultItems.forEach((v) => {
      list.push({
        id: `vault-${v.id}`,
        title: v.title,
        description: `Vault [${v.type.toUpperCase()}] · ${v.author || v.category}`,
        icon: BookOpen,
        category: "Vault & Conhecimento",
        action: () => router.push("/modules/vault"),
        keywords: [v.title.toLowerCase(), v.type, ...(v.author ? [v.author.toLowerCase()] : []), ...v.tags],
      });
    });

    // 11. Tasks
    tasks.forEach((task) => {
      const isDone = task.status === "concluida";
      list.push({
        id: `task-${task.id}`,
        title: `${isDone ? "✓ " : ""}${task.title}`,
        description: `Tarefa [${task.priority.toUpperCase()}] · ${isDone ? "Concluída" : "Pendente"}`,
        icon: CheckSquare,
        category: "Tarefas",
        action: () => {
          if (task.projectId) {
            router.push(`/projects/${task.projectId}`);
          } else {
            toggleTask(task.id);
          }
        },
        keywords: [task.title.toLowerCase(), "tarefa", task.priority],
      });
    });

    // 12. Labs & Graveyard
    labItems.forEach((lab) => {
      list.push({
        id: `lab-${lab.id}`,
        title: lab.title,
        description: `Experimento Labs [${lab.stage.toUpperCase()}] · ${lab.category}`,
        icon: FlaskConical,
        category: "Labs & Ideias",
        action: () => router.push("/modules/labs"),
        keywords: [lab.title.toLowerCase(), lab.stage, lab.category, "labs", "experimento", "ideia"],
      });
    });

    graveyardItems.forEach((g) => {
      list.push({
        id: `graveyard-${g.id}`,
        title: `Memorial: ${g.title}`,
        description: `Memorial Labs · Lições aprendidas (${g.originalCategory})`,
        icon: FlaskConical,
        category: "Labs & Ideias",
        action: () => router.push("/modules/labs"),
        keywords: [g.title.toLowerCase(), g.originalCategory.toLowerCase(), "memorial", "graveyard", "licoes", "labs"],
      });
    });

    // 13. Chronos Historical Milestones
    historicalMilestones.forEach((m) => {
      list.push({
        id: `milestone-${m.id}`,
        title: `Marco: ${m.title}`,
        description: `Chronos (${m.date}) · ${m.category}`,
        icon: Clock,
        category: "Vault & Conhecimento",
        action: () => router.push("/modules/chronos"),
        keywords: [m.title.toLowerCase(), m.category.toLowerCase(), "marco", "historico", "chronos", "data"],
      });
    });

    // 14. Navigation
    list.push(
      {
        id: "nav-forge",
        title: "Ir para Forge Studio",
        description: "Ambiente de desenvolvimento e scripts",
        icon: Code2,
        category: "Navegação",
        action: () => router.push("/modules/forge"),
        keywords: ["forge", "ide", "editor", "codigo"],
      },
      {
        id: "nav-athena",
        title: "Ir para Athena AI",
        description: "Command center de IA transversal",
        icon: Bot,
        category: "Navegação",
        action: () => router.push("/modules/athena"),
        keywords: ["athena", "ia", "chat"],
      }
    );

    return list;
  }, [
    projects,
    forgeFiles,
    theses,
    evidences,
    opportunities,
    vaultItems,
    tasks,
    labItems,
    graveyardItems,
    historicalMilestones,
    router,
    toggleTask,
  ]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 16);
    const q = query.toLowerCase().trim();
    return commands.filter((cmd) => {
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.keywords?.some((k) => k.includes(q)) ||
        cmd.category.toLowerCase().includes(q)
      );
    });
  }, [commands, query]);

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
    } else if (e.key === "Enter" && filteredCommands.length > 0) {
      e.preventDefault();
      const target = filteredCommands[selectedIndex];
      if (target) {
        setIsOpen(false);
        target.action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl overflow-hidden clip-corner glow-accent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1e1e30] bg-[#0a0a0f]/70">
          <Search size={18} className="text-violet-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleListKeyDown}
            placeholder="Buscar Studios, Artefatos, Projetos, Código, Teses, Tarefas... (Ctrl+K)"
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {query ? (
            <button onClick={() => setQuery("")} className="text-slate-500 hover:text-slate-300">
              <X size={16} />
            </button>
          ) : (
            <kbd className="text-[10px] bg-[#14141f] border border-[#1e1e30] text-slate-400 px-1.5 py-0.5 rounded font-mono">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Nenhum comando, estúdio ou artefato encontrado para &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = typeof cmd.icon === "string" ? Sparkles : cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    setIsOpen(false);
                    cmd.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all",
                    isSelected
                      ? "bg-violet-600/25 border border-violet-500/40 text-slate-100"
                      : "hover:bg-[#151524] text-slate-300 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
                        cmd.category === "Studios Criativos"
                          ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                          : cmd.category === "Ações Criativas"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : cmd.category === "Artefatos Criativos"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : isSelected
                          ? "bg-violet-600/30 text-violet-300"
                          : "bg-[#161626] text-slate-400"
                      )}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium truncate text-slate-100">{cmd.title}</span>
                      <span className="text-[10px] text-slate-400 truncate">{cmd.description}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-medium",
                        cmd.category === "Studios Criativos"
                          ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                          : cmd.category === "Ações Criativas"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : cmd.category === "Artefatos Criativos"
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          : "bg-[#18182a] text-slate-500"
                      )}
                    >
                      {cmd.category}
                    </span>
                    {isSelected && <ArrowRight size={12} className="text-violet-400" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#1e1e30] bg-[#0a0a0f]/50 text-[10px] text-slate-500">
          <span>
            Pressione <kbd className="bg-[#14141f] border border-[#222236] px-1 rounded">↑</kbd> <kbd className="bg-[#14141f] border border-[#222236] px-1 rounded">↓</kbd> para navegar, <kbd className="bg-[#14141f] border border-[#222236] px-1 rounded">↵</kbd> para selecionar
          </span>
          <span>{filteredCommands.length} resultados</span>
        </div>
      </div>
    </div>
  );
}
