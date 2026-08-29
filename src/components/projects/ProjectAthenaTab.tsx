"use client";

import { useState } from "react";
import { Project } from "@/lib/types";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { Bot, Send, Sparkles, CheckCircle2, AlertCircle, ArrowRight, User } from "lucide-react";
import { cn } from "@/lib/utils";

import { processAthenaQuery } from "@/lib/athena";

interface ProjectAthenaTabProps {
  project: Project;
}

interface Message {
  id: string;
  sender: "user" | "athena";
  text: string;
  timestamp: string;
}

export function ProjectAthenaTab({ project }: ProjectAthenaTabProps) {
  const store = useVarynthStore();
  const { tasks, notes, references } = store;
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const projectNotes = notes.filter((n) => n.projectId === project.id);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      sender: "athena",
      text: `Olá, Paulo! Estou conectada à workspace do projeto **${project.title}**. Identifiquei ${projectTasks.length} tarefas (${projectTasks.filter((t) => t.status !== "concluida").length} pendentes) e ${projectNotes.length} notas vinculadas. Como posso te auxiliar neste projeto hoje?`,
      timestamp: "Agora",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const promptChips = [
    "Resumir pendências e prazos",
    "Sugerir 3 próximas tarefas",
    "Identificar possíveis riscos",
    "Elaborar rascunho de apresentação",
  ];

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: Message = {
      id: "usr-" + Date.now(),
      sender: "user",
      text: query,
      timestamp: "Agora",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = processAthenaQuery(query, "geral", store, project.id, `project-${project.id}-session`);

      setMessages((prev) => [
        ...prev,
        {
          id: response.id || "ath-" + Date.now(),
          sender: "athena",
          text: response.text,
          timestamp: response.timestamp || "Agora",
        },
      ]);
      setIsTyping(false);
    }, 400);
  };

  return (
    <div className="flex flex-col h-[520px] rounded-xl bg-[#0f0f1a] border border-[#1e1e30] overflow-hidden">
      {/* Athena Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#0a0a0f] border-b border-[#1e1e30]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 glow-accent">
            <Bot size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-100">Athena Copilot</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
                Contextual
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-xs">
              Contexto ativo: {project.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Pronta</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => {
          const isAthena = m.sender === "athena";
          return (
            <div
              key={m.id}
              className={cn("flex gap-2.5 max-w-[85%]", isAthena ? "mr-auto" : "ml-auto flex-row-reverse")}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs",
                  isAthena
                    ? "bg-violet-600/20 border border-violet-500/30 text-violet-400"
                    : "bg-[#1e1e30] text-slate-300"
                )}
              >
                {isAthena ? <Bot size={14} /> : <User size={14} />}
              </div>

              <div
                className={cn(
                  "p-3.5 rounded-xl text-xs leading-relaxed",
                  isAthena
                    ? "bg-[#14141f] border border-[#1e1e30] text-slate-200"
                    : "bg-violet-600 text-white"
                )}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                <div
                  className={cn(
                    "text-[10px] mt-1 text-right",
                    isAthena ? "text-slate-500" : "text-violet-200"
                  )}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-2 mr-auto items-center text-xs text-slate-500 py-1">
            <Bot size={14} className="text-violet-400 animate-pulse" />
            <span>Athena está analisando o contexto...</span>
          </div>
        )}
      </div>

      {/* Chips */}
      <div className="px-4 py-2 bg-[#0a0a0f]/60 border-t border-[#1e1e30] flex items-center gap-1.5 overflow-x-auto">
        {promptChips.map((chip) => (
          <button
            key={chip}
            onClick={() => handleSend(chip)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-[#14141f] hover:bg-violet-600/20 text-slate-400 hover:text-violet-300 border border-[#1e1e30] hover:border-violet-500/30 whitespace-nowrap transition-all"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-[#0a0a0f] border-t border-[#1e1e30] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Pergunte algo sobre ${project.title}...`}
          className="flex-1 px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white transition-colors flex-shrink-0"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

