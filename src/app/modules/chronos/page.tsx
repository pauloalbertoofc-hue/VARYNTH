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
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Clock size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Chronos & Timeline
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Linha do tempo contínua, agregação de prazos de todos os projetos e histórico de conquistas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "timeline" ? (
              <button
                onClick={() => setIsMilestoneModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 glow-accent transition-all"
              >
                <Plus size={16} />
                <span>Novo Marco Histórico</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEventModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-all"
              >
                <Plus size={16} />
                <span>Novo Evento / Prazo</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-[#1e1e30] pb-1">
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
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                  isActive
                    ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
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
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={14} className="text-orange-400" />
                    <span>Prazos dos Projetos ({projectDeadlines.length})</span>
                  </h3>
                  <span className="text-xs text-slate-500">Sincronizado automaticamente</span>
                </div>

                <div className="space-y-2.5">
                  {projectDeadlines.length === 0 ? (
                    <div className="py-12 text-center rounded-xl bg-[#0f0f1a] border border-[#1e1e30] text-slate-500 text-xs">
                      Nenhum prazo definido em projetos.
                    </div>
                  ) : (
                    projectDeadlines.map((item) => (
                      <Link
                        key={item.id}
                        href={`/projects/${item.projectId}`}
                        className="group flex items-center justify-between p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-orange-500/40 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0">
                            <FolderKanban size={16} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-200 group-hover:text-orange-300 transition-colors truncate">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                {item.category}
                              </span>
                              <span className="text-[10px] text-slate-500">· Prioridade: {item.priority}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0 font-mono text-xs font-bold text-orange-400">
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
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={14} className="text-violet-400" />
                    <span>Compromissos Agendados</span>
                  </h3>
                  <button
                    onClick={() => setIsEventModalOpen(true)}
                    className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
                  >
                    + Novo
                  </button>
                </div>

                <div className="space-y-2">
                  {chronosEvents.length === 0 ? (
                    <div className="py-8 text-center rounded-xl bg-[#0f0f1a] border border-[#1e1e30] text-slate-500 text-xs">
                      Nenhum compromisso extra agendado.
                    </div>
                  ) : (
                    chronosEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="group flex items-start justify-between p-3 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-violet-500/40 transition-all"
                      >
                        <div>
                          <span className="text-[10px] px-2 py-0.2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase font-semibold">
                            {evt.type}
                          </span>
                          <h4 className="text-xs font-bold text-slate-200 mt-1">{evt.title}</h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                            <span>{evt.date}</span>
                            {evt.startTime && <span>às {evt.startTime}</span>}
                          </div>
                          {evt.notes && <p className="text-[11px] text-slate-400 mt-1">{evt.notes}</p>}
                        </div>

                        <button
                          onClick={() => deleteChronosEvent(evt.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                        >
                          <Trash2 size={12} />
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
              <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-1">
                <span className="text-xs text-slate-400">Tarefas Concluídas</span>
                <p className="text-3xl font-black text-orange-400 font-mono">
                  {tasks.filter((t) => t.status === "concluida").length}
                </p>
                <p className="text-[10px] text-slate-500">Histórico de produtividade real</p>
              </div>
              <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-1">
                <span className="text-xs text-slate-400">Tarefas Pendentes</span>
                <p className="text-3xl font-black text-emerald-400 font-mono">
                  {tasks.filter((t) => t.status !== "concluida").length}
                </p>
                <p className="text-[10px] text-slate-500">
                  {tasks.filter((t) => t.priority === "urgente" || t.priority === "alta").length} prioritárias
                </p>
              </div>
              <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-1">
                <span className="text-xs text-slate-400">Projetos com Prazos</span>
                <p className="text-3xl font-black text-violet-400 font-mono">
                  {projectDeadlines.length}
                </p>
                <p className="text-[10px] text-slate-500">Deadlines mapeados no OS</p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Recomendação de Foco da Athena
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {tasks.filter((t) => t.status !== "concluida" && (t.priority === "urgente" || t.priority === "alta")).length > 0
                  ? `Você possui ${tasks.filter((t) => t.status !== "concluida" && (t.priority === "urgente" || t.priority === "alta")).length} tarefas urgentes/altas pendentes no sistema. Inicie uma sessão de foco no Pomodoro do Cockpit para avançar.`
                  : "Nenhuma tarefa prioritária pendente no momento. Suas rotinas e prazos estão em dia!"}
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: Timeline Histórica */}
        {activeTab === "timeline" && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Milestone size={16} className="text-violet-400" />
                <span>Linha do Tempo Contínua do VARYNTH OS</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Registro perene de cada conquista, lançamento de projeto, versão de IA e pesquisa ao longo dos meses e anos.
              </p>
            </div>

            {/* Timeline Stream */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1e1e30]">
              {historicalMilestones.map((m) => (
                <div key={m.id} className="relative group">
                  <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-violet-500 border-2 border-[#0a0a0f] ring-2 ring-violet-500/30" />

                  <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-violet-500/40 transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                          {m.period}
                        </span>
                        {m.badge && (
                          <span className="text-[10px] px-2 py-0.2 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 font-semibold">
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteHistoricalMilestone(m.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                        title="Remover marco"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-slate-100 mt-1.5">{m.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Novo Evento / Prazo */}
        {isEventModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e1e30] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock size={16} className="text-orange-400" />
                  <span>Novo Evento / Prazo</span>
                </h2>
                <button onClick={() => setIsEventModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Título do Evento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Reunião com Orientador ou Prazo de Entrega"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Data *</label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Hora (Opcional)</label>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Tipo</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as ChronosEvent["type"])}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="prazo">Prazo Fatal</option>
                    <option value="reuniao">Reunião / Alinhamento</option>
                    <option value="evento">Evento / Aula</option>
                    <option value="rotina">Rotina de Estudos</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Vincular a Projeto</label>
                  <select
                    value={eventProject}
                    onChange={(e) => setEventProject(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">Geral / Sem Projeto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1e1e30]">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-orange-600 hover:bg-orange-500"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-[#0f0f1a] border border-[#2d2d4a] rounded-xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e1e30] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Milestone size={16} className="text-violet-400" />
                  <span>Registrar Marco Histórico</span>
                </h2>
                <button onClick={() => setIsMilestoneModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateMilestone} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Título do Marco *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Artigo de IA submetido para conferência"
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Período *</label>
                    <input
                      type="text"
                      placeholder="Ex: Setembro 2026"
                      value={milestonePeriod}
                      onChange={(e) => setMilestonePeriod(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Badge</label>
                    <input
                      type="text"
                      placeholder="Ex: Publicação, Conquista"
                      value={milestoneBadge}
                      onChange={(e) => setMilestoneBadge(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">Descrição</label>
                  <textarea
                    rows={3}
                    placeholder="Qual o impacto e significado dessa conquista?"
                    value={milestoneDesc}
                    onChange={(e) => setMilestoneDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs text-slate-100 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1e1e30]">
                  <button
                    type="button"
                    onClick={() => setIsMilestoneModalOpen(false)}
                    className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 glow-accent"
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
