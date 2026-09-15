"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { processAthenaQueryAsync } from "@/lib/athena/engine";
import { useAthenaEngineStatus } from "@/lib/athena/hooks/useAthenaEngineStatus";
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
  Cpu,
  RefreshCw,
  AlertTriangle,
  ListChecks,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AthenaMessageText } from "@/components/athena/AthenaMessageText";
import { AthenaFeedbackControls } from "@/components/athena/AthenaFeedbackControls";
import { analyzeAthenaState } from "@/lib/athena/insights/global-intelligence";
import { athenaContextualMemory } from "@/lib/athena/memory/contextual-memory";
import { AthenaGovernanceCenter } from "@/components/athena/AthenaGovernanceCenter";
import { AthenaCapabilityPlanPanel } from "@/components/athena/AthenaCapabilityPlanPanel";
import { AthenaGuardrailSettingsPanel } from "@/components/athena/AthenaGuardrailSettings";
import { AthenaObservabilityPanel } from "@/components/athena/AthenaObservabilityPanel";
import { athenaObservabilityJournal } from "@/lib/athena/observability/local-observability-journal";
import { AthenaConversationList } from "@/components/athena/AthenaConversationList";
import { athenaConversationStore, ATHENA_CONVERSATIONS_EVENT, type AthenaConversation } from "@/lib/athena/conversation/conversation-store";
import { athenaConversationManager } from "@/lib/athena/conversation/conversation-manager";
import { capabilityPlanStore } from "@/lib/athena/runtime/capability-plan-store";
import { useAthenaConversationSync } from "@/lib/athena/conversation/use-athena-conversation-sync";

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
    text: "Olá! Sou a **Athena**, sua inteligência artificial transversal integrada ao **VARYNTH OS**.\n\nTenho visibilidade em tempo real sobre seus projetos, prazos, evidências científicas, teses da Argument Arena e editais. Você pode conversar comigo, pedir análises ou me dar ordens diretas para executar ações no sistema.",
    timestamp: "10:00",
    scope: "geral",
  },
];

export default function AthenaHubPage() {
  const conversationSync = useAthenaConversationSync();
  const store = useVarynthStore();
  const proactive = useMemo(() => analyzeAthenaState(store), [store.projects, store.tasks]);
  const engineStatus = useAthenaEngineStatus();
  const [messages, setMessages] = useState<AthenaMessage[]>(INITIAL_MESSAGES);
  const [conversations, setConversations] = useState<AthenaConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [conversationQuery, setConversationQuery] = useState("");
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<AthenaScope>("geral");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => {
      const active = athenaConversationStore.getActive() || athenaConversationStore.create(scope);
      setConversations(athenaConversationStore.list(true));
      setActiveConversationId(active.id);
      setMessages(active.messages.length ? active.messages : INITIAL_MESSAGES);
      setScope(active.scope);
      athenaConversationManager.updateSessionWithHistory(active.id, active.messages.length ? active.messages : INITIAL_MESSAGES);
    };
    refresh();
    window.addEventListener(ATHENA_CONVERSATIONS_EVENT, refresh);
    return () => window.removeEventListener(ATHENA_CONVERSATIONS_EVENT, refresh);
  }, []);

  const saveMessages = (msgs: AthenaMessage[]) => {
    setMessages(msgs);
    if (!activeConversationId) return;
    athenaConversationStore.saveMessages(activeConversationId, msgs, scope);
    setConversations(athenaConversationStore.list(true));
  };

  const createConversation = () => {
    const conversation = athenaConversationStore.create(scope);
    setActiveConversationId(conversation.id);
    setMessages(INITIAL_MESSAGES);
    setConversations(athenaConversationStore.list(true));
  };

  const selectConversation = (conversationId: string) => {
    const conversation = athenaConversationStore.activate(conversationId);
    if (!conversation) return;
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages.length ? conversation.messages : INITIAL_MESSAGES);
    setScope(conversation.scope);
    athenaConversationManager.updateSessionWithHistory(conversation.id, conversation.messages.length ? conversation.messages : INITIAL_MESSAGES);
    setConversations(athenaConversationStore.list(true));
  };

  const trashConversation = (conversationId: string) => {
    const pendingPlan = capabilityPlanStore.list().find((plan) => plan.sessionId === conversationId && ["PLANNED", "APPROVED", "RUNNING", "BLOCKED", "PAUSED", "INTERRUPTED"].includes(plan.status));
    if (pendingPlan) {
      window.alert("Esta conversa possui um plano operacional pendente. Cancele ou conclua o plano antes de excluí-la.");
      return;
    }
    athenaConversationStore.trash(conversationId);
    const active = athenaConversationStore.getActive() || athenaConversationStore.create(scope);
    setActiveConversationId(active.id);
    setMessages(active.messages.length ? active.messages : INITIAL_MESSAGES);
    setConversations(athenaConversationStore.list(true));
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
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

    try {
      const sessionId = activeConversationId || "global-athena-session";
      const response = await processAthenaQueryAsync(raw, scope, store, undefined, sessionId);
      try {
        athenaContextualMemory.recordInteraction(raw, response.text, store, sessionId);
      } catch (memoryError) {
        athenaObservabilityJournal.record({ category: "SYSTEM", type: "CONVERSATION_MEMORY_WRITE_FAILED", status: "FAILED", message: "A resposta foi preservada, mas o histórico contextual não pôde ser atualizado.", sessionId, details: { error: memoryError instanceof Error ? memoryError.message : String(memoryError) } });
      }
      saveMessages([...updated, response]);
    } catch (error) {
      athenaObservabilityJournal.record({ category: "SYSTEM", type: "CONVERSATION_RESPONSE_FAILED", status: "FAILED", message: "Falha ao compor a resposta local da Athena.", sessionId: activeConversationId || "global-athena-session", details: { error: error instanceof Error ? error.message : String(error) } });
      const failure: AthenaMessage = {
        id: "ath-error-" + Date.now(),
        sender: "athena",
        text: "Encontrei uma falha ao compor esta resposta local. Nenhuma ação foi aplicada. Tente novamente; se persistir, abra o Diagnóstico local para ver a causa registrada.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scope,
      };
      saveMessages([...updated, failure]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    if (activeConversationId) athenaConversationStore.trash(activeConversationId);
    createConversation();
  };

  return (
    <PageLayout title="Athena AI" subtitle={`Inteligência artificial transversal e command center${conversationSync === "synced" ? " · conversas sincronizadas" : conversationSync === "login_required" || conversationSync === "unavailable" ? " · histórico neste aparelho" : ""}`}>
      <div className="w-full min-w-0 max-w-5xl mx-auto space-y-6 overflow-x-hidden animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 glow-accent">
                <Bot size={18} />
              </div>
              <h1 className="min-w-0 text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Athena Command Center
                <Sparkles size={16} className="text-violet-400" />
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Copilot inteligente com leitura transversal do seu ecossistema digital e execução de comandos NLP.
            </p>
          </div>

          {/* Engine Status Badge with Auto-detection */}
          <div className="flex max-w-full min-w-0 items-center gap-2 flex-wrap">
            <div
              className={cn(
                "flex max-w-full min-w-0 items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                engineStatus.isLocalNeuralActive
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-800/80 border-slate-700 text-slate-300"
              )}
              title={engineStatus.engineDescription}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  engineStatus.isLocalNeuralActive
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-amber-400"
                )}
              />
              <Cpu size={13} className="opacity-70" />
              <span className="truncate">
                {engineStatus.isLocalNeuralActive
                  ? `Local: ${engineStatus.activeModel}`
                  : "Núcleo Determinístico Offline"}
              </span>

              <button
                onClick={() => engineStatus.checkStatus()}
                disabled={engineStatus.isChecking}
                className="hover:text-white transition-colors ml-1"
                title="Escanear porta local (127.0.0.1:11434)"
              >
                <RefreshCw
                  size={12}
                  className={cn(engineStatus.isChecking && "animate-spin text-violet-400")}
                />
              </button>
            </div>

            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors p-1.5"
              title="Limpar histórico de conversa"
            >
              <Trash2 size={13} />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        {/* Scope Selector */}
        <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain pb-1">
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

        <section className="rounded-2xl border border-[#1e1e30] bg-[#0f0f1a] p-3 sm:p-4" aria-label="Sugestões proativas da Athena">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
                <Sparkles size={14} className="text-violet-400" /> Percepção proativa
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">Leitura local dos seus dados, sem alterações automáticas.</p>
            </div>
            <button onClick={() => handleSend("Faça um diagnóstico geral do meu sistema")} className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-[11px] font-bold text-violet-300 hover:bg-violet-500/20">
              Ver diagnóstico
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button onClick={() => handleSend("Quais tarefas estão atrasadas? Faça um diagnóstico")} className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-left hover:bg-rose-500/10">
              <AlertTriangle size={16} className="text-rose-400" />
              <span><strong className="block text-sm text-slate-100">{proactive.overdueTasks.length + proactive.overdueProjects.length}</strong><span className="text-[11px] text-slate-400">prazos vencidos</span></span>
            </button>
            <button onClick={() => handleSend("O que preciso cuidar hoje?")} className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-left hover:bg-amber-500/10">
              <ListChecks size={16} className="text-amber-400" />
              <span><strong className="block text-sm text-slate-100">{proactive.dueSoonTasks.length}</strong><span className="text-[11px] text-slate-400">prazos em 7 dias</span></span>
            </button>
            <button onClick={() => setInput("Encontre ")} className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-left hover:bg-cyan-500/10">
              <Search size={16} className="text-cyan-400" />
              <span><strong className="block text-sm text-slate-100">Busca global</strong><span className="text-[11px] text-slate-400">projetos, tarefas e notas</span></span>
            </button>
          </div>
        </section>

        <AthenaGovernanceCenter store={store} onPrompt={(prompt) => handleSend(prompt)} />

        <AthenaCapabilityPlanPanel store={store} />

        <AthenaGuardrailSettingsPanel />

        <AthenaObservabilityPanel />

        <section className="h-64 overflow-hidden rounded-2xl border border-[#1e1e30] bg-[#0f0f1a]" aria-label="Gerenciar conversas">
          <AthenaConversationList
            conversations={athenaConversationStore.search(conversationQuery).filter((conversation) => conversation.status === "ACTIVE")}
            activeConversationId={activeConversationId}
            query={conversationQuery}
            onQueryChange={setConversationQuery}
            onCreate={createConversation}
            onSelect={selectConversation}
            onArchive={(conversationId) => { athenaConversationStore.archive(conversationId); setConversations(athenaConversationStore.list(true)); if (conversationId === activeConversationId) createConversation(); }}
            onTrash={trashConversation}
          />
        </section>

        {conversations.some((conversation) => conversation.status === "TRASHED") && (
          <details className="rounded-xl border border-[#30243a] bg-[#130f19] p-3">
            <summary className="cursor-pointer text-xs font-bold text-slate-300">Lixeira de conversas ({conversations.filter((conversation) => conversation.status === "TRASHED").length})</summary>
            <div className="mt-3 space-y-2">
              {conversations.filter((conversation) => conversation.status === "TRASHED").map((conversation) => (
                <div key={conversation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#30243a] p-2">
                  <span className="min-w-0 truncate text-xs text-slate-300">{conversation.title}</span>
                  <span className="flex gap-2">
                    <button onClick={() => { athenaConversationStore.restore(conversation.id); selectConversation(conversation.id); }} className="text-[11px] font-bold text-violet-300 hover:text-violet-200">Restaurar</button>
                    <button onClick={() => { if (window.confirm(`Excluir permanentemente a conversa “${conversation.title}”?`)) { athenaConversationStore.permanentlyDelete(conversation.id); athenaConversationManager.clearSession(conversation.id); setConversations(athenaConversationStore.list(true)); } }} className="text-[11px] font-bold text-rose-300 hover:text-rose-200">Excluir definitivamente</button>
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {conversations.some((conversation) => conversation.status === "ARCHIVED") && (
          <details className="rounded-xl border border-[#25253a] bg-[#0f0f1a] p-3">
            <summary className="cursor-pointer text-xs font-bold text-slate-400">Conversas arquivadas ({conversations.filter((conversation) => conversation.status === "ARCHIVED").length})</summary>
            <div className="mt-3 space-y-2">
              {conversations.filter((conversation) => conversation.status === "ARCHIVED").map((conversation) => (
                <div key={conversation.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#25253a] p-2"><span className="truncate text-xs text-slate-300">{conversation.title}</span><button onClick={() => { athenaConversationStore.restore(conversation.id); selectConversation(conversation.id); }} className="text-[11px] font-bold text-violet-300">Reativar</button></div>
              ))}
            </div>
          </details>
        )}

        {/* Main Terminal Window */}
        <div className="flex w-full min-w-0 flex-col h-[560px] rounded-2xl bg-[#0f0f1a] border border-[#1e1e30] overflow-hidden clip-corner shadow-2xl">
          {/* Terminal Titlebar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a0f] border-b border-[#1e1e30] text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="font-mono text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                ATHENA CORE v4.0 · MODO: {scope.toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-500 font-mono">
              <span>PROJETOS: {store.projects.length}</span>
              <span>VAULT: {store.vaultItems.length}</span>
              <span>ARENA: {store.theses.length}</span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 space-y-4">
            {messages.map((msg, index) => {
              const isAthena = msg.sender === "athena";

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex w-full min-w-0 gap-2 sm:gap-3",
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
                  <div className="min-w-0 max-w-[calc(100%-2.5rem)] sm:max-w-2xl space-y-2">
                    <div
                      className={cn(
                        "max-w-full overflow-hidden p-3 sm:p-4 rounded-2xl text-xs leading-relaxed space-y-2",
                        isAthena
                          ? "bg-[#14141f] border border-[#2d2d4a] text-slate-200"
                          : "bg-violet-600 text-white rounded-tr-sm shadow-md"
                      )}
                    >
                      <AthenaMessageText text={msg.text} />
                      {msg.sender === "athena" && (
                        <AthenaFeedbackControls
                          messageId={msg.id}
                          response={msg.text}
                          sessionId={activeConversationId || "global-athena-session"}
                          prompt={messages[index - 1]?.sender === "user" ? messages[index - 1].text : undefined}
                        />
                      )}

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

            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto overscroll-x-contain border-t border-[#1e1e30] bg-[#0a0a0f]/60 px-3 sm:px-4 py-2">
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
              className="flex min-w-0 items-center gap-2"
            >
              <div className="relative min-w-0 flex-1">
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
                aria-label="Enviar mensagem para a Athena"
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
