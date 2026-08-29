"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { processAthenaQuery } from "@/lib/athena/engine";
import { AthenaMessage, AthenaScope } from "@/lib/types";
import {
  Bot,
  Sparkles,
  Send,
  Trash2,
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  Calendar,
  Scale,
  GraduationCap,
  Trophy,
  Zap,
  Terminal,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SCOPES: { id: AthenaScope; label: string; icon: React.ElementType; color: string }[] = [
  { id: "geral", label: "Visão Geral (OS)", icon: Layers, color: "text-violet-400 border-violet-500/30 bg-violet-500/10" },
  { id: "juridico", label: "Modo Jurídico (Codex)", icon: Scale, color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
  { id: "pesquisa", label: "Pesquisa Acadêmica", icon: GraduationCap, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { id: "produtividade", label: "Gestão & Prazos", icon: Zap, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
];

const PROMPT_CHIPS: Record<AthenaScope, string[]> = {
  geral: [
    "Fazer um diagnóstico geral do meu sistema",
    "Quais são meus prazos mais urgentes?",
    "Crie uma tarefa urgente: Atualizar notas no projeto VARYNTH",
    "Quais editais e oportunidades estão abertos?",
  ],
  juridico: [
    "Analisar pontos fortes e fracos da tese sobre IA",
    "Quais precedentes do STF estão mapeados?",
    "Sugerir novos contra-argumentos para a Arena",
  ],
  pesquisa: [
    "Resumir evidências fortes do Evidence Board",
    "Como estruturar a metodologia do artigo de IA?",
    "Fazer fichamento de um novo artigo",
  ],
  produtividade: [
    "Quais tarefas devo priorizar hoje?",
    "Crie uma tarefa: Revisar prazos da semana",
    "Como está minha consistência de foco no Chronos?",
  ],
};

const INITIAL_MESSAGES: AthenaMessage[] = [
  {
    id: "init-1",
    sender: "athena",
    text: "Olá, Paulo! Sou a **Athena**, sua inteligência artificial transversal integrada ao **VARYNTH OS**.\n\nTenho visibilidade em tempo real sobre seus projetos, prazos, evidências científicas, teses da Argument Arena e editais. Você pode conversar comigo, pedir análises ou me dar ordens diretas para executar ações no sistema.",
    timestamp: "10:00",
    scope: "geral",
  },
];

export default function AthenaHubPage() {
  const store = useVarynthStore();
  const [messages, setMessages] = useState<AthenaMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<AthenaScope>("geral");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("varynth_athena_chat");
      if (saved) {
        setMessages(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const saveMessages = (newMessages: AthenaMessage[]) => {
    setMessages(newMessages);
    try {
      localStorage.setItem("varynth_athena_chat", JSON.stringify(newMessages));
    } catch {
      // ignore
    }
  };

  const handleSend = (textToSend?: string) => {
    const raw = textToSend || input;
    if (!raw.trim()) return;

    const userMsg: AthenaMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      text: raw.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scope,
    };

    const updated = [...messages, userMsg];
    saveMessages(updated);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = processAthenaQuery(raw, scope, store, undefined, "global-athena-session");
      saveMessages([...updated, response]);
      setIsTyping(false);
    }, 450);
  };

  const handleClearHistory = () => {
    saveMessages(INITIAL_MESSAGES);
  };

  return (
    <PageLayout title="Athena AI" subtitle="Inteligência artificial transversal e command center">
      <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 glow-accent">
                <Bot size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Athena Command Center
                <Sparkles size={16} className="text-violet-400" />
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Copilot inteligente com leitura transversal do seu ecossistema digital e execução de comandos NLP.
            </p>
          </div>

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors p-1.5"
            title="Limpar histórico de conversa"
          >
            <Trash2 size={13} />
            <span>Limpar Chat</span>
          </button>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {SCOPES.map((sc) => {
            const Icon = sc.icon;
            const isSelected = scope === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => setScope(sc.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border",
                  isSelected
                    ? sc.color
                    : "bg-[#0f0f1a] border-[#1e1e30] text-slate-400 hover:text-slate-200"
                )}
              >
                <Icon size={14} />
                <span>{sc.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Terminal Window */}
        <div className="flex flex-col h-[560px] rounded-2xl bg-[#0f0f1a] border border-[#1e1e30] overflow-hidden clip-corner shadow-2xl">
          {/* Terminal Titlebar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a0f] border-b border-[#1e1e30] text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="font-mono text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                ATHENA CORE v4.0 · MODO: {scope.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
              <span>PROJETOS: {store.projects.length}</span>
              <span>VAULT: {store.vaultItems.length}</span>
              <span>ARENA: {store.theses.length}</span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => {
              const isAthena = msg.sender === "athena";

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 max-w-3xl",
                    isAthena ? "items-start mr-auto" : "items-start ml-auto flex-row-reverse"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                      isAthena
                        ? "bg-violet-600/20 border border-violet-500/40 text-violet-300 glow-accent"
                        : "bg-cyan-600/20 border border-cyan-500/40 text-cyan-300"
                    )}
                  >
                    {isAthena ? <Bot size={15} /> : "P"}
                  </div>

                  {/* Bubble */}
                  <div className="space-y-2 max-w-2xl">
                    <div
                      className={cn(
                        "p-4 rounded-2xl text-xs leading-relaxed space-y-2",
                        isAthena
                          ? "bg-[#14141f] border border-[#2d2d4a] text-slate-200"
                          : "bg-violet-600 text-white rounded-tr-sm shadow-md"
                      )}
                    >
                      <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

                      {/* Action Card executed by Athena */}
                      {msg.actionCard && (
                        <div className="mt-3 p-3 rounded-xl bg-[#0a0a0f] border border-violet-500/30 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 size={14} />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-bold text-slate-100 truncate">{msg.actionCard.title}</h5>
                              {msg.actionCard.subtitle && (
                                <p className="text-[11px] text-slate-400 truncate">{msg.actionCard.subtitle}</p>
                              )}
                            </div>
                          </div>

                          {msg.actionCard.link && (
                            <Link
                              href={msg.actionCard.link}
                              className="flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:text-violet-300 whitespace-nowrap bg-violet-600/10 px-2.5 py-1 rounded-lg border border-violet-500/20"
                            >
                              <span>{msg.actionCard.linkLabel || "Abrir"}</span>
                              <ArrowRight size={12} />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>

                    <span
                      className={cn(
                        "text-[10px] text-slate-500 block px-1 font-mono",
                        isAthena ? "text-left" : "text-right"
                      )}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-violet-400 font-mono pl-11 animate-pulse">
                <Bot size={13} />
                <span>Athena processando diretivas do VARYNTH OS...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-4 py-2 bg-[#0a0a0f]/60 border-t border-[#1e1e30] flex items-center gap-1.5 overflow-x-auto">
            {PROMPT_CHIPS[scope].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip)}
                className="px-2.5 py-1 rounded-lg bg-[#14141f] hover:bg-violet-600/20 text-slate-400 hover:text-violet-300 border border-[#1e1e30] hover:border-violet-500/30 text-[11px] whitespace-nowrap transition-all"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-[#0a0a0f] border-t border-[#1e1e30]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Pergunte algo ou dê uma ordem (ex: 'Crie uma tarefa para...', 'Quais meus prazos?')..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
                />
              </div>

              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white glow-accent transition-all"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
