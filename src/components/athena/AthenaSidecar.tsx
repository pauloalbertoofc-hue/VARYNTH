"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { processAthenaQueryAsync } from "@/lib/athena/engine";
import { useAthenaEngineStatus } from "@/lib/athena/hooks/useAthenaEngineStatus";
import { AthenaMessage, AthenaScope } from "@/lib/types";
import {
  Bot,
  Sparkles,
  Send,
  X,
  Maximize2,
  ArrowRight,
  CheckCircle2,
  Minimize2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AthenaSidecar() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AthenaMessage[]>([
    {
      id: "sidecar-init",
      sender: "athena",
      text: "Olá, Paulo! Estou acompanhando sua navegação no VARYNTH OS. Posso criar tarefas, resumir dados desta página ou tirar dúvidas a qualquer momento.",
      timestamp: "Agora",
      scope: "geral",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const pathname = usePathname();
  const store = useVarynthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut Alt + A
  useEffect(() => {
    try {
      const saved = localStorage.getItem("varynth_athena_messages");
      if (saved) {
        setMessages(JSON.parse(saved));
      }
    } catch {
      // ignore
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const saveMessages = (msgs: AthenaMessage[]) => {
    setMessages(msgs);
    try {
      localStorage.setItem("varynth_athena_messages", JSON.stringify(msgs));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Don't render the sidecar trigger if on /modules/athena itself to avoid redundancy
  if (pathname === "/modules/athena") {
    return null;
  }

  // 1. Resolve Project Context from Route with validation
  let routeProjectId: string | undefined = undefined;
  const projectRouteMatch = pathname.match(/\/projects\/([^/?#]+)/);
  if (projectRouteMatch && projectRouteMatch[1]) {
    try {
      const candidateId = decodeURIComponent(projectRouteMatch[1]);
      const projectExists = store.projects.some((p) => p.id === candidateId);
      if (projectExists) {
        routeProjectId = candidateId;
      }
    } catch {
      // ignore decode error
    }
  }

  // Derive scope from current route
  let currentScope: AthenaScope = "geral";
  if (pathname.includes("/codex")) currentScope = "juridico";
  if (pathname.includes("/research")) currentScope = "pesquisa";
  if (pathname.includes("/chronos") || pathname.includes("/projects")) currentScope = "produtividade";

  const engineStatus = useAthenaEngineStatus();

  const handleSend = async (textToSend?: string) => {
    const raw = textToSend || input;
    if (!raw.trim()) return;

    const userMsg: AthenaMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      text: raw.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scope: currentScope,
    };

    const updated = [...messages, userMsg];
    saveMessages(updated);
    setInput("");
    setIsTyping(true);

    try {
      const sessionId = routeProjectId ? `project-${routeProjectId}-sidecar-session` : "global-athena-session";
      const response = await processAthenaQueryAsync(
        raw,
        currentScope,
        store,
        routeProjectId,
        sessionId
      );
      saveMessages([...updated, response]);
    } catch {
      // fallback
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-2xl border border-violet-400/40 glow-accent transition-all duration-300 group hover:scale-105"
          title="Abrir Athena AI (Alt + A)"
        >
          <div className="relative">
            <Bot size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
          </div>
          <span className="text-xs font-bold tracking-tight hidden sm:inline">Athena</span>
          <kbd className="hidden md:inline text-[9px] bg-black/30 px-1 py-0.2 rounded font-mono text-violet-200">
            Alt+A
          </kbd>
        </button>
      )}

      {/* Floating Sidecar Drawer */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-full max-w-sm sm:max-w-md h-[520px] bg-[#0f0f1a] border border-[#2d2d4a] rounded-2xl shadow-2xl flex flex-col overflow-hidden clip-corner glow-accent animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a0f] border-b border-[#1e1e30]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Bot size={15} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    Athena Sidecar
                    <Sparkles size={12} className="text-violet-400" />
                  </h3>
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.2 rounded font-semibold",
                      engineStatus.isLocalNeuralActive
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-800 text-slate-400"
                    )}
                  >
                    {engineStatus.isLocalNeuralActive ? `Local: ${engineStatus.activeModel}` : "Offline Core"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Contexto: {pathname}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/modules/athena"
                className="p-1 text-slate-400 hover:text-violet-300"
                title="Expandir para o Hub Completo"
              >
                <Maximize2 size={13} />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isAthena = msg.sender === "athena";

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2 max-w-[90%]",
                    isAthena ? "items-start mr-auto" : "items-start ml-auto flex-row-reverse"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5",
                      isAthena
                        ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                        : "bg-cyan-600/20 text-cyan-300"
                    )}
                  >
                    {isAthena ? <Bot size={12} /> : "P"}
                  </div>

                  <div className="space-y-1">
                    <div
                      className={cn(
                        "p-3 rounded-xl text-xs leading-relaxed",
                        isAthena
                          ? "bg-[#14141f] border border-[#1e1e30] text-slate-200"
                          : "bg-violet-600 text-white shadow-sm"
                      )}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>

                      {msg.actionCard && (
                        <div className="mt-2 p-2 rounded-lg bg-[#0a0a0f] border border-violet-500/30 flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-semibold text-slate-200 truncate">
                            {msg.actionCard.title}
                          </span>
                          {msg.actionCard.link && (
                            <Link
                              href={msg.actionCard.link}
                              onClick={() => setIsOpen(false)}
                              className="text-violet-400 hover:underline flex items-center gap-0.5 flex-shrink-0"
                            >
                              <span>Ver</span>
                              <ArrowRight size={10} />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-1.5 text-[11px] text-violet-400 font-mono pl-8 animate-pulse">
                <Bot size={11} />
                <span>Athena processando...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Context Chips */}
          <div className="px-3 py-1.5 bg-[#0a0a0f]/60 border-t border-[#1e1e30] flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => handleSend("Diagnóstico rápido do sistema")}
              className="px-2 py-0.5 rounded bg-[#14141f] text-[10px] text-slate-400 hover:text-violet-300 border border-[#1e1e30] whitespace-nowrap"
            >
              Diagnóstico
            </button>
            <button
              onClick={() => handleSend("Quais são meus prazos mais urgentes?")}
              className="px-2 py-0.5 rounded bg-[#14141f] text-[10px] text-slate-400 hover:text-violet-300 border border-[#1e1e30] whitespace-nowrap"
            >
              Prazos
            </button>
            <button
              onClick={() => handleSend("Crie uma tarefa: ")}
              className="px-2 py-0.5 rounded bg-[#14141f] text-[10px] text-slate-400 hover:text-violet-300 border border-[#1e1e30] whitespace-nowrap"
            >
              + Tarefa
            </button>
          </div>

          {/* Input */}
          <div className="p-2.5 bg-[#0a0a0f] border-t border-[#1e1e30]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                placeholder="Pergunte ou dê uma ordem..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

