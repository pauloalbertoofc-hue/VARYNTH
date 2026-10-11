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
import { Surface } from "@/components/ui/Surface";

const SCOPES: { id: AthenaScope; label: string; icon: React.ElementType; color: string }[] = [
  { id: "geral", label: "Visão Geral (OS)", icon: Layers, color: "text-[var(--vly-accent)] border-[color-mix(in_srgb,var(--vly-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--vly-accent)_10%,transparent)]" },
  { id: "juridico", label: "Modo Jurídico (Codex)", icon: Scale, color: "text-[var(--vly-info)] border-[color-mix(in_srgb,var(--vly-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--vly-info)_10%,transparent)]" },
  { id: "pesquisa", label: "Pesquisa Acadêmica", icon: GraduationCap, color: "text-[var(--vly-success)] border-[color-mix(in_srgb,var(--vly-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--vly-success)_10%,transparent)]" },
  { id: "produtividade", label: "Gestão & Prazos", icon: Zap, color: "text-[var(--vly-warning)] border-[color-mix(in_srgb,var(--vly-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)]" },
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
  const proactive = useMemo(() => analyzeAthenaState(store), [store]);
  const engineStatus = useAthenaEngineStatus();
  const [messages, setMessages] = useState<AthenaMessage[]>(INITIAL_MESSAGES);
  const [conversations, setConversations] = useState<AthenaConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [conversationQuery, setConversationQuery] = useState("");
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<AthenaScope>("geral");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const initialScopeRef = useRef(scope);

  useEffect(() => {
    const refresh = () => {
      const active = athenaConversationStore.getActive() || athenaConversationStore.create(initialScopeRef.current);
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
      <div className="vly-enter w-full min-w-0 max-w-5xl mx-auto space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--vly-accent)_16%,transparent)] border border-[color-mix(in_srgb,var(--vly-accent)_30%,transparent)] flex items-center justify-center text-[var(--vly-accent)] glow-accent">
                <Bot size={18} />
              </div>
              <h1 className="min-w-0 text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Athena Command Center
                <Sparkles size={16} className="text-[var(--vly-accent)]" />
              </h1>
            </div>
            <p className="text-xs text-[var(--vly-text-secondary)] mt-1">
              Copilot inteligente com leitura transversal do seu ecossistema digital e execução de comandos NLP.
            </p>
          </div>

          {/* Engine Status Badge with Auto-detection */}
          <div className="flex max-w-full min-w-0 items-center gap-2 flex-wrap">
            <div
              className={cn(
                "vly-interactive flex max-w-full min-w-0 items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border",
                engineStatus.isLocalNeuralActive
                  ? "bg-[color-mix(in_srgb,var(--vly-success)_10%,transparent)] border-[color-mix(in_srgb,var(--vly-success)_30%,transparent)] text-[var(--vly-success)]"
                  : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-default)] text-[var(--vly-text-secondary)]"
              )}
              title={engineStatus.engineDescription}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  engineStatus.isLocalNeuralActive
                    ? "bg-[var(--vly-success)] animate-pulse"
                    : "bg-[var(--vly-warning)]"
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
                className="vly-interactive ml-1"
                title="Escanear porta local (127.0.0.1:11434)"
              >
                <RefreshCw
                  size={12}
                    className={cn(engineStatus.isChecking && "animate-spin text-[var(--vly-accent)]")}
                />
              </button>
            </div>

            <button
              onClick={handleClearHistory}
              className="vly-interactive flex items-center gap-1 text-xs text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] p-1.5"
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
                  "vly-interactive flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border",
                  isSelected
                    ? sc.color
                    : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                )}
              >
                <Icon size={14} />
                <span>{sc.label}</span>
              </button>
            );
          })}
        </div>

        <Surface tone="panel" className="p-3 sm:p-4" aria-label="Sugestões proativas da Athena">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]">
                <Sparkles size={14} className="text-[var(--vly-accent)]" /> Percepção proativa
              </h2>
              <p className="mt-0.5 text-[11px] text-[var(--vly-text-muted)]">Leitura local dos seus dados, sem alterações automáticas.</p>
            </div>
            <button onClick={() => handleSend("Faça um diagnóstico geral do meu sistema")} className="vly-interactive rounded-lg border border-[color-mix(in_srgb,var(--vly-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--vly-accent)_10%,transparent)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--vly-accent)] hover:bg-[color-mix(in_srgb,var(--vly-accent)_20%,transparent)]">
              Ver diagnóstico
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button onClick={() => handleSend("Quais tarefas estão atrasadas? Faça um diagnóstico")} className="vly-interactive flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--vly-danger)_20%,transparent)] bg-[color-mix(in_srgb,var(--vly-danger)_5%,transparent)] p-3 text-left hover:bg-[color-mix(in_srgb,var(--vly-danger)_10%,transparent)]">
              <AlertTriangle size={16} className="text-[var(--vly-danger)]" />
              <span><strong className="block text-sm text-[var(--vly-text-primary)]">{proactive.overdueTasks.length + proactive.overdueProjects.length}</strong><span className="text-[11px] text-[var(--vly-text-secondary)]">prazos vencidos</span></span>
            </button>
            <button onClick={() => handleSend("O que preciso cuidar hoje?")} className="vly-interactive flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--vly-warning)_20%,transparent)] bg-[color-mix(in_srgb,var(--vly-warning)_5%,transparent)] p-3 text-left hover:bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)]">
              <ListChecks size={16} className="text-[var(--vly-warning)]" />
              <span><strong className="block text-sm text-[var(--vly-text-primary)]">{proactive.dueSoonTasks.length}</strong><span className="text-[11px] text-[var(--vly-text-secondary)]">prazos em 7 dias</span></span>
            </button>
            <button onClick={() => setInput("Encontre ")} className="vly-interactive flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--vly-info)_20%,transparent)] bg-[color-mix(in_srgb,var(--vly-info)_5%,transparent)] p-3 text-left hover:bg-[color-mix(in_srgb,var(--vly-info)_10%,transparent)]">
              <Search size={16} className="text-[var(--vly-info)]" />
              <span><strong className="block text-sm text-[var(--vly-text-primary)]">Busca global</strong><span className="text-[11px] text-[var(--vly-text-secondary)]">projetos, tarefas e notas</span></span>
            </button>
          </div>
        </Surface>

        <AthenaGovernanceCenter store={store} onPrompt={(prompt) => handleSend(prompt)} />

        <AthenaCapabilityPlanPanel store={store} />

        <AthenaGuardrailSettingsPanel />

        <AthenaObservabilityPanel />

        <Surface tone="panel" className="h-64 overflow-hidden" aria-label="Gerenciar conversas">
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
        </Surface>

        {conversations.some((conversation) => conversation.status === "TRASHED") && (
          <details className="rounded-xl border border-[color-mix(in_srgb,var(--vly-danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--vly-danger)_6%,var(--vly-surface))] p-3">
            <summary className="cursor-pointer text-xs font-bold text-[var(--vly-text-secondary)]">Lixeira de conversas ({conversations.filter((conversation) => conversation.status === "TRASHED").length})</summary>
            <div className="mt-3 space-y-2">
              {conversations.filter((conversation) => conversation.status === "TRASHED").map((conversation) => (
                <div key={conversation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--vly-border-subtle)] p-2">
                  <span className="min-w-0 truncate text-xs text-[var(--vly-text-secondary)]">{conversation.title}</span>
                  <span className="flex gap-2">
                    <button onClick={() => { athenaConversationStore.restore(conversation.id); selectConversation(conversation.id); }} className="text-[11px] font-bold text-[var(--vly-accent)] hover:brightness-110">Restaurar</button>
                    <button onClick={() => { if (window.confirm(`Excluir permanentemente a conversa “${conversation.title}”?`)) { athenaConversationStore.permanentlyDelete(conversation.id); athenaConversationManager.clearSession(conversation.id); setConversations(athenaConversationStore.list(true)); } }} className="text-[11px] font-bold text-[var(--vly-danger)] hover:brightness-110">Excluir definitivamente</button>
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {conversations.some((conversation) => conversation.status === "ARCHIVED") && (
          <details className="rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3">
            <summary className="cursor-pointer text-xs font-bold text-[var(--vly-text-secondary)]">Conversas arquivadas ({conversations.filter((conversation) => conversation.status === "ARCHIVED").length})</summary>
            <div className="mt-3 space-y-2">
              {conversations.filter((conversation) => conversation.status === "ARCHIVED").map((conversation) => (
                <div key={conversation.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--vly-border-subtle)] p-2"><span className="truncate text-xs text-[var(--vly-text-secondary)]">{conversation.title}</span><button onClick={() => { athenaConversationStore.restore(conversation.id); selectConversation(conversation.id); }} className="text-[11px] font-bold text-[var(--vly-accent)]">Reativar</button></div>
              ))}
            </div>
          </details>
        )}

        {/* Main Terminal Window */}
        <Surface tone="panel" className="flex w-full min-w-0 flex-col h-[560px] overflow-hidden clip-corner shadow-2xl p-0">
          {/* Terminal Titlebar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--vly-world)] border-b border-[var(--vly-border-subtle)] text-xs text-[var(--vly-text-secondary)]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--vly-accent)] animate-pulse" />
              <span className="font-mono text-[11px] font-bold text-[var(--vly-text-secondary)] uppercase tracking-wider">
                ATHENA CORE v4.0 · MODO: {scope.toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-[var(--vly-text-muted)] font-mono">
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
                        ? "bg-[color-mix(in_srgb,var(--vly-accent)_16%,transparent)] border border-[color-mix(in_srgb,var(--vly-accent)_40%,transparent)] text-[var(--vly-accent)] glow-accent"
                        : "bg-[color-mix(in_srgb,var(--vly-info)_16%,transparent)] border border-[color-mix(in_srgb,var(--vly-info)_40%,transparent)] text-[var(--vly-info)]"
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
                          ? "bg-[var(--vly-surface-raised)] border border-[var(--vly-border-strong)] text-[var(--vly-text-primary)]"
                          : "bg-[var(--vly-accent)] text-[var(--vly-accent-contrast)] rounded-tr-sm shadow-md"
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
                        <div className="mt-3 p-3 rounded-xl bg-[var(--vly-world)] border border-[color-mix(in_srgb,var(--vly-accent)_30%,transparent)] flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-[color-mix(in_srgb,var(--vly-accent)_16%,transparent)] text-[var(--vly-accent)] flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 size={14} />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-bold text-[var(--vly-text-primary)] truncate">{msg.actionCard.title}</h5>
                              {msg.actionCard.subtitle && (
                                <p className="text-[11px] text-[var(--vly-text-secondary)] truncate">{msg.actionCard.subtitle}</p>
                              )}
                            </div>
                          </div>

                          {msg.actionCard.link && (
                            <Link
                              href={msg.actionCard.link}
                              className="vly-interactive flex items-center gap-1 text-[11px] font-bold text-[var(--vly-accent)] hover:brightness-110 whitespace-nowrap bg-[color-mix(in_srgb,var(--vly-accent)_10%,transparent)] px-2.5 py-1 rounded-lg border border-[color-mix(in_srgb,var(--vly-accent)_20%,transparent)]"
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
                        "text-[10px] text-[var(--vly-text-muted)] block px-1 font-mono",
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
              <div className="flex items-center gap-2 text-xs text-[var(--vly-accent)] font-mono pl-11 animate-pulse">
                <Bot size={13} />
                <span>Athena processando diretivas do VARYNTH OS...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto overscroll-x-contain border-t border-[var(--vly-border-subtle)] bg-[color-mix(in_srgb,var(--vly-world)_60%,transparent)] px-3 sm:px-4 py-2">
            {PROMPT_CHIPS[scope].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip)}
                className="vly-interactive px-2.5 py-1 rounded-lg bg-[var(--vly-surface-raised)] hover:bg-[color-mix(in_srgb,var(--vly-accent)_20%,transparent)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-accent)] border border-[var(--vly-border-subtle)] hover:border-[color-mix(in_srgb,var(--vly-accent)_30%,transparent)] text-[11px] whitespace-nowrap"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-[var(--vly-world)] border-t border-[var(--vly-border-subtle)]">
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
                  aria-label="Mensagem para a Athena"
                  className="vly-field w-full pl-4 pr-10 py-2.5 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Enviar mensagem para a Athena"
                className="vly-interactive p-2.5 rounded-xl bg-[var(--vly-accent)] hover:brightness-110 disabled:opacity-50 text-[var(--vly-accent-contrast)] glow-accent"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </Surface>
      </div>
    </PageLayout>
  );
}
