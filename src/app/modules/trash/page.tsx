"use client";

import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { TrashItem, TrashEntityType } from "@/lib/types";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<TrashEntityType, { label: string; icon: React.ElementType; color: string }> = {
  projeto: { label: "Projeto", icon: FolderKanban, color: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
  tarefa: { label: "Tarefa", icon: CheckSquare, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  nota: { label: "Nota", icon: FileText, color: "text-violet-400 border-violet-500/30 bg-violet-500/10" },
  vault: { label: "Vault", icon: BookOpen, color: "text-purple-400 border-purple-500/30 bg-purple-500/10" },
  tese: { label: "Tese (Codex)", icon: Scale, color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
  evidencia: { label: "Evidência", icon: GraduationCap, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  edital: { label: "Edital", icon: Trophy, color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" },
  codigo: { label: "Código (Forge)", icon: Code2, color: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
  pessoa: { label: "Pessoa", icon: Users, color: "text-teal-400 border-teal-500/30 bg-teal-500/10" },
  ideia: { label: "Ideia (Labs)", icon: FlaskConical, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  evento: { label: "Evento (Chronos)", icon: Calendar, color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
};

export default function TrashPage() {
  const { trashItems, restoreFromTrash, permanentDeleteTrash, emptyTrash } = useVarynthStore();

  const [filterType, setFilterType] = useState<string>("todos");
  const [selectedItemToDelete, setSelectedItemToDelete] = useState<TrashItem | null>(null);
  const [isEmptyTrashModalOpen, setIsEmptyTrashModalOpen] = useState(false);

  const filteredItems = trashItems.filter(
    (item) => filterType === "todos" || item.entityType === filterType
  );

  return (
    <PageLayout title="Lixeira Central" subtitle="Itens excluídos com retenção de 10 dias">
      <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0f0f1a] border border-orange-500/30 clip-corner">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 glow-accent flex-shrink-0">
              <Trash2 size={24} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Lixeira do VARYNTH OS
                <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold font-mono">
                  {trashItems.length} itens
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Itens movidos para a lixeira permanecem disponíveis por <span className="text-orange-300 font-semibold">10 dias</span> antes da auto-destruição permanente.
              </p>
            </div>
          </div>

          {trashItems.length > 0 && (
            <button
              onClick={() => setIsEmptyTrashModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 transition-all"
            >
              <Trash2 size={13} />
              <span>Esvaziar Lixeira</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterType("todos")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              filterType === "todos"
                ? "bg-orange-600 text-white shadow-sm glow-accent"
                : "bg-[#0f0f1a] text-slate-400 hover:text-white border border-[#1e1e30]"
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
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5",
                  filterType === key
                    ? "bg-orange-600/30 text-orange-200 border-orange-500/50"
                    : "bg-[#0f0f1a] text-slate-400 hover:text-white border-[#1e1e30]"
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
          <div className="py-20 text-center rounded-2xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3 clip-corner">
            <div className="w-12 h-12 rounded-xl bg-slate-800/30 border border-[#1e1e30] flex items-center justify-center mx-auto text-slate-600">
              <Trash2 size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-300">A Lixeira está vazia</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Nenhum item foi excluído recentemente. Quando você mover arquivos, notas ou tarefas para a lixeira, eles aparecerão aqui com prazo de 10 dias para restauração.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const conf = TYPE_CONFIG[item.entityType] || TYPE_CONFIG.projeto;
              const Icon = conf.icon;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-orange-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 clip-corner-sm"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className={cn("p-2 rounded-lg border flex-shrink-0", conf.color)}>
                      <Icon size={16} />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[10px] px-2 py-0.2 rounded border font-bold uppercase", conf.color)}>
                          {conf.label}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                          {item.title}
                        </h4>
                      </div>

                      <p className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
                        <span>Excluído em {new Date(item.deletedAt).toLocaleDateString()}</span>
                        <span>·</span>
                        <span className="text-orange-400 font-semibold flex items-center gap-1">
                          <Clock size={11} />
                          Auto-destruição em {item.daysRemaining} {item.daysRemaining === 1 ? "dia" : "dias"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <button
                      onClick={() => restoreFromTrash(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 transition-all"
                      title="Restaurar de volta para a workspace/módulo"
                    >
                      <RotateCcw size={13} />
                      <span>Restaurar</span>
                    </button>

                    <button
                      onClick={() => setSelectedItemToDelete(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-950/30 hover:bg-red-900/50 border border-red-500/30 transition-all"
                      title="Destruir permanentemente agora"
                    >
                      <Trash2 size={13} />
                      <span>Destruir Agora</span>
                    </button>
                  </div>
                </div>
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

        {/* Modal: Esvaziar Toda a Lixeira */}
        {isEmptyTrashModalOpen && (
          <ConfirmDeleteModal
            isOpen={true}
            onClose={() => setIsEmptyTrashModalOpen(false)}
            onConfirm={emptyTrash}
            itemTitle="Todos os itens da Lixeira"
            itemType="Lixeira Completa"
            isPermanent={true}
          />
        )}
      </div>
    </PageLayout>
  );
}
