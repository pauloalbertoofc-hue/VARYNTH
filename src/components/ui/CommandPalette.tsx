"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, LayoutDashboard, Grid3x3, Bot, Code2, User, ExternalLink, Zap, ArrowRight, X } from "lucide-react";
import { modules } from "@/lib/modules";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType | string;
  category: "Navegação" | "Módulos" | "Links Rápidos" | "Ações";
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

  // Build command list
  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Navigation
      {
        id: "nav-home",
        title: "Ir para Início",
        description: "Dashboard e widgets principais do VARYNTH",
        icon: LayoutDashboard,
        category: "Navegação",
        action: () => router.push("/dashboard"),
        keywords: ["home", "dashboard", "inicio"],
      },
      {
        id: "nav-modules",
        title: "Ir para Todos os Apps",
        description: "Ver todos os módulos e projetos",
        icon: Grid3x3,
        category: "Navegação",
        action: () => router.push("/modules"),
        keywords: ["apps", "modulos", "projetos"],
      },
      {
        id: "nav-athena",
        title: "Ir para Athena AI",
        description: "Sua inteligência artificial integrada",
        icon: Bot,
        category: "Navegação",
        action: () => router.push("/modules/athena"),
        keywords: ["athena", "ia", "ai", "chat"],
      },
      {
        id: "nav-studio",
        title: "Ir para Studio",
        description: "Editor de código embutido",
        icon: Code2,
        category: "Navegação",
        action: () => router.push("/modules/studio"),
        keywords: ["studio", "editor", "codigo", "vs code"],
      },
      {
        id: "nav-profile",
        title: "Ir para Perfil",
        description: "Seu cartão de jogador e conquistas",
        icon: User,
        category: "Navegação",
        action: () => router.push("/profile"),
        keywords: ["perfil", "usuario", "conquistas", "stats"],
      },
    ];

    // Modules
    modules.forEach((mod) => {
      list.push({
        id: `module-${mod.id}`,
        title: mod.name,
        description: mod.description,
        icon: Zap,
        category: "Módulos",
        action: () => {
          if (mod.href.startsWith("http")) {
            window.open(mod.href, "_blank", "noopener,noreferrer");
          } else {
            router.push(mod.href);
          }
        },
        keywords: [mod.name.toLowerCase(), ...mod.tags],
        external: mod.href.startsWith("http"),
      });
    });

    return list;
  }, [router]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl overflow-hidden clip-corner glow-accent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1e1e30] bg-[#0a0a0f]/60">
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
            placeholder="Digite um comando ou busque um app..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {query ? (
            <button onClick={() => setQuery("")} className="text-slate-500 hover:text-slate-300">
              <X size={16} />
            </button>
          ) : (
            <kbd className="text-[10px] bg-[#14141f] border border-[#1e1e30] text-slate-400 px-1.5 py-0.5 rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Nenhum resultado encontrado para &quot;{query}&quot;
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = typeof cmd.icon === "string" ? Zap : cmd.icon;

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
                      ? "bg-violet-600/20 text-white border border-violet-500/40"
                      : "text-slate-300 hover:bg-white/5 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-7 h-7 rounded flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-violet-600 text-white" : "bg-[#14141f] text-slate-400"
                      )}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-200">{cmd.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{cmd.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
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
        <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a0f]/80 border-t border-[#1e1e30] text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="bg-[#14141f] px-1 py-0.5 rounded border border-[#1e1e30]">↑</kbd>{" "}
              <kbd className="bg-[#14141f] px-1 py-0.5 rounded border border-[#1e1e30]">↓</kbd> Navegar
            </span>
            <span>
              <kbd className="bg-[#14141f] px-1 py-0.5 rounded border border-[#1e1e30]">↵</kbd> Selecionar
            </span>
          </div>
          <span>VARYNTH Spotlight</span>
        </div>
      </div>

      {/* Click outside backdrop */}
      <div className="absolute inset-0 -z-10" onClick={() => setIsOpen(false)} />
    </div>
  );
}

