"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { ActorType, EntityType } from "@/lib/types";
import {
  Activity,
  Search,
  Filter,
  User,
  Bot,
  Cpu,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Flame,
  Clock,
  Sparkles,
  ArrowRight,
  FolderKanban,
  FileText,
  BookOpen,
  Scale,
  GraduationCap,
  Trophy,
  Code2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACTOR_CONFIG: Record<ActorType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  user: { label: "Paulo (Usuário)", icon: User, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" },
  athena: { label: "Athena AI", icon: Bot, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/30 text-violet-300" },
  system: { label: "Sistema", icon: Cpu, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30 text-orange-300" },
};

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  criou: { label: "Criou", icon: Plus, color: "text-emerald-400" },
  atualizou: { label: "Atualizou", icon: Edit, color: "text-blue-400" },
  concluiu: { label: "Concluiu", icon: CheckCircle2, color: "text-green-400" },
  moveu_lixeira: { label: "Moveu para a Lixeira", icon: Trash2, color: "text-amber-400" },
  restaurou: { label: "Restaurou da Lixeira", icon: RotateCcw, color: "text-cyan-400" },
  destruiu_permanentemente: { label: "Destruiu Permanentemente", icon: Flame, color: "text-red-400" },
  esvaziou_lixeira: { label: "Esvaziou a Lixeira", icon: Trash2, color: "text-red-500" },
  promoveu: { label: "Promoveu Ideia", icon: Sparkles, color: "text-purple-400" },
  arquivou: { label: "Arquivou", icon: Clock, color: "text-slate-400" },
};

export default function ActivityPage() {
  const { activities, projects } = useVarynthStore();

  const [search, setSearch] = useState("");
  const [selectedActor, setSelectedActor] = useState<string>("todos");
  const [selectedAction, setSelectedAction] = useState<string>("todas");
  const [selectedEntity, setSelectedEntity] = useState<string>("todas");

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (act.entityTitle && act.entityTitle.toLowerCase().includes(q)) ||
        act.action.toLowerCase().includes(q) ||
        (act.entityType && act.entityType.toLowerCase().includes(q));

      const matchesActor = selectedActor === "todos" || act.actorType === selectedActor;
      const matchesAction = selectedAction === "todas" || act.action === selectedAction;
      const matchesEntity = selectedEntity === "todas" || act.entityType === selectedEntity;

      return matchesSearch && matchesActor && matchesAction && matchesEntity;
    });
  }, [activities, search, selectedActor, selectedAction, selectedEntity]);

  return (
    <PageLayout title="Histórico & Auditoria" subtitle="Registro cronológico de todas as ações no VARYNTH OS">
      <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0f0f1a] border border-violet-500/30 clip-corner">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 glow-accent flex-shrink-0">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Audit Trail / Linha do Tempo
                <span className="text-xs px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold font-mono">
                  {activities.length} eventos
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Rastreamento centralizado de mutações executadas pelo Usuário, Athena AI e rotinas do Sistema.
              </p>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="space-y-3 p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Pesquisar por título do item, ação ou entidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Actor Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedActor("todos")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                  selectedActor === "todos"
                    ? "bg-violet-600 text-white shadow-sm glow-accent"
                    : "bg-[#0a0a0f] text-slate-400 hover:text-white border border-[#1e1e30]"
                )}
              >
                Todos Atores
              </button>

              <button
                onClick={() => setSelectedActor("user")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap flex items-center gap-1.5",
                  selectedActor === "user"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : "bg-[#0a0a0f] text-slate-400 border-[#1e1e30]"
                )}
              >
                <User size={12} className="text-cyan-400" />
                <span>Paulo</span>
              </button>

              <button
                onClick={() => setSelectedActor("athena")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap flex items-center gap-1.5",
                  selectedActor === "athena"
                    ? "bg-violet-500/20 text-violet-300 border-violet-500/50"
                    : "bg-[#0a0a0f] text-slate-400 border-[#1e1e30]"
                )}
              >
                <Bot size={12} className="text-violet-400" />
                <span>Athena AI</span>
              </button>

              <button
                onClick={() => setSelectedActor("system")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap flex items-center gap-1.5",
                  selectedActor === "system"
                    ? "bg-orange-500/20 text-orange-300 border-orange-500/50"
                    : "bg-[#0a0a0f] text-slate-400 border-[#1e1e30]"
                )}
              >
                <Cpu size={12} className="text-orange-400" />
                <span>Sistema</span>
              </button>
            </div>
          </div>
        </div>

        {/* Timeline Stream */}
        {filteredActivities.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3 clip-corner">
            <div className="w-12 h-12 rounded-xl bg-slate-800/30 border border-[#1e1e30] flex items-center justify-center mx-auto text-slate-600">
              <Activity size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-300">Nenhuma atividade registrada</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              As ações que você realizar no VARYNTH OS (criar tarefas, gerenciar workspaces, comandos da Athena ou mover itens para a Lixeira) serão auditadas aqui em tempo real.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#1e1e30]">
            {filteredActivities.map((act) => {
              const actor = ACTOR_CONFIG[act.actorType] || ACTOR_CONFIG.user;
              const ActorIcon = actor.icon;
              const actionConf = ACTION_CONFIG[act.action] || { label: act.action, icon: Sparkles, color: "text-slate-300" };
              const ActionIcon = actionConf.icon;

              const date = new Date(act.createdAt);
              const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              const dateStr = date.toLocaleDateString("pt-BR");

              return (
                <div key={act.id} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    className={cn(
                      "absolute -left-[27px] sm:-left-[31px] top-3.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0f] ring-2 flex items-center justify-center transition-transform group-hover:scale-125",
                      act.actorType === "athena"
                        ? "bg-violet-500 ring-violet-500/30"
                        : act.actorType === "system"
                        ? "bg-orange-500 ring-orange-500/30"
                        : "bg-cyan-500 ring-cyan-500/30"
                    )}
                  />

                  {/* Activity Card */}
                  <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-violet-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 clip-corner-sm">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Actor Badge */}
                        <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.2 rounded border font-bold uppercase", actor.bg)}>
                          <ActorIcon size={10} />
                          <span>{actor.label}</span>
                        </span>

                        {/* Action Badge */}
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", actionConf.color)}>
                          <ActionIcon size={12} />
                          <span>{actionConf.label}</span>
                        </span>

                        {/* Entity Type Badge */}
                        {act.entityType && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#14141f] text-slate-400 border border-[#1e1e30] uppercase font-mono">
                            {act.entityType}
                          </span>
                        )}
                      </div>

                      {/* Main Title */}
                      <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                        {act.entityTitle || "Operação sem título"}
                      </p>

                      {/* Metadata if any */}
                      {Boolean(act.metadata?.hasConflict) && (
                        <p className="text-[11px] text-amber-300 font-mono">
                          ⚠️ Conflito de ID detectado: novo identificador gerado automaticamente.
                        </p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-right font-mono text-[11px] text-slate-500 flex-shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#1e1e30]">
                      <span className="text-slate-300 font-bold">{timeStr}</span>
                      <span className="text-[10px]">{dateStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
