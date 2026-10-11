"use client";

import { useEffect, useState } from "react";
import { Brain, Check, Clock3, Edit3, Filter, Lightbulb, Search, Settings2, ShieldCheck, Trash2, X } from "lucide-react";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { athenaContextualMemory, type DurableAthenaFact } from "@/lib/athena/memory/contextual-memory";
import { athenaSuggestionCenter, type SuggestionStatus } from "@/lib/athena/insights/suggestion-center";
import { cn } from "@/lib/utils";
import { athenaProactiveMonitor, type AthenaMonitorSettings } from "@/lib/athena/insights/proactive-monitor";
import { AthenaProjectPlanner } from "./AthenaProjectPlanner";
import { athenaProjectPlanManager } from "@/lib/athena/planning/project-plan-manager";
import { AthenaActionCenter } from "./AthenaActionCenter";
import { athenaActionCenter } from "@/lib/athena/insights/action-center";
import { AthenaIntegrationCenter } from "./AthenaIntegrationCenter";
import { Surface } from "@/components/ui/Surface";

interface Props {
  store: ReturnType<typeof useVarynthStore>;
  onPrompt: (prompt: string) => void;
}

type View = "pendencias" | "memorias" | "sugestoes" | "historico" | "planos" | "integracoes" | "configuracoes";

function formatDate(value?: string): string {
  if (!value) return "Data indisponível";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function AthenaGovernanceCenter({ store, onPrompt }: Props) {
  const [view, setView] = useState<View>("pendencias");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("todos");
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [revision, setRevision] = useState(0);
  const [feedback, setFeedback] = useState<string>();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<AthenaMonitorSettings>();

  useEffect(() => {
    setMounted(true); setSettings(athenaProactiveMonitor.getSettings());
    const refreshCenter = () => setRevision((value) => value + 1);
    window.addEventListener("varynth_athena_actions_updated", refreshCenter);
    window.addEventListener("varynth_project_plans_updated", refreshCenter);
    return () => { window.removeEventListener("varynth_athena_actions_updated", refreshCenter); window.removeEventListener("varynth_project_plans_updated", refreshCenter); };
  }, []);

  const facts = mounted ? athenaContextualMemory.getFacts() : [];
  const suggestions = mounted ? athenaSuggestionCenter.list(store) : [];
  const activeSuggestions = suggestions.filter((item) => item.status === "ativa" || item.status === "adiada");
  const historySuggestions = suggestions.filter((item) => item.status === "aceita" || item.status === "ignorada");

  const visibleFacts = facts.filter((fact) => {
    const matchesProject = projectFilter === "todos" || (projectFilter === "global" ? !fact.projectId : fact.projectId === projectFilter);
    return matchesProject && fact.text.toLowerCase().includes(query.toLowerCase());
  });

  const projectName = (id?: string) => id ? store.projects.find((project) => project.id === id)?.title || "Projeto removido" : "Memória global";
  const refresh = (message?: string) => { setRevision((value) => value + 1); setFeedback(message); };

  const updateSuggestion = (id: string, status: SuggestionStatus, message: string, snoozedUntil?: string) => {
    athenaSuggestionCenter.setStatus(id, status, snoozedUntil);
    refresh(message);
  };

  const createTaskFromSuggestion = (id: string, label: string, detail: string, projectId?: string) => {
    const title = label === "Projeto sem próxima ação" ? `Definir próxima ação — ${detail}` : `Resolver alerta — ${detail}`;
    const duplicate = store.tasks.some((task) => task.projectId === projectId && task.title === title && task.status !== "concluida");
    if (!duplicate) store.addTask({ title, projectId, priority: label.includes("atrasad") || label.includes("vencido") ? "urgente" : "alta", status: "a_fazer", tags: ["athena", "sugestao"] }, "athena");
    updateSuggestion(id, "aceita", duplicate ? "A tarefa correspondente já existia; a sugestão foi marcada como aceita." : "Sugestão aceita e transformada em tarefa.");
  };

  return (
    <Surface tone="panel" className="overflow-hidden" aria-label="Central de governança da Athena">
      <div className="flex flex-col gap-3 border-b border-[var(--vly-border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]"><ShieldCheck size={16} className="text-[var(--vly-accent)]" /> Central da Athena</h2>
          <p className="mt-1 text-[11px] text-[var(--vly-text-muted)]">Decida o que precisa avançar e controle memória, planos e recomendações.</p>
        </div>
        <div className="flex flex-wrap rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-world)] p-1">
          <button onClick={() => setView("pendencias")} className={cn("vly-interactive rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors", view === "pendencias" ? "bg-[var(--vly-accent)]/20 text-[var(--vly-accent)]" : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)]")}>Pendências <span className="ml-1 opacity-70">{mounted ? athenaActionCenter.list(store).length : 0}</span></button>
          {([['memorias', 'Memórias', facts.length], ['sugestoes', 'Sugestões', activeSuggestions.length], ['historico', 'Histórico', historySuggestions.length]] as const).map(([id, label, count]) => (
            <button key={id} onClick={() => setView(id)} className={cn("vly-interactive rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors", view === id ? "bg-[var(--vly-accent)]/20 text-[var(--vly-accent)]" : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)]")}>{label} <span className="ml-1 opacity-70">{count}</span></button>
          ))}
          <button onClick={() => setView("planos")} className={cn("vly-interactive rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors", view === "planos" ? "bg-[var(--vly-accent)]/20 text-[var(--vly-accent)]" : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)]")}>Planos <span className="ml-1 opacity-70">{mounted ? athenaProjectPlanManager.list().length : 0}</span></button>
          <button onClick={() => setView("integracoes")} className={cn("vly-interactive rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors", view === "integracoes" ? "bg-[var(--vly-accent)]/20 text-[var(--vly-accent)]" : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)]")}>Integrações</button>
          <button onClick={() => setView("configuracoes")} aria-label="Configurar proatividade" className={cn("vly-interactive rounded-lg px-2 py-1.5 transition-colors", view === "configuracoes" ? "bg-[var(--vly-accent)]/20 text-[var(--vly-accent)]" : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)]")}><Settings2 size={13} /></button>
        </div>
      </div>

      {feedback && <div className="vly-motion-success mx-4 mt-3 flex items-center justify-between rounded-lg border border-[var(--vly-border-default)] bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] px-3 py-2 text-[11px] text-[var(--vly-success)]"><span>{feedback}</span><button className="vly-interactive" onClick={() => setFeedback(undefined)} aria-label="Fechar aviso"><X size={13} /></button></div>}

      {view === "pendencias" && <AthenaActionCenter store={store} onPrompt={onPrompt} />}

      {view === "memorias" && (
        <div className="p-4">
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_220px]">
            <label className="vly-field flex items-center gap-2 rounded-xl px-3"><Search size={13} className="text-[var(--vly-text-muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar memórias..." className="w-full bg-transparent py-2 text-xs text-[var(--vly-text-secondary)] outline-none placeholder:text-[var(--vly-text-disabled)]" /></label>
            <label className="vly-field flex items-center gap-2 rounded-xl px-3"><Filter size={13} className="text-[var(--vly-text-muted)]" /><select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="w-full bg-transparent py-2 text-xs text-[var(--vly-text-secondary)] outline-none"><option value="todos">Todos os contextos</option><option value="global">Somente globais</option>{store.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
          </div>
          <div className="space-y-2">
            {visibleFacts.map((fact: DurableAthenaFact) => (
              <article key={fact.id} className="rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2"><span className="rounded-md bg-[var(--vly-surface-active)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--vly-accent-hover)]">{fact.kind}</span><span className="text-[10px] text-[var(--vly-text-muted)]">{projectName(fact.projectId)} · origem: pedido explícito · {formatDate(fact.updatedAt || fact.createdAt)}</span></div>
                    {editingId === fact.id ? <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} className="vly-field w-full px-2.5 py-2 text-xs" /> : <p className="text-xs leading-relaxed text-[var(--vly-text-secondary)]">{fact.text}</p>}
                  </div>
                  <div className="flex gap-1">
                    {editingId === fact.id ? <button aria-label="Salvar memória" onClick={() => { if (athenaContextualMemory.updateFact(fact.id, draft)) { setEditingId(undefined); refresh("Memória atualizada."); } }} className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/10"><Check size={14} /></button> : <button aria-label="Editar memória" onClick={() => { setEditingId(fact.id); setDraft(fact.text); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-300"><Edit3 size={14} /></button>}
                    <button aria-label="Excluir memória" onClick={() => { if (window.confirm(`Excluir a memória “${fact.text}”? Projetos e conversas não serão afetados.`) && athenaContextualMemory.deleteFact(fact.id)) refresh("Memória excluída sem afetar outros dados."); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              </article>
            ))}
            {!visibleFacts.length && <div className="rounded-xl border border-dashed border-[#2a2a40] py-8 text-center"><Brain size={20} className="mx-auto mb-2 text-slate-600" /><p className="text-xs text-slate-500">Nenhuma memória encontrada neste filtro.</p><button onClick={() => onPrompt("O que você lembra?")} className="mt-2 text-[11px] font-bold text-violet-400">Consultar Athena</button></div>}
          </div>
        </div>
      )}

      {(view === "sugestoes" || view === "historico") && (
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {(view === "sugestoes" ? activeSuggestions : historySuggestions).map((item) => (
            <article key={item.id} className="rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3">
              <div className="flex items-start gap-2"><Lightbulb size={15} className={cn("mt-0.5 shrink-0", item.severity === "critico" ? "text-[var(--vly-danger)]" : item.severity === "atencao" ? "text-[var(--vly-warning)]" : "text-[var(--vly-info)]")} /><div className="min-w-0"><h3 className="text-xs font-bold text-[var(--vly-text-primary)]">{item.label}</h3><p className="mt-1 text-[11px] text-[var(--vly-text-secondary)]">{item.detail}</p><p className="mt-1 text-[10px] text-[var(--vly-text-disabled)]">{projectName(item.projectId)} · {item.status}{item.snoozedUntil ? ` até ${formatDate(item.snoozedUntil)}` : ""}</p></div></div>
              {view === "sugestoes" && <div className="mt-3 flex flex-wrap gap-1.5"><button onClick={() => createTaskFromSuggestion(item.id, item.label, item.detail, item.projectId)} className="vly-interactive rounded-lg bg-[var(--vly-surface-active)] px-2 py-1 text-[10px] font-bold text-[var(--vly-accent-hover)] hover:bg-[var(--vly-surface-hover)]">Criar tarefa</button><button onClick={() => updateSuggestion(item.id, "adiada", "Sugestão adiada por 24 horas.", new Date(Date.now() + 86_400_000).toISOString())} className="vly-interactive flex items-center gap-1 rounded-lg border border-[var(--vly-border-default)] px-2 py-1 text-[10px] text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)]"><Clock3 size={10} /> Adiar</button><button onClick={() => updateSuggestion(item.id, "ignorada", "Sugestão ignorada e mantida no histórico.")} className="vly-interactive rounded-lg border border-[var(--vly-border-default)] px-2 py-1 text-[10px] text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)]">Ignorar</button></div>}
            </article>
          ))}
          {!(view === "sugestoes" ? activeSuggestions : historySuggestions).length && <div className="col-span-full rounded-xl border border-dashed border-[var(--vly-border-default)] py-8 text-center text-xs text-[var(--vly-text-muted)]">{view === "sugestoes" ? "Nenhuma sugestão ativa. O estado atual não exige intervenção." : "Nenhuma decisão sobre sugestões registrada."}</div>}
        </div>
      )}

      {view === "configuracoes" && settings && (
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <label className="space-y-1.5"><span className="text-[11px] font-bold text-[var(--vly-text-secondary)]">Nível de proatividade</span><select value={settings.mode} onChange={(event) => setSettings({ ...settings, mode: event.target.value as AthenaMonitorSettings["mode"] })} className="vly-field w-full rounded-xl px-3 py-2 text-xs"><option value="silencioso">Silencioso</option><option value="critico">Somente riscos críticos</option><option value="equilibrado">Equilibrado</option><option value="proativo">Proativo</option></select><p className="text-[10px] text-[var(--vly-text-disabled)]">Define quais diagnósticos podem gerar notificações.</p></label>
          <div className="space-y-2 rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3"><label className="flex items-center justify-between text-xs text-[var(--vly-text-secondary)]"><span>Horário silencioso</span><input type="checkbox" checked={settings.quietEnabled} onChange={(event) => setSettings({ ...settings, quietEnabled: event.target.checked })} /></label><div className="flex items-center gap-2"><input aria-label="Início do horário silencioso" type="time" value={settings.quietStart} onChange={(event) => setSettings({ ...settings, quietStart: event.target.value })} className="vly-field min-w-0 flex-1 px-2 py-1.5 text-xs" /><span className="text-[10px] text-[var(--vly-text-disabled)]">até</span><input aria-label="Fim do horário silencioso" type="time" value={settings.quietEnd} onChange={(event) => setSettings({ ...settings, quietEnd: event.target.value })} className="vly-field min-w-0 flex-1 px-2 py-1.5 text-xs" /></div></div>
          <div className="space-y-2 rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3"><label className="flex items-center justify-between text-xs text-[var(--vly-text-secondary)]"><span>Briefing diário</span><input type="checkbox" checked={settings.dailyBriefing} onChange={(event) => setSettings({ ...settings, dailyBriefing: event.target.checked })} /></label><input aria-label="Horário do briefing diário" type="time" value={settings.dailyTime} onChange={(event) => setSettings({ ...settings, dailyTime: event.target.value })} className="vly-field w-full px-2 py-1.5 text-xs" /></div>
          <div className="space-y-2 rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3"><label className="flex items-center justify-between text-xs text-[var(--vly-text-secondary)]"><span>Revisão semanal</span><input type="checkbox" checked={settings.weeklyReview} onChange={(event) => setSettings({ ...settings, weeklyReview: event.target.checked })} /></label><div className="flex gap-2"><select aria-label="Dia da revisão semanal" value={settings.weeklyDay} onChange={(event) => setSettings({ ...settings, weeklyDay: Number(event.target.value) })} className="vly-field min-w-0 flex-1 px-2 py-1.5 text-xs"><option value={1}>Segunda</option><option value={2}>Terça</option><option value={3}>Quarta</option><option value={4}>Quinta</option><option value={5}>Sexta</option><option value={6}>Sábado</option><option value={0}>Domingo</option></select><input aria-label="Horário da revisão semanal" type="time" value={settings.weeklyTime} onChange={(event) => setSettings({ ...settings, weeklyTime: event.target.value })} className="vly-field w-28 px-2 py-1.5 text-xs" /></div></div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-[var(--vly-border-accent)] bg-[var(--vly-surface)] p-3"><p className="text-[10px] text-[var(--vly-text-muted)]">O monitor funciona localmente enquanto o VARYNTH estiver aberto. Nenhuma ação destrutiva é automática.</p><button onClick={() => { athenaProactiveMonitor.saveSettings(settings); refresh("Preferências de proatividade salvas."); }} className="vly-interactive rounded-lg bg-[var(--vly-accent)] px-3 py-1.5 text-[11px] font-bold text-[var(--vly-accent-contrast)] hover:bg-[var(--vly-accent-hover)]">Salvar preferências</button></div>
        </div>
      )}

      {view === "planos" && <AthenaProjectPlanner store={store} />}
      {view === "integracoes" && <AthenaIntegrationCenter store={store} />}
    </Surface>
  );
}
