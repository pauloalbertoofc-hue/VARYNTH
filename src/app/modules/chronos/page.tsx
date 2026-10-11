"use client";

import { useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { ChronosEvent, HistoricalMilestone } from "@/lib/types";
import {
  Clock,
  Calendar,
  Milestone,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Flame,
  Layers,
  ArrowRight,
  FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatePanel } from "@/components/ui/StatePanel";
import { Surface } from "@/components/ui/Surface";

type ChronosTab = "prazos" | "foco" | "timeline";

export default function ChronosPage() {
  const {
    projects,
    tasks,
    chronosEvents,
    historicalMilestones,
    addChronosEvent,
    deleteChronosEvent,
    addHistoricalMilestone,
    deleteHistoricalMilestone,
  } = useVarynthStore();

  const [activeTab, setActiveTab] = useState<ChronosTab>("prazos");

  // Event modal
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventType, setEventType] = useState<ChronosEvent["type"]>("prazo");
  const [eventProject, setEventProject] = useState("");
  const [eventNotes, setEventNotes] = useState("");

  // Milestone modal
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestonePeriod, setMilestonePeriod] = useState("Agosto 2026");
  const [milestoneDesc, setMilestoneDesc] = useState("");
  const [milestoneCategory, setMilestoneCategory] = useState<HistoricalMilestone["category"]>("projeto");
  const [milestoneBadge, setMilestoneBadge] = useState("Marco");

  // Project deadlines list
  const projectDeadlines = projects
    .filter((p) => p.deadline)
    .map((p) => ({
      id: `p-deadline-${p.id}`,
      title: `[Projeto] ${p.title}`,
      date: p.deadline!,
      type: "prazo" as const,
      projectId: p.id,
      category: p.category,
      priority: p.priority,
      status: p.status,
    }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;

    addChronosEvent({
      title: eventTitle.trim(),
      date: eventDate,
      startTime: eventTime || undefined,
      type: eventType,
      projectId: eventProject || undefined,
      notes: eventNotes.trim() || undefined,
      completed: false,
    });

    setEventTitle("");
    setEventDate("");
    setEventTime("");
    setEventNotes("");
    setIsEventModalOpen(false);
  };

  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim() || !milestonePeriod.trim()) return;

    addHistoricalMilestone({
      title: milestoneTitle.trim(),
      period: milestonePeriod.trim(),
      description: milestoneDesc.trim(),
      category: milestoneCategory,
      badge: milestoneBadge.trim() || "Marco",
      date: new Date().toISOString().split("T")[0],
    });

    setMilestoneTitle("");
    setMilestoneDesc("");
    setIsMilestoneModalOpen(false);
  };

  return (
    <PageLayout title="Chronos" subtitle="Gestão temporal, prazos e timeline histórica">
      <div className="vly-enter space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--vly-warning)_16%,transparent)] border border-[color-mix(in_srgb,var(--vly-warning)_30%,transparent)] flex items-center justify-center text-[var(--vly-warning)]">
                <Clock size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[var(--vly-text-primary)] tracking-tight">
                Chronos & Timeline
              </h1>
            </div>
            <p className="text-xs text-[var(--vly-text-secondary)] mt-1">
              Linha do tempo contínua, agregação de prazos de todos os projetos e histórico de conquistas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "timeline" ? (
              <button
                onClick={() => setIsMilestoneModalOpen(true)}
                className="vly-interactive flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[var(--vly-accent-contrast)] bg-[var(--vly-accent)] hover:brightness-110 glow-accent"
              >
                <Plus size={16} />
                <span>Novo Marco Histórico</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEventModalOpen(true)}
                className="vly-interactive flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[var(--vly-text-primary)] bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] border border-[var(--vly-border-accent)]"
              >
                <Plus size={16} />
                <span>Novo Evento / Prazo</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-[var(--vly-border-subtle)] pb-1">
          {[
            { id: "prazos", label: "Prazos & Calendário", icon: Calendar },
            { id: "foco", label: "Métricas de Foco & Rotinas", icon: Flame },
            { id: "timeline", label: `Timeline Histórica (${historicalMilestones.length})`, icon: Milestone },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ChronosTab)}
                className={cn(
                  "vly-interactive flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold",
                  isActive
                    ? "bg-[color-mix(in_srgb,var(--vly-warning)_16%,transparent)] text-[var(--vly-warning)] border border-[color-mix(in_srgb,var(--vly-warning)_40%,transparent)]"
                    : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)]"
                )}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Prazos & Calendário */}
        {activeTab === "prazos" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sincronização de Prazos de Projetos */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[var(--vly-text-secondary)] uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={14} className="text-[var(--vly-warning)]" />
                    <span>Prazos dos Projetos ({projectDeadlines.length})</span>
                  </h3>
                  <span className="text-xs text-[var(--vly-text-muted)]">Sincronizado automaticamente</span>
                </div>

                <div className="space-y-2.5">
                  {projectDeadlines.length === 0 ? (
                    <StatePanel tone="empty" className="bg-[var(--vly-surface)]" title="Nenhum prazo definido" description="Projetos com deadlines aparecerão aqui automaticamente." action={<Link href="/projects" className="vly-interactive inline-flex rounded-[var(--vly-radius-md)] bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"><FolderKanban size={13} className="mr-1" />Ver projetos</Link>} />
                  ) : (
                    projectDeadlines.map((item) => (
                      <Link
                        key={item.id}
                        href={`/projects/${item.projectId}`}
                        className="vly-interactive group flex items-center justify-between p-3.5 rounded-xl bg-[var(--vly-surface-panel)] border border-[var(--vly-border-subtle)] hover:border-[color-mix(in_srgb,var(--vly-warning)_40%,transparent)]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)] border border-[color-mix(in_srgb,var(--vly-warning)_20%,transparent)] flex items-center justify-center text-[var(--vly-warning)] flex-shrink-0">
                            <FolderKanban size={16} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[var(--vly-text-primary)] group-hover:text-[var(--vly-warning)] transition-colors truncate">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-[var(--vly-text-secondary)] uppercase font-semibold">
                                {item.category}
                              </span>
                              <span className="text-[10px] text-[var(--vly-text-muted)]">· Prioridade: {item.priority}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0 font-mono text-xs font-bold text-[var(--vly-warning)]">
                          <span>{item.date}</span>
                          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Eventos Customizados */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[var(--vly-text-secondary)] uppercase tracking-wider flex items-center gap-2">
                          <Clock size={14} className="text-[var(--vly-accent)]" />
                    <span>Compromissos Agendados</span>
                  </h3>
                  <button
                    onClick={() => setIsEventModalOpen(true)}
                    className="text-xs text-[var(--vly-warning)] hover:brightness-110 font-semibold"
                  >
                    + Novo
                  </button>
                </div>

                <div className="space-y-2">
                  {chronosEvents.length === 0 ? (
                    <StatePanel tone="empty" className="bg-[var(--vly-surface)]" title="Nenhum compromisso extra" description="Agende reuniões, eventos ou rotinas para manter seu tempo visível." action={<button type="button" onClick={() => setIsEventModalOpen(true)} className="vly-interactive rounded-[var(--vly-radius-md)] bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"><Plus size={13} className="mr-1 inline" />Novo evento</button>} />
                  ) : (
                    chronosEvents.map((evt) => (
                      <div
                        key={evt.id}
                          className="vly-interactive group flex items-start justify-between p-3 rounded-xl bg-[var(--vly-surface-panel)] border border-[var(--vly-border-subtle)] hover:border-[color-mix(in_srgb,var(--vly-accent)_40%,transparent)]"
                      >
                        <div>
                          <span className="text-[10px] px-2 py-0.2 rounded bg-[color-mix(in_srgb,var(--vly-accent)_10%,transparent)] text-[var(--vly-accent)] border border-[color-mix(in_srgb,var(--vly-accent)_20%,transparent)] uppercase font-semibold">
                            {evt.type}
                          </span>
                          <h4 className="text-xs font-bold text-[var(--vly-text-primary)] mt-1">{evt.title}</h4>
                          <div className="flex items-center gap-2 text-[11px] text-[var(--vly-text-secondary)] mt-1 font-mono">
                            <span>{evt.date}</span>
                            {evt.startTime && <span>às {evt.startTime}</span>}
                          </div>
                          {evt.notes && <p className="text-[11px] text-[var(--vly-text-secondary)] mt-1">{evt.notes}</p>}
                        </div>

                        <button
                          onClick={() => deleteChronosEvent(evt.id)}
                          className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-[var(--vly-text-muted)] hover:text-[var(--vly-danger)] transition-opacity touch-manipulation"
                          title="Remover evento"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Foco & Rotinas */}
        {activeTab === "foco" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Surface tone="panel" className="p-5 space-y-1">
                <span className="text-xs text-[var(--vly-text-secondary)]">Tarefas Concluídas</span>
                <p className="text-3xl font-black text-[var(--vly-warning)] font-mono">
                  {tasks.filter((t) => t.status === "concluida").length}
                </p>
                <p className="text-[10px] text-[var(--vly-text-muted)]">Histórico de produtividade real</p>
              </Surface>
              <Surface tone="panel" className="p-5 space-y-1">
                <span className="text-xs text-[var(--vly-text-secondary)]">Tarefas Pendentes</span>
                <p className="text-3xl font-black text-[var(--vly-success)] font-mono">
                  {tasks.filter((t) => t.status !== "concluida").length}
                </p>
                <p className="text-[10px] text-[var(--vly-text-muted)]">
                  {tasks.filter((t) => t.priority === "urgente" || t.priority === "alta").length} prioritárias
                </p>
              </Surface>
              <Surface tone="panel" className="p-5 space-y-1">
                <span className="text-xs text-[var(--vly-text-secondary)]">Projetos com Prazos</span>
                <p className="text-3xl font-black text-[var(--vly-accent)] font-mono">
                  {projectDeadlines.length}
                </p>
                <p className="text-[10px] text-[var(--vly-text-muted)]">Deadlines mapeados no OS</p>
              </Surface>
            </div>

            <Surface tone="panel" className="p-5 space-y-3">
              <h3 className="text-xs font-bold text-[var(--vly-text-primary)] uppercase tracking-wider">
                Recomendação de Foco da Athena
              </h3>
              <p className="text-xs text-[var(--vly-text-secondary)] leading-relaxed">
                {tasks.filter((t) => t.status !== "concluida" && (t.priority === "urgente" || t.priority === "alta")).length > 0
                  ? `Você possui ${tasks.filter((t) => t.status !== "concluida" && (t.priority === "urgente" || t.priority === "alta")).length} tarefas urgentes/altas pendentes no sistema. Inicie uma sessão de foco no Pomodoro do Cockpit para avançar.`
                  : "Nenhuma tarefa prioritária pendente no momento. Suas rotinas e prazos estão em dia!"}
              </p>
            </Surface>
          </div>
        )}

        {/* TAB 3: Timeline Histórica */}
        {activeTab === "timeline" && (
          <div className="space-y-6">
            <div className="p-5 rounded-[var(--vly-radius-lg)] bg-[var(--vly-surface-raised)] border border-[var(--vly-border-default)] space-y-2">
              <h3 className="text-xs font-bold text-[var(--vly-text-secondary)] uppercase tracking-wider flex items-center gap-2">
                <Milestone size={16} className="text-[var(--vly-accent)]" />
                <span>Linha do Tempo Contínua do VARYNTH OS</span>
              </h3>
              <p className="text-xs text-[var(--vly-text-secondary)] leading-relaxed">
                Registro perene de cada conquista, lançamento de projeto, versão de IA e pesquisa ao longo dos meses e anos.
              </p>
            </div>

            {/* Timeline Stream */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--vly-border-default)]">
              {historicalMilestones.map((m) => (
                <div key={m.id} className="relative group">
                  <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-[var(--vly-accent)] border-2 border-[var(--vly-world)] ring-2 ring-[color-mix(in_srgb,var(--vly-accent)_30%,transparent)]" />

                  <div className="p-4 rounded-[var(--vly-radius-lg)] bg-[var(--vly-surface-raised)] border border-[var(--vly-border-default)] hover:border-[var(--vly-border-accent)] transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--vly-accent)] uppercase tracking-wider">
                          {m.period}
                        </span>
                        {m.badge && (
                          <span className="text-[10px] px-2 py-0.2 rounded bg-[color-mix(in_srgb,var(--vly-accent)_10%,var(--vly-surface))] text-[var(--vly-accent-hover)] border border-[var(--vly-border-accent)] font-semibold">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteHistoricalMilestone(m.id)}
                        className="vly-interactive opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-[var(--vly-text-disabled)] hover:text-[var(--vly-danger)] transition-opacity touch-manipulation"
                        title="Remover marco"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-[var(--vly-text-primary)] mt-1.5">{m.title}</h4>
                    <p className="text-xs text-[var(--vly-text-secondary)] mt-1 leading-relaxed">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Novo Evento / Prazo */}
        {isEventModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--vly-overlay)] backdrop-blur-md vly-motion-enter">
            <div className="w-full max-w-md bg-[var(--vly-surface-floating)] border border-[var(--vly-border-strong)] rounded-[var(--vly-radius-lg)] shadow-[0_24px_70px_rgb(0_0_0_/_38%)] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] pb-3">
                <h2 className="text-sm font-bold text-[var(--vly-text-primary)] flex items-center gap-2">
                  <Clock size={16} className="text-[var(--vly-warning)]" />
                  <span>Novo Evento / Prazo</span>
                </h2>
                <button onClick={() => setIsEventModalOpen(false)} className="vly-interactive text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Título do Evento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Reunião com Orientador ou Prazo de Entrega"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="vly-field w-full px-3 py-2 text-xs"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Data *</label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="vly-field w-full px-2.5 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Hora (Opcional)</label>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="vly-field w-full px-2.5 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Tipo</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as ChronosEvent["type"])}
                    className="vly-field w-full px-2.5 py-2 text-xs"
                  >
                    <option value="prazo">Prazo Fatal</option>
                    <option value="reuniao">Reunião / Alinhamento</option>
                    <option value="evento">Evento / Aula</option>
                    <option value="rotina">Rotina de Estudos</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Vincular a Projeto</label>
                  <select
                    value={eventProject}
                    onChange={(e) => setEventProject(e.target.value)}
                    className="vly-field w-full px-2.5 py-2 text-xs"
                  >
                    <option value="">Geral / Sem Projeto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--vly-border-default)]">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="vly-interactive px-4 py-1.5 text-xs text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="vly-interactive px-5 py-1.5 rounded-[var(--vly-radius-md)] text-xs font-bold text-[var(--vly-accent-contrast)] bg-[var(--vly-warning)] hover:bg-[var(--vly-accent-hover)]"
                  >
                    Agendar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Novo Marco Histórico */}
        {isMilestoneModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--vly-overlay)] backdrop-blur-md vly-motion-enter">
            <div className="w-full max-w-md bg-[var(--vly-surface-floating)] border border-[var(--vly-border-strong)] rounded-[var(--vly-radius-lg)] shadow-[0_24px_70px_rgb(0_0_0_/_38%)] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] pb-3">
                <h2 className="text-sm font-bold text-[var(--vly-text-primary)] flex items-center gap-2">
                  <Milestone size={16} className="text-[var(--vly-accent)]" />
                  <span>Registrar Marco Histórico</span>
                </h2>
                <button onClick={() => setIsMilestoneModalOpen(false)} className="vly-interactive text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateMilestone} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Título do Marco *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Artigo de IA submetido para conferência"
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    className="vly-field w-full px-3 py-2 text-xs"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Período *</label>
                    <input
                      type="text"
                      placeholder="Ex: Setembro 2026"
                      value={milestonePeriod}
                      onChange={(e) => setMilestonePeriod(e.target.value)}
                      className="vly-field w-full px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Badge</label>
                    <input
                      type="text"
                      placeholder="Ex: Publicação, Conquista"
                      value={milestoneBadge}
                      onChange={(e) => setMilestoneBadge(e.target.value)}
                      className="vly-field w-full px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase block mb-1">Descrição</label>
                  <textarea
                    rows={3}
                    placeholder="Qual o impacto e significado dessa conquista?"
                    value={milestoneDesc}
                    onChange={(e) => setMilestoneDesc(e.target.value)}
                    className="vly-field w-full resize-none px-3 py-2 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--vly-border-default)]">
                  <button
                    type="button"
                    onClick={() => setIsMilestoneModalOpen(false)}
                    className="vly-interactive px-4 py-1.5 text-xs text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="vly-interactive px-5 py-1.5 rounded-[var(--vly-radius-md)] text-xs font-bold text-[var(--vly-accent-contrast)] bg-[var(--vly-accent)] hover:bg-[var(--vly-accent-hover)] glow-accent"
                  >
                    Registrar na Linha do Tempo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
