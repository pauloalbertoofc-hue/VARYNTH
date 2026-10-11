"use client";

import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { calculateGamification } from "@/lib/gamification/engine";
import {
  User,
  Shield,
  Star,
  Zap,
  Download,
  Upload,
  RefreshCw,
  Trophy,
  Award,
  Sparkles,
  CheckCircle2,
  FolderKanban,
  FileCode,
  Layers,
  Scale,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { backupService } from "@/lib/backup/backup-service";
import { BackupModal } from "@/components/backup/BackupModal";
import { EnvironmentPersonalization } from "@/components/admin/EnvironmentPersonalization";
import { Surface } from "@/components/ui/Surface";

export default function ProfilePage() {
  const store = useVarynthStore();
  const [importStatus, setImportStatus] = useState<string>("");

  const stats = calculateGamification({
    projects: store.projects,
    tasks: store.tasks,
    vaultItems: store.vaultItems,
    theses: store.theses,
    evidences: store.evidences,
    opportunities: store.opportunities,
    forgeFiles: store.forgeFiles,
  });

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Canonical Universal Backup Export
  const handleExportBackup = () => {
    try {
      const backup = backupService.exportVarynthBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `varynth-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setImportStatus(`✓ Backup canônico exportado com sucesso (${a.download}).`);
    } catch (err: any) {
      setImportStatus(`❌ Erro ao exportar backup: ${err?.message || err}`);
    }
  };

  return (
    <PageLayout title="Perfil & Gamificação" subtitle="Status de mestria, nível e central de backup do OS">
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
        {/* Gamer Card & Level Banner */}
        <Surface tone="raised" className="relative overflow-hidden border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/[0.04] p-6 shadow-2xl">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[var(--vly-accent)]/10 blur-3xl" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--vly-border-accent)] bg-[var(--vly-accent)] text-2xl font-black text-[var(--vly-accent-contrast)] shadow-lg glow-accent">
                P
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-[var(--vly-text-primary)]">Paulo</h2>
                  <span className="rounded-full border border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--vly-accent)]">
                    Dono do VARYNTH OS
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-bold text-[var(--vly-info)]">
                  Nível {stats.level} · {stats.title}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-[var(--vly-text-muted)]">
                  XP Total: {stats.totalXP.toLocaleString()} XP
                </p>
              </div>
            </div>

            {/* Quick KPIs */}
            <div className="flex items-center gap-4 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-world)]/80 px-4 py-2.5">
              <div className="text-center">
                <p className="text-lg font-black text-[var(--vly-text-primary)]">{store.projects.length}</p>
                <p className="text-[10px] font-semibold uppercase text-[var(--vly-text-muted)]">Projetos</p>
              </div>
              <div className="h-7 w-px bg-[var(--vly-border-subtle)]" />
              <div className="text-center">
                <p className="text-lg font-black text-[var(--vly-success)]">
                  {store.tasks.filter((t) => t.status === "concluida").length}
                </p>
                <p className="text-[10px] font-semibold uppercase text-[var(--vly-text-muted)]">Tarefas Feitas</p>
              </div>
              <div className="h-7 w-px bg-[var(--vly-border-subtle)]" />
              <div className="text-center">
                <p className="text-lg font-black text-[var(--vly-accent)]">{stats.badges.filter((b) => b.unlocked).length}</p>
                <p className="text-[10px] font-semibold uppercase text-[var(--vly-text-muted)]">Conquistas</p>
              </div>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="mt-6 space-y-1.5 border-t border-[var(--vly-border-subtle)]/80 pt-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-[var(--vly-text-secondary)]">Progresso para o Nível {stats.level + 1}</span>
              <span className="font-bold text-[var(--vly-accent)]">{stats.progressPercent}%</span>
            </div>
            <div className="w-full overflow-hidden rounded-full border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-0.5 h-2.5">
              <div
                className="h-full rounded-full bg-[var(--vly-accent)] transition-all duration-500"
                style={{ width: `${stats.progressPercent}%` }}
              />
            </div>
          </div>
        </Surface>

        <Surface tone="panel" className="p-5">
          <EnvironmentPersonalization account allowedNavigation={["/modules/vault", "/modules/music", "/modules/athena", "/modules/studio"]} />
        </Surface>

        {/* Badges & Achievements Grid */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--vly-text-secondary)]">
            <Trophy size={14} className="text-[var(--vly-warning)]" />
            <span>Mural de Conquistas ({stats.badges.filter((b) => b.unlocked).length} / {stats.badges.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.badges.map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  "p-4 rounded-xl border transition-all clip-corner-sm flex items-start gap-3",
                  badge.unlocked
                    ? "bg-[var(--vly-surface-raised)] border-[var(--vly-accent)]/30 text-[var(--vly-text-primary)] shadow-sm"
                    : "bg-[var(--vly-world)] border-[var(--vly-border-subtle)] opacity-40 grayscale"
                )}
              >
                <div className="text-2xl flex-shrink-0">{badge.icon}</div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[var(--vly-text-primary)]">{badge.title}</h4>
                  <p className="mt-0.5 text-[11px] leading-tight text-[var(--vly-text-secondary)]">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Density Metrics */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--vly-text-secondary)]">
            <Layers size={14} className="text-[var(--vly-info)]" />
            <span>Densidade do Universo Digital</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3.5">
              <span className="text-[10px] font-semibold uppercase text-[var(--vly-text-muted)]">Vault (Conhecimento)</span>
              <p className="mt-1 text-xl font-bold text-[var(--vly-accent)]">{store.vaultItems.length}</p>
            </div>
            <div className="rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3.5">
              <span className="text-[10px] font-semibold uppercase text-[var(--vly-text-muted)]">Teses (Codex)</span>
              <p className="mt-1 text-xl font-bold text-[var(--vly-info)]">{store.theses.length}</p>
            </div>
            <div className="rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3.5">
              <span className="text-[10px] font-semibold uppercase text-[var(--vly-text-muted)]">Evidências (Research)</span>
              <p className="mt-1 text-xl font-bold text-[var(--vly-success)]">{store.evidences.length}</p>
            </div>
            <div className="rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3.5">
              <span className="text-[10px] font-semibold uppercase text-[var(--vly-text-muted)]">Scripts (Forge)</span>
              <p className="mt-1 text-xl font-bold text-[var(--vly-warning)]">{store.forgeFiles.length}</p>
            </div>
          </div>
        </div>

        {/* Backup & Data Center */}
        <Surface tone="panel" className="space-y-4 p-6">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]">
              <Download size={16} className="text-[var(--vly-accent)]" />
              <span>Central de Backup & Portabilidade do VARYNTH OS</span>
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--vly-text-secondary)]">
              O VARYNTH armazena seus dados com segurança no navegador. Baixe um snapshot completo em JSON para guardar cópia ou transferir seu ambiente para outro dispositivo.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              onClick={handleExportBackup}
              className="vly-interactive flex items-center justify-center gap-2 rounded-[var(--vly-radius-md)] bg-[var(--vly-accent)] px-4 py-2.5 text-xs font-bold text-[var(--vly-accent-contrast)] hover:opacity-90 glow-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vly-accent)]"
            >
              <Download size={15} />
              <span>Exportar Backup Completo (.JSON)</span>
            </button>

            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="vly-interactive flex items-center justify-center gap-2 rounded-[var(--vly-radius-md)] border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-4 py-2.5 text-xs font-bold text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vly-info)]"
            >
              <Upload size={15} className="text-[var(--vly-info)]" />
              <span>Gerenciador de Backup & Restauração</span>
            </button>
          </div>

          {importStatus && (
            <div className="rounded-lg border border-[var(--vly-border-accent)] bg-[var(--vly-world)] p-3 font-mono text-xs text-[var(--vly-info)]">
              {importStatus}
            </div>
          )}
        </Surface>

        <BackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
        />
      </div>
    </PageLayout>
  );
}
