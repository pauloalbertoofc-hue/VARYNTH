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
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AthenaMessageText } from "./AthenaMessageText";
import { AthenaFeedbackControls } from "./AthenaFeedbackControls";
import { athenaContextualMemory } from "@/lib/athena/memory/contextual-memory";
import { AthenaCapabilityPlanPanel } from "./AthenaCapabilityPlanPanel";
import { AthenaObservabilityPanel } from "./AthenaObservabilityPanel";
import { athenaObservabilityJournal } from "@/lib/athena/observability/local-observability-journal";
import { athenaConversationStore, ATHENA_CONVERSATIONS_EVENT, type AthenaConversation } from "@/lib/athena/conversation/conversation-store";
import { athenaConversationManager } from "@/lib/athena/conversation/conversation-manager";
import { useAthenaConversationSync } from "@/lib/athena/conversation/use-athena-conversation-sync";
import { StatePanel } from "@/components/ui/StatePanel";

export function AthenaSidecar() {
  useAthenaConversationSync();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AthenaMessage[]>([
    {
      id: "sidecar-init",
      sender: "athena",
      text: "Olá! Estou acompanhando sua navegação no VARYNTH OS. Posso criar tarefas, resumir dados desta página ou tirar dúvidas a qualquer momento.",
      timestamp: "Agora",
      scope: "geral",
    },
  ]);
  const [conversations, setConversations] = useState<AthenaConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const pathname = usePathname();
  const store = useVarynthStore();
  const engineStatus = useAthenaEngineStatus();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isProjectWorkspace = /^\/projects\/[^/]+/.test(pathname);

  // Keyboard shortcut Alt + A
  useEffect(() => {
    const refresh = () => {
      const active = athenaConversationStore.getActive() || athenaConversationStore.create("geral");
      setConversations(athenaConversationStore.list());
      setActiveConversationId(active.id);
      if (active.messages.length) setMessages(active.messages);
      athenaConversationManager.updateSessionWithHistory(active.id, active.messages);
    };
    refresh();
    window.addEventListener(ATHENA_CONVERSATIONS_EVENT, refresh);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener(ATHENA_CONVERSATIONS_EVENT, refresh); };
  }, []);

  const saveMessages = (msgs: AthenaMessage[]) => {
    setMessages(msgs);
    if (!activeConversationId) return;
    athenaConversationStore.saveMessages(activeConversationId, msgs, currentScope);
    setConversations(athenaConversationStore.list());
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
      const sessionId = activeConversationId || (routeProjectId ? `project-${routeProjectId}-sidecar-session` : "global-athena-session");
      const response = await processAthenaQueryAsync(
        raw,
        currentScope,
        store,
        routeProjectId,
        sessionId
      );
      try {
        athenaContextualMemory.recordInteraction(raw, response.text, store, sessionId, routeProjectId);
      } catch (memoryError) {
        athenaObservabilityJournal.record({ category: "SYSTEM", type: "CONVERSATION_MEMORY_WRITE_FAILED", status: "FAILED", message: "A resposta foi preservada, mas o histórico contextual não pôde ser atualizado.", sessionId, projectId: routeProjectId, details: { error: memoryError instanceof Error ? memoryError.message : String(memoryError) } });
      }
      saveMessages([...updated, response]);
    } catch (error) {
      const failureSessionId = activeConversationId || (routeProjectId ? `project-${routeProjectId}-sidecar-session` : "global-athena-session");
      athenaObservabilityJournal.record({ category: "SYSTEM", type: "CONVERSATION_RESPONSE_FAILED", status: "FAILED", message: "Falha ao compor a resposta local da Athena.", sessionId: failureSessionId, projectId: routeProjectId, details: { error: error instanceof Error ? error.message : String(error) } });
      const failure: AthenaMessage = {
        id: "ath-error-" + Date.now(),
        sender: "athena",
        text: "Encontrei uma falha ao compor esta resposta local. Nenhuma ação foi aplicada. Tente novamente; se persistir, abra o Diagnóstico local para ver a causa registrada.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scope: currentScope,
      };
      saveMessages([...updated, failure]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && !isProjectWorkspace && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir Athena"
          className="fixed bottom-5 right-5 z-[var(--vly-z-drawer)] flex items-center gap-2 rounded-full border border-[var(--vly-border-strong)] bg-[var(--vly-accent)] px-3.5 py-2.5 text-[var(--vly-accent-contrast)] shadow-[var(--vly-shadow-floating)] vly-interactive group"
          title="Abrir Athena AI (Alt + A)"
        >
          <div className="relative">
            <Bot size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
          </div>
          <span className="text-xs font-bold tracking-tight hidden sm:inline">Athena</span>
          <kbd className="hidden md:inline rounded border border-[var(--vly-border-subtle)] bg-[var(--vly-world)] px-1 py-0.5 text-[9px] font-mono text-[var(--vly-text-primary)]">
            Alt+A
          </kbd>
        </button>
      )}

      {/* Floating Sidecar Drawer / Mobile Bottom Sheet */}
      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            className="sm:hidden fixed inset-0 bg-[var(--vly-overlay)] backdrop-blur-sm z-40 animate-fade-in"
            aria-hidden="true"
          />
          <div role="dialog" aria-modal="true" aria-labelledby="athena-sidecar-title" className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-5 sm:right-5 z-[var(--vly-z-modal)] flex h-[85dvh] w-full max-w-full flex-col overflow-hidden rounded-t-[var(--vly-radius-xl)] border border-[var(--vly-border-strong)] bg-[var(--vly-surface-floating)] shadow-[var(--vly-shadow-floating)] vly-enter sm:h-[520px] sm:max-w-md sm:rounded-[var(--vly-radius-xl)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Bot size={15} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 id="athena-sidecar-title" className="text-xs font-bold text-[var(--vly-text-primary)] flex items-center gap-1.5">
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
                <div className="mt-1 flex items-center gap-1">
                  <select
                    aria-label="Conversa ativa"
                    value={activeConversationId || ""}
                    onChange={(event) => {
                      const conversation = athenaConversationStore.activate(event.target.value);
                      if (conversation) { setActiveConversationId(conversation.id); setMessages(conversation.messages.length ? conversation.messages : []); athenaConversationManager.updateSessionWithHistory(conversation.id, conversation.messages); setConversations(athenaConversationStore.list()); }
                    }}
                    className="vly-field max-w-36 rounded px-1 py-0.5 text-[9px]"
                  >
                    {conversations.filter((conversation) => conversation.status === "ACTIVE").map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.title}</option>)}
                  </select>
                  <button
                    type="button"
                    aria-label="Nova conversa"
                    onClick={() => { const conversation = athenaConversationStore.create(currentScope, routeProjectId); setActiveConversationId(conversation.id); setMessages([]); setConversations(athenaConversationStore.list()); }}
                    className="vly-interactive rounded border border-[var(--vly-border-accent)] p-1 text-[var(--vly-accent)] hover:bg-[var(--vly-surface-hover)]"
                  ><Plus size={11} /></button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/modules/athena"
                aria-label="Abrir Athena no hub completo"
                className="vly-interactive rounded p-1 text-[var(--vly-text-secondary)] hover:text-[var(--vly-accent)]"
                title="Expandir para o Hub Completo"
              >
                <Maximize2 size={13} />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar Athena Sidecar"
                className="vly-interactive rounded p-1 text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <AthenaCapabilityPlanPanel store={store} compact />
          <AthenaObservabilityPanel compact />

          {/* Chat Messages */}
          <div role="log" aria-live="polite" aria-label="Mensagens da Athena" className="flex-1 space-y-3 overflow-y-auto bg-[var(--vly-world)] p-4">
            {!messages.length && <StatePanel tone="empty" title="Conversa pronta" description="Envie uma pergunta ou escolha um atalho para começar." />}
            {messages.map((msg, index) => {
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
                          ? "border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] text-[var(--vly-text-primary)]"
                          : "bg-[var(--vly-accent)] text-[var(--vly-accent-contrast)] shadow-sm"
                      )}
                    >
                      <AthenaMessageText text={msg.text} />
                      {msg.sender === "athena" && (
                        <AthenaFeedbackControls
                          messageId={msg.id}
                          response={msg.text}
                          sessionId={activeConversationId || (routeProjectId ? `project-${routeProjectId}-sidecar-session` : "global-athena-session")}
                          prompt={messages[index - 1]?.sender === "user" ? messages[index - 1].text : undefined}
                        />
                      )}

                      {msg.actionCard && (
                        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[var(--vly-border-accent)] bg-[var(--vly-surface)] p-2 text-[11px]">
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
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-3 py-1.5">
            <button
              type="button"
              onClick={() => handleSend("Diagnóstico rápido do sistema")}
              className="vly-interactive whitespace-nowrap rounded border border-[var(--vly-border-default)] bg-[var(--vly-surface)] px-2 py-0.5 text-[10px] text-[var(--vly-text-secondary)] hover:text-[var(--vly-accent)]"
            >
              Diagnóstico
            </button>
            <button
              type="button"
              onClick={() => handleSend("Quais são meus prazos mais urgentes?")}
              className="vly-interactive whitespace-nowrap rounded border border-[var(--vly-border-default)] bg-[var(--vly-surface)] px-2 py-0.5 text-[10px] text-[var(--vly-text-secondary)] hover:text-[var(--vly-accent)]"
            >
              Prazos
            </button>
            <button
              type="button"
              onClick={() => handleSend("Crie uma tarefa: ")}
              className="vly-interactive whitespace-nowrap rounded border border-[var(--vly-border-default)] bg-[var(--vly-surface)] px-2 py-0.5 text-[10px] text-[var(--vly-text-secondary)] hover:text-[var(--vly-accent)]"
            >
              + Tarefa
            </button>
          </div>

          {/* Input */}
          <div className="border-t border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                aria-label="Mensagem para a Athena"
                placeholder="Pergunte ou dê uma ordem..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="vly-field flex-1 rounded-lg px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Enviar mensagem para a Athena"
                className="vly-interactive rounded-lg bg-[var(--vly-accent)] p-1.5 text-[var(--vly-accent-contrast)] disabled:opacity-50"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      </>
    )}
  </>
  );
}
