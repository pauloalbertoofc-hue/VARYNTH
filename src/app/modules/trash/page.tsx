"use client";

import { useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { TrashItem, TrashEntityType } from "@/lib/types";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import { StrongConfirmModal } from "@/components/ui/StrongConfirmModal";
import {
  Trash2,
  RotateCcw,
  Clock,
  AlertTriangle,
  FolderKanban,
  CheckSquare,
  FileText,
  BookOpen,
  Scale,
  GraduationCap,
  Trophy,
  Code2,
  Users,
  FlaskConical,
  Calendar,
  Sparkles,
  ExternalLink,
  Activity,
  User,
  Bot,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatePanel } from "@/components/ui/StatePanel";
import { Surface } from "@/components/ui/Surface";

const TYPE_CONFIG: Record<TrashEntityType, { label: string; icon: React.ElementType; color: string }> = {
  projeto: { label: "Projeto", icon: FolderKanban, color: "text-[var(--vly-info)] border-[var(--vly-border-info)] bg-[var(--vly-info)]/10" },
  tarefa: { label: "Tarefa", icon: CheckSquare, color: "text-[var(--vly-warning)] border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/10" },
  nota: { label: "Nota", icon: FileText, color: "text-[var(--vly-accent)] border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/10" },
  vault: { label: "Vault", icon: BookOpen, color: "text-[var(--vly-accent)] border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/10" },
  tese: { label: "Tese (Codex)", icon: Scale, color: "text-[var(--vly-info)] border-[var(--vly-border-info)] bg-[var(--vly-info)]/10" },
  evidencia: { label: "Evidência", icon: GraduationCap, color: "text-[var(--vly-success)] border-[var(--vly-border-success)] bg-[var(--vly-success)]/10" },
  edital: { label: "Edital", icon: Trophy, color: "text-[var(--vly-warning)] border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/10" },
  codigo: { label: "Código (Forge)", icon: Code2, color: "text-[var(--vly-warning)] border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/10" },
  pessoa: { label: "Pessoa", icon: Users, color: "text-[var(--vly-info)] border-[var(--vly-border-info)] bg-[var(--vly-info)]/10" },
  ideia: { label: "Ideia (Labs)", icon: FlaskConical, color: "text-[var(--vly-warning)] border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/10" },
  evento: { label: "Evento (Chronos)", icon: Calendar, color: "text-[var(--vly-info)] border-[var(--vly-border-info)] bg-[var(--vly-info)]/10" },
};

export default function TrashPage() {
  const { trashItems, restoreFromTrash, permanentDeleteTrash, emptyTrash } = useVarynthStore();

  const [filterType, setFilterType] = useState<string>("todos");
  const [selectedItemToDelete, setSelectedItemToDelete] = useState<TrashItem | null>(null);
  const [isStrongEmptyModalOpen, setIsStrongEmptyModalOpen] = useState(false);

  const filteredItems = trashItems.filter(
    (item) => filterType === "todos" || item.entityType === filterType
  );

  return (
    <PageLayout title="Lixeira Central" subtitle="Itens excluídos com retenção de 10 dias e rastreabilidade">
      <div className="vly-enter mx-auto max-w-5xl space-y-6 pb-12">
        {/* Header Banner */}
        <Surface tone="raised" className="border-[var(--vly-border-warning)] p-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/15 text-[var(--vly-warning)] glow-accent">
              <Trash2 size={24} />
            </div>
            <div>
              <h1 className="flex items-center gap-2 text-lg font-black text-[var(--vly-text-primary)] sm:text-xl">
                Lixeira do VARYNTH OS
                <span className="rounded border border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/10 px-2 py-0.5 font-mono text-xs font-bold text-[var(--vly-warning)]">
                  {trashItems.length} itens
                </span>
              </h1>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--vly-text-secondary)]">
                Itens movidos para a lixeira permanecem disponíveis por <span className="font-semibold text-[var(--vly-warning)]">10 dias</span> antes da auto-destruição permanente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/modules/activity"
              className="vly-interactive flex items-center gap-1.5 rounded-[var(--vly-radius-md)] border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-3.5 py-2 text-xs font-semibold text-[var(--vly-text-secondary)]"
            >
              <Activity size={13} className="text-[var(--vly-accent)]" />
              <span>Ver Audit Trail</span>
            </Link>

            {trashItems.length > 0 && (
              <button
                onClick={() => setIsStrongEmptyModalOpen(true)}
                className="vly-interactive flex items-center gap-1.5 rounded-[var(--vly-radius-md)] border border-[var(--vly-border-danger)] bg-[var(--vly-danger)]/10 px-3.5 py-2 text-xs font-bold text-[var(--vly-danger)]"
              >
                <Trash2 size={13} />
                <span>Esvaziar Lixeira</span>
              </button>
            )}
          </div>
        </Surface>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterType("todos")}
            className={cn(
              "vly-interactive rounded-[var(--vly-radius-md)] px-3 py-1.5 text-xs font-bold",
              filterType === "todos"
                ? "bg-[var(--vly-warning)] text-[var(--vly-accent-contrast)] shadow-sm glow-accent"
                : "border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            )}
          >
            Todos ({trashItems.length})
          </button>
          {Object.entries(TYPE_CONFIG).map(([key, val]) => {
            const count = trashItems.filter((t) => t.entityType === key).length;
            if (count === 0) return null;

            return (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={cn(
                  "vly-interactive flex items-center gap-1.5 rounded-[var(--vly-radius-md)] border px-3 py-1.5 text-xs font-medium",
                  filterType === key
                    ? "border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/20 text-[var(--vly-warning)]"
                    : "border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                )}
              >
                <span>{val.label}</span>
                <span className="text-[10px] opacity-70 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Trash List */}
        {filteredItems.length === 0 ? (
          <StatePanel tone="empty" title="A Lixeira está vazia" description="Itens movidos para a lixeira aparecerão aqui com prazo de 10 dias para restauração e Undo global." />
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const conf = TYPE_CONFIG[item.entityType] || TYPE_CONFIG.projeto;
              const Icon = conf.icon;

              const actorIcon = item.deletedByType === "athena" ? Bot : item.deletedByType === "system" ? Cpu : User;
              const ActorIconComp = actorIcon;

              return (
                <Surface
                  key={item.id}
                  tone="panel"
                  className="flex flex-col justify-between gap-4 p-4 transition-all hover:border-[var(--vly-border-warning)] sm:flex-row sm:items-center"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className={cn("p-2.5 rounded-xl border flex-shrink-0", conf.color)}>
                      <Icon size={18} />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[10px] px-2 py-0.2 rounded border font-bold uppercase", conf.color)}>
                          {conf.label}
                        </span>
                        <h4 className="truncate text-xs font-bold text-[var(--vly-text-primary)] sm:text-sm">
                          {item.title}
                        </h4>
                      </div>

                      {/* Extended Meta */}
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono text-[var(--vly-text-muted)]">
                        <span className="flex items-center gap-1 text-[var(--vly-text-secondary)]">
                          <ActorIconComp size={11} className={item.deletedByType === "athena" ? "text-[var(--vly-accent)]" : "text-[var(--vly-info)]"} />
                          <span>Por {item.deletedBy || "Paulo"} ({item.source || "manual"})</span>
                        </span>

                        <span>·</span>

                        <span className="flex items-center gap-1 font-semibold text-[var(--vly-warning)]">
                          <Clock size={11} />
                          Expira em {item.daysRemaining} {item.daysRemaining === 1 ? "dia" : "dias"}
                        </span>

                        {item.originalPath && (
                          <>
                            <span>·</span>
                            <span className="max-w-xs truncate text-[var(--vly-text-secondary)]">
                              Origem: {item.originalPath}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <button
                      onClick={() => restoreFromTrash(item.id)}
                      className="vly-interactive flex items-center gap-1.5 rounded-[var(--vly-radius-md)] border border-[var(--vly-border-success)] bg-[var(--vly-success)]/10 px-3 py-1.5 text-xs font-bold text-[var(--vly-success)] hover:bg-[var(--vly-success)]/20"
                      title="Restaurar de volta para a workspace/módulo"
                    >
                      <RotateCcw size={13} />
                      <span>Restaurar</span>
                    </button>

                    <button
                      onClick={() => setSelectedItemToDelete(item)}
                      className="vly-interactive flex items-center gap-1.5 rounded-[var(--vly-radius-md)] border border-[var(--vly-border-danger)] bg-[var(--vly-danger)]/10 px-3 py-1.5 text-xs font-bold text-[var(--vly-danger)] hover:bg-[var(--vly-danger)]/20"
                      title="Destruir permanentemente agora"
                    >
                      <Trash2 size={13} />
                      <span>Destruir Agora</span>
                    </button>
                  </div>
                </Surface>
              );
            })}
          </div>
        )}

        {/* Modal: Confirmação de Destruição Permanente */}
        {selectedItemToDelete && (
          <ConfirmDeleteModal
            isOpen={true}
            onClose={() => setSelectedItemToDelete(null)}
            onConfirm={() => permanentDeleteTrash(selectedItemToDelete.id)}
            itemTitle={selectedItemToDelete.title}
            itemType={TYPE_CONFIG[selectedItemToDelete.entityType]?.label || "Item"}
            isPermanent={true}
          />
        )}

        {/* Modal: Confirmação Forte para Esvaziar Toda a Lixeira */}
        <StrongConfirmModal
          isOpen={isStrongEmptyModalOpen}
          onClose={() => setIsStrongEmptyModalOpen(false)}
          onConfirm={emptyTrash}
          title="Esvaziar Toda a Lixeira?"
          description="Esta ação destruirá permanentemente todos os itens da Lixeira e não poderá ser desfeita."
          expectedWord="ESVAZIAR"
          itemCount={trashItems.length}
        />
      </div>
    </PageLayout>
  );
}
