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
} from "lucide-react";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { modules } from "@/lib/modules";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType | string;
  category: "Ações Globais" | "Projetos" | "Tarefas" | "Notas" | "Módulos & Apps" | "Navegação";
  action: () => void;
  keywords?: string[];
  external?: boolean;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const { projects, tasks, notes, toggleTask } = useVarynthStore();

  // Global open/close listeners
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

  // Build command list dynamically from store
  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    // Quick Actions
    list.push(
      {
        id: "action-new-task",
        title: "Criar Nova Tarefa",
        description: "Adicionar uma tarefa com prioridade e prazo",
        icon: Plus,
        category: "Ações Globais",
        action: () => {
          window.dispatchEvent(new CustomEvent("open-quick-create", { detail: { tab: "task" } }));
        },
        keywords: ["nova tarefa", "adicionar tarefa", "task", "todo", "+"],
      },
      {
        id: "action-new-note",
        title: "Criar Nova Nota / Fichamento",
        description: "Registrar uma ideia ou documento de conhecimento",
        icon: FileText,
        category: "Ações Globais",
        action: () => {
          window.dispatchEvent(new CustomEvent("open-quick-create", { detail: { tab: "note" } }));
        },
        keywords: ["nova nota", "anotacao", "rascunho", "fichamento", "+"],
      },
      {
        id: "action-new-project",
        title: "Criar Novo Projeto",
        description: "Abrir uma nova workspace dedicada com 7 abas",
        icon: FolderKanban,
        category: "Ações Globais",
        action: () => {
          window.dispatchEvent(new CustomEvent("open-quick-create", { detail: { tab: "project" } }));
        },
        keywords: ["novo projeto", "workspace", "projeto", "+"],
      }
    );

    // Projects from store
    projects.forEach((proj) => {
      list.push({
        id: `proj-${proj.id}`,
        title: proj.title,
        description: `Projeto (${proj.category}) · Status: ${proj.status} · Prioridade: ${proj.priority}`,
        icon: FolderKanban,
        category: "Projetos",
        action: () => router.push(`/projects/${proj.id}`),
        keywords: [proj.title.toLowerCase(), proj.category, ...proj.tags],
      });
    });

    // Tasks from store
    tasks.forEach((task) => {
      const isDone = task.status === "concluida";
      list.push({
        id: `task-${task.id}`,
        title: `${isDone ? "✓ " : ""}${task.title}`,
        description: `Tarefa [${task.priority.toUpperCase()}] · ${isDone ? "Concluída" : "Pendente"}${task.dueDate ? ` · Prazo: ${task.dueDate}` : ""}`,
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

    // Notes from store
    notes.forEach((note) => {
      list.push({
        id: `note-${note.id}`,
        title: note.title,
        description: `Nota · ${note.content.slice(0, 60)}...`,
        icon: FileText,
        category: "Notas",
        action: () => {
          if (note.projectId) {
            router.push(`/projects/${note.projectId}`);
          } else {
            router.push("/dashboard");
          }
        },
        keywords: [note.title.toLowerCase(), ...note.tags],
      });
    });

    // Navigation Targets
    list.push(
      {
        id: "nav-dashboard",
        title: "Ir para Início / Cockpit",
        description: "Visão geral do sistema e tarefas do dia",
        icon: LayoutDashboard,
        category: "Navegação",
        action: () => router.push("/dashboard"),
        keywords: ["home", "inicio", "cockpit", "dashboard"],
      },
      {
        id: "nav-projects",
        title: "Ir para Projetos",
        description: "Listagem e gestão de todas as workspaces",
        icon: FolderKanban,
        category: "Navegação",
        action: () => router.push("/projects"),
        keywords: ["projetos", "workspaces", "kanban"],
      },
      {
        id: "nav-athena",
        title: "Ir para Athena AI",
        description: "Conversar com sua inteligência artificial",
        icon: Bot,
        category: "Navegação",
        action: () => router.push("/modules/athena"),
        keywords: ["athena", "ia", "chat", "inteligencia"],
      },
      {
        id: "nav-profile",
        title: "Ir para Perfil",
        description: "Cartão de usuário e conquistas",
        icon: User,
        category: "Navegação",
        action: () => router.push("/profile"),
        keywords: ["perfil", "dono", "stats"],
      }
    );

    // Registered Modules
    modules.forEach((mod) => {
      list.push({
        id: `mod-${mod.id}`,
        title: mod.name,
        description: `${mod.description} [${mod.layer.toUpperCase()}]`,
        icon: Sparkles,
        category: "Módulos & Apps",
        action: () => {
          if (mod.href.startsWith("http")) {
            window.open(mod.href, "_blank", "noopener,noreferrer");
          } else {
            router.push(mod.href);
          }
        },
        keywords: [mod.name.toLowerCase(), ...mod.tags, mod.category],
        external: mod.href.startsWith("http"),
      });
    });

    return list;
  }, [projects, tasks, notes, router, toggleTask]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 15);
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

  // Keyboard navigation within list
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
            placeholder="Buscar projetos, tarefas, notas, módulos ou ações globais..."
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
            <div className="py-12 text-center text-xs text-slate-500">
              Nenhum resultado encontrado para &quot;{query}&quot;
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = typeof cmd.icon === "string" ? Sparkles : cmd.icon;

              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    setIsOpen(false);
                    cmd.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                    isSelected
                      ? "bg-violet-600/20 text-white border border-violet-500/40 shadow-sm"
                      : "text-slate-300 hover:bg-white/5 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-violet-600 text-white" : "bg-[#14141f] text-slate-400 border border-[#1e1e30]"
                      )}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-200 truncate">{cmd.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{cmd.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#14141f] text-slate-400 border border-[#1e1e30]">
                      {cmd.category}
                    </span>
                    {cmd.external ? (
                      <ExternalLink size={12} className="text-slate-500" />
                    ) : (
                      isSelected && <ArrowRight size={12} className="text-violet-400" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a0a0f]/80 border-t border-[#1e1e30] text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="bg-[#14141f] px-1 py-0.5 rounded border border-[#1e1e30]">↑</kbd>{" "}
              <kbd className="bg-[#14141f] px-1 py-0.5 rounded border border-[#1e1e30]">↓</kbd> Navegar
            </span>
            <span>
              <kbd className="bg-[#14141f] px-1 py-0.5 rounded border border-[#1e1e30]">↵</kbd> Selecionar
            </span>
          </div>
          <span className="text-slate-400 font-medium">VARYNTH Universal Search</span>
        </div>
      </div>

      <div className="absolute inset-0 -z-10" onClick={() => setIsOpen(false)} />
    </div>
  );
}
