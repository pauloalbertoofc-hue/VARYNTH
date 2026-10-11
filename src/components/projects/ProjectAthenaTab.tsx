"use client";

import { useEffect, useState } from "react";
import { Project } from "@/lib/types";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { Bot, Send, Sparkles, CheckCircle2, AlertCircle, ArrowRight, User } from "lucide-react";
import { cn } from "@/lib/utils";

import { processAthenaQueryAsync } from "@/lib/athena";
import { useAthenaEngineStatus } from "@/lib/athena/hooks/useAthenaEngineStatus";
import { AthenaMessageText } from "@/components/athena/AthenaMessageText";
import { athenaContextualMemory } from "@/lib/athena/memory/contextual-memory";

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
  const engineStatus = useAthenaEngineStatus();
  const { tasks, notes, isLoaded } = store;
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const projectNotes = notes.filter((n) => n.projectId === project.id);
  const pendingProjectTasks = projectTasks.filter((task) => task.status !== "concluida").length;

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

  useEffect(() => {
    if (!isLoaded) return;

    const taskLabel = projectTasks.length === 1 ? "tarefa" : "tarefas";
    const pendingLabel = pendingProjectTasks === 1 ? "pendente" : "pendentes";
    const noteLabel = projectNotes.length === 1 ? "nota vinculada" : "notas vinculadas";
    const welcomeText = `Olá, Paulo! Estou conectada à workspace do projeto **${project.title}**. Identifiquei ${projectTasks.length} ${taskLabel} (${pendingProjectTasks} ${pendingLabel}) e ${projectNotes.length} ${noteLabel}. Como posso te auxiliar neste projeto hoje?`;

    setMessages((current) =>
      current.length === 1 && current[0]?.id === "msg-1"
        ? [{ ...current[0], text: welcomeText }]
        : current
    );
  }, [isLoaded, project.title, projectTasks.length, projectNotes.length, pendingProjectTasks]);

  const promptChips = [
    "Resumir pendências e prazos",
    "Sugerir 3 próximas tarefas",
    "Identificar possíveis riscos",
    "Elaborar rascunho de apresentação",
  ];

  const handleSend = async (textToSend?: string) => {
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

    try {
      const sessionId = `project-${project.id}-session`;
      const response = await processAthenaQueryAsync(
        query,
        "geral",
        store,
        project.id,
        sessionId
      );
      athenaContextualMemory.recordInteraction(query, response.text, store, sessionId, project.id);

      setMessages((prev) => [
        ...prev,
        {
          id: response.id || "ath-" + Date.now(),
          sender: "athena",
          text: response.text,
          timestamp: response.timestamp || "Agora",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "ath-error-" + Date.now(),
          sender: "athena",
          text: "Não consegui concluir essa solicitação agora. Nenhuma ação foi aplicada ao projeto. Tente novamente; se o problema continuar, verifique o estado do motor local.",
          timestamp: "Agora",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[520px] rounded-xl bg-[var(--vly-surface)] border border-[var(--vly-border-subtle)] overflow-hidden">
      {/* Athena Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[var(--vly-world)] border-b border-[var(--vly-border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--vly-accent)]/30 bg-[var(--vly-accent)]/20 text-[var(--vly-accent)] glow-accent">
            <Bot size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--vly-text-primary)]">Athena Copilot</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded font-semibold",
                  engineStatus.isLocalNeuralActive
                    ? "bg-[var(--vly-success)]/10 text-[var(--vly-success)] border border-[var(--vly-success)]/20"
                    : "bg-[var(--vly-accent)]/10 text-[var(--vly-accent)] border border-[var(--vly-accent)]/20"
                )}
              >
                {engineStatus.isLocalNeuralActive
                  ? `Local: ${engineStatus.activeModel}`
                  : "Offline Core"}
              </span>
            </div>
            <p className="text-[11px] text-[var(--vly-text-secondary)] truncate max-w-xs">
              Contexto ativo: {project.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-[var(--vly-success)]/20 bg-[var(--vly-success)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--vly-success)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--vly-success)]" />
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
                    ? "bg-[var(--vly-accent)]/20 border border-[var(--vly-accent)]/30 text-[var(--vly-accent)]"
                    : "bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)]"
                )}
              >
                {isAthena ? <Bot size={14} /> : <User size={14} />}
              </div>

              <div
                className={cn(
                  "p-3.5 rounded-xl text-xs leading-relaxed",
                  isAthena
                    ? "bg-[var(--vly-surface-raised)] border border-[var(--vly-border-subtle)] text-[var(--vly-text-secondary)]"
                    : "bg-[var(--vly-accent)] text-[var(--vly-accent-contrast)]"
                )}
              >
                  <AthenaMessageText text={m.text} />
                <div
                  className={cn(
                    "text-[10px] mt-1 text-right",
                    isAthena ? "text-[var(--vly-text-muted)]" : "text-[var(--vly-accent-contrast)]/80"
                  )}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-2 mr-auto items-center text-xs text-[var(--vly-text-muted)] py-1">
            <Bot size={14} className="animate-pulse text-[var(--vly-accent)]" />
            <span>Athena está analisando o contexto...</span>
          </div>
        )}
      </div>

      {/* Chips */}
      <div className="px-4 py-2 bg-[var(--vly-world)]/60 border-t border-[var(--vly-border-subtle)] flex items-center gap-1.5 overflow-x-auto">
        {promptChips.map((chip) => (
          <button
            key={chip}
            onClick={() => handleSend(chip)}
            className="whitespace-nowrap rounded-full border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-2.5 py-1 text-[11px] text-[var(--vly-text-secondary)] transition-all hover:border-[var(--vly-accent)]/30 hover:bg-[var(--vly-accent)]/20 hover:text-[var(--vly-accent)]"
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
        className="p-3 bg-[var(--vly-world)] border-t border-[var(--vly-border-subtle)] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Pergunte algo sobre ${project.title}...`}
          className="vly-field flex-1 rounded-lg px-3 py-2 text-xs text-[var(--vly-text-primary)] placeholder:text-[var(--vly-text-muted)] focus:border-[var(--vly-accent)]/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          aria-label="Enviar mensagem para a Athena do projeto"
          className="shrink-0 rounded-lg bg-[var(--vly-accent)] p-2 text-[var(--vly-accent-contrast)] transition-colors hover:opacity-90 disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
