"use client";

import { useEffect, useMemo, useState } from "react";
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

  const facts = useMemo(() => mounted ? athenaContextualMemory.getFacts() : [], [mounted, revision]);
  const suggestions = useMemo(() => mounted ? athenaSuggestionCenter.list(store) : [], [mounted, store.projects, store.tasks, revision]);
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
    <section className="rounded-2xl border border-[#25253a] bg-[#0f0f1a] overflow-hidden" aria-label="Central de governança da Athena">
      <div className="flex flex-col gap-3 border-b border-[#25253a] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100"><ShieldCheck size={16} className="text-violet-400" /> Central da Athena</h2>
          <p className="mt-1 text-[11px] text-slate-500">Decida o que precisa avançar e controle memória, planos e recomendações.</p>
        </div>
        <div className="flex flex-wrap rounded-xl border border-[#2a2a40] bg-[#0a0a0f] p-1">
          <button onClick={() => setView("pendencias")} className={cn("rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors", view === "pendencias" ? "bg-violet-600/20 text-violet-300" : "text-slate-500 hover:text-slate-300")}>Pendências <span className="ml-1 opacity-70">{mounted ? athenaActionCenter.list(store).length : 0}</span></button>
          {([['memorias', 'Memórias', facts.length], ['sugestoes', 'Sugestões', activeSuggestions.length], ['historico', 'Histórico', historySuggestions.length]] as const).map(([id, label, count]) => (
            <button key={id} onClick={() => setView(id)} className={cn("rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors", view === id ? "bg-violet-600/20 text-violet-300" : "text-slate-500 hover:text-slate-300")}>{label} <span className="ml-1 opacity-70">{count}</span></button>
          ))}
          <button onClick={() => setView("planos")} className={cn("rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors", view === "planos" ? "bg-violet-600/20 text-violet-300" : "text-slate-500 hover:text-slate-300")}>Planos <span className="ml-1 opacity-70">{mounted ? athenaProjectPlanManager.list().length : 0}</span></button>
          <button onClick={() => setView("integracoes")} className={cn("rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors", view === "integracoes" ? "bg-violet-600/20 text-violet-300" : "text-slate-500 hover:text-slate-300")}>Integrações</button>
          <button onClick={() => setView("configuracoes")} aria-label="Configurar proatividade" className={cn("rounded-lg px-2 py-1.5 transition-colors", view === "configuracoes" ? "bg-violet-600/20 text-violet-300" : "text-slate-500 hover:text-slate-300")}><Settings2 size={13} /></button>
        </div>
      </div>

      {feedback && <div className="mx-4 mt-3 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300"><span>{feedback}</span><button onClick={() => setFeedback(undefined)} aria-label="Fechar aviso"><X size={13} /></button></div>}

      {view === "pendencias" && <AthenaActionCenter store={store} onPrompt={onPrompt} />}

      {view === "memorias" && (
        <div className="p-4">
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_220px]">
            <label className="flex items-center gap-2 rounded-xl border border-[#25253a] bg-[#0a0a0f] px-3"><Search size={13} className="text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar memórias..." className="w-full bg-transparent py-2 text-xs text-slate-200 outline-none placeholder:text-slate-600" /></label>
            <label className="flex items-center gap-2 rounded-xl border border-[#25253a] bg-[#0a0a0f] px-3"><Filter size={13} className="text-slate-500" /><select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="w-full bg-[#0a0a0f] py-2 text-xs text-slate-300 outline-none"><option value="todos">Todos os contextos</option><option value="global">Somente globais</option>{store.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
          </div>
          <div className="space-y-2">
            {visibleFacts.map((fact: DurableAthenaFact) => (
              <article key={fact.id} className="rounded-xl border border-[#25253a] bg-[#12121d] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2"><span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-300">{fact.kind}</span><span className="text-[10px] text-slate-500">{projectName(fact.projectId)} · origem: pedido explícito · {formatDate(fact.updatedAt || fact.createdAt)}</span></div>
                    {editingId === fact.id ? <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} className="w-full rounded-lg border border-violet-500/40 bg-[#0a0a0f] px-2.5 py-2 text-xs text-slate-100 outline-none" /> : <p className="text-xs leading-relaxed text-slate-200">{fact.text}</p>}
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
            <article key={item.id} className="rounded-xl border border-[#25253a] bg-[#12121d] p-3">
              <div className="flex items-start gap-2"><Lightbulb size={15} className={cn("mt-0.5 shrink-0", item.severity === "critico" ? "text-rose-400" : item.severity === "atencao" ? "text-amber-400" : "text-cyan-400")} /><div className="min-w-0"><h3 className="text-xs font-bold text-slate-100">{item.label}</h3><p className="mt-1 text-[11px] text-slate-400">{item.detail}</p><p className="mt-1 text-[10px] text-slate-600">{projectName(item.projectId)} · {item.status}{item.snoozedUntil ? ` até ${formatDate(item.snoozedUntil)}` : ""}</p></div></div>
              {view === "sugestoes" && <div className="mt-3 flex flex-wrap gap-1.5"><button onClick={() => createTaskFromSuggestion(item.id, item.label, item.detail, item.projectId)} className="rounded-lg bg-violet-600/20 px-2 py-1 text-[10px] font-bold text-violet-300 hover:bg-violet-600/30">Criar tarefa</button><button onClick={() => updateSuggestion(item.id, "adiada", "Sugestão adiada por 24 horas.", new Date(Date.now() + 86_400_000).toISOString())} className="flex items-center gap-1 rounded-lg border border-[#303048] px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200"><Clock3 size={10} /> Adiar</button><button onClick={() => updateSuggestion(item.id, "ignorada", "Sugestão ignorada e mantida no histórico.")} className="rounded-lg border border-[#303048] px-2 py-1 text-[10px] text-slate-500 hover:text-slate-300">Ignorar</button></div>}
            </article>
          ))}
          {!(view === "sugestoes" ? activeSuggestions : historySuggestions).length && <div className="col-span-full rounded-xl border border-dashed border-[#2a2a40] py-8 text-center text-xs text-slate-500">{view === "sugestoes" ? "Nenhuma sugestão ativa. O estado atual não exige intervenção." : "Nenhuma decisão sobre sugestões registrada."}</div>}
        </div>
      )}

      {view === "configuracoes" && settings && (
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <label className="space-y-1.5"><span className="text-[11px] font-bold text-slate-300">Nível de proatividade</span><select value={settings.mode} onChange={(event) => setSettings({ ...settings, mode: event.target.value as AthenaMonitorSettings["mode"] })} className="w-full rounded-xl border border-[#2a2a40] bg-[#0a0a0f] px-3 py-2 text-xs text-slate-200"><option value="silencioso">Silencioso</option><option value="critico">Somente riscos críticos</option><option value="equilibrado">Equilibrado</option><option value="proativo">Proativo</option></select><p className="text-[10px] text-slate-600">Define quais diagnósticos podem gerar notificações.</p></label>
          <div className="space-y-2 rounded-xl border border-[#25253a] bg-[#12121d] p-3"><label className="flex items-center justify-between text-xs text-slate-300"><span>Horário silencioso</span><input type="checkbox" checked={settings.quietEnabled} onChange={(event) => setSettings({ ...settings, quietEnabled: event.target.checked })} /></label><div className="flex items-center gap-2"><input aria-label="Início do horário silencioso" type="time" value={settings.quietStart} onChange={(event) => setSettings({ ...settings, quietStart: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-[#2a2a40] bg-[#0a0a0f] px-2 py-1.5 text-xs text-slate-300" /><span className="text-[10px] text-slate-600">até</span><input aria-label="Fim do horário silencioso" type="time" value={settings.quietEnd} onChange={(event) => setSettings({ ...settings, quietEnd: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-[#2a2a40] bg-[#0a0a0f] px-2 py-1.5 text-xs text-slate-300" /></div></div>
          <div className="space-y-2 rounded-xl border border-[#25253a] bg-[#12121d] p-3"><label className="flex items-center justify-between text-xs text-slate-300"><span>Briefing diário</span><input type="checkbox" checked={settings.dailyBriefing} onChange={(event) => setSettings({ ...settings, dailyBriefing: event.target.checked })} /></label><input aria-label="Horário do briefing diário" type="time" value={settings.dailyTime} onChange={(event) => setSettings({ ...settings, dailyTime: event.target.value })} className="w-full rounded-lg border border-[#2a2a40] bg-[#0a0a0f] px-2 py-1.5 text-xs text-slate-300" /></div>
          <div className="space-y-2 rounded-xl border border-[#25253a] bg-[#12121d] p-3"><label className="flex items-center justify-between text-xs text-slate-300"><span>Revisão semanal</span><input type="checkbox" checked={settings.weeklyReview} onChange={(event) => setSettings({ ...settings, weeklyReview: event.target.checked })} /></label><div className="flex gap-2"><select aria-label="Dia da revisão semanal" value={settings.weeklyDay} onChange={(event) => setSettings({ ...settings, weeklyDay: Number(event.target.value) })} className="min-w-0 flex-1 rounded-lg border border-[#2a2a40] bg-[#0a0a0f] px-2 py-1.5 text-xs text-slate-300"><option value={1}>Segunda</option><option value={2}>Terça</option><option value={3}>Quarta</option><option value={4}>Quinta</option><option value={5}>Sexta</option><option value={6}>Sábado</option><option value={0}>Domingo</option></select><input aria-label="Horário da revisão semanal" type="time" value={settings.weeklyTime} onChange={(event) => setSettings({ ...settings, weeklyTime: event.target.value })} className="w-28 rounded-lg border border-[#2a2a40] bg-[#0a0a0f] px-2 py-1.5 text-xs text-slate-300" /></div></div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-violet-500/20 bg-violet-500/5 p-3"><p className="text-[10px] text-slate-500">O monitor funciona localmente enquanto o VARYNTH estiver aberto. Nenhuma ação destrutiva é automática.</p><button onClick={() => { athenaProactiveMonitor.saveSettings(settings); refresh("Preferências de proatividade salvas."); }} className="rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-violet-500">Salvar preferências</button></div>
        </div>
      )}

      {view === "planos" && <AthenaProjectPlanner store={store} />}
      {view === "integracoes" && <AthenaIntegrationCenter store={store} />}
    </section>
  );
}
