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

  // Export Full VARYNTH OS Snapshot
  const handleExportBackup = () => {
    const backupData = {
      version: "VARYNTH_OS_v6.0",
      exportedAt: new Date().toISOString(),
      user: "Paulo",
      projects: store.projects,
      tasks: store.tasks,
      notes: store.notes,
      vaultItems: store.vaultItems,
      chronosEvents: store.chronosEvents,
      historicalMilestones: store.historicalMilestones,
      people: store.people,
      labItems: store.labItems,
      graveyardItems: store.graveyardItems,
      theses: store.theses,
      researches: store.researches,
      evidences: store.evidences,
      opportunities: store.opportunities,
      forgeFiles: store.forgeFiles,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `varynth_os_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Backup File
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.projects) localStorage.setItem("varynth_os_projects", JSON.stringify(data.projects));
        if (data.tasks) localStorage.setItem("varynth_os_tasks", JSON.stringify(data.tasks));
        if (data.notes) localStorage.setItem("varynth_os_notes", JSON.stringify(data.notes));
        if (data.vaultItems) localStorage.setItem("varynth_os_vault", JSON.stringify(data.vaultItems));
        if (data.chronosEvents) localStorage.setItem("varynth_os_chronos", JSON.stringify(data.chronosEvents));
        if (data.theses) localStorage.setItem("varynth_os_theses", JSON.stringify(data.theses));
        if (data.evidences) localStorage.setItem("varynth_os_evidences", JSON.stringify(data.evidences));
        if (data.opportunities) localStorage.setItem("varynth_os_opportunities", JSON.stringify(data.opportunities));
        if (data.forgeFiles) localStorage.setItem("varynth_os_forge", JSON.stringify(data.forgeFiles));

        setImportStatus("✓ Backup restaurado com sucesso! Recarregando...");
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        setImportStatus("❌ Erro ao ler arquivo JSON de backup.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <PageLayout title="Perfil & Gamificação" subtitle="Status de mestria, nível e central de backup do OS">
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
        {/* Gamer Card & Level Banner */}
        <div className="relative rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-[#0f0f1a] to-[#0f0f1a] p-6 clip-corner overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 border border-violet-400/40 flex items-center justify-center text-white text-2xl font-black shadow-lg glow-accent flex-shrink-0">
                P
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white">Paulo</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold uppercase tracking-wider">
                    Dono do VARYNTH OS
                  </span>
                </div>
                <p className="text-xs text-cyan-400 font-bold mt-0.5">
                  Nível {stats.level} · {stats.title}
                </p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  XP Total: {stats.totalXP.toLocaleString()} XP
                </p>
              </div>
            </div>

            {/* Quick KPIs */}
            <div className="flex items-center gap-4 bg-[#0a0a0f]/80 px-4 py-2.5 rounded-xl border border-[#1e1e30]">
              <div className="text-center">
                <p className="text-lg font-black text-white">{store.projects.length}</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Projetos</p>
              </div>
              <div className="w-px h-7 bg-[#1e1e30]" />
              <div className="text-center">
                <p className="text-lg font-black text-emerald-400">
                  {store.tasks.filter((t) => t.status === "concluida").length}
                </p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Tarefas Feitas</p>
              </div>
              <div className="w-px h-7 bg-[#1e1e30]" />
              <div className="text-center">
                <p className="text-lg font-black text-violet-400">{stats.badges.filter((b) => b.unlocked).length}</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Conquistas</p>
              </div>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="mt-6 pt-4 border-t border-[#1e1e30]/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-bold">Progresso para o Nível {stats.level + 1}</span>
              <span className="text-violet-300 font-bold">{stats.progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#14141f] border border-[#1e1e30] overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${stats.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Badges & Achievements Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy size={14} className="text-yellow-400" />
            <span>Mural de Conquistas ({stats.badges.filter((b) => b.unlocked).length} / {stats.badges.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.badges.map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  "p-4 rounded-xl border transition-all clip-corner-sm flex items-start gap-3",
                  badge.unlocked
                    ? "bg-[#0f0f1a] border-violet-500/30 text-white shadow-sm"
                    : "bg-[#0a0a0f] border-[#1e1e30] opacity-40 grayscale"
                )}
              >
                <div className="text-2xl flex-shrink-0">{badge.icon}</div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-100">{badge.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Density Metrics */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={14} className="text-cyan-400" />
            <span>Densidade do Universo Digital</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Vault (Conhecimento)</span>
              <p className="text-xl font-bold text-purple-400 mt-1">{store.vaultItems.length}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Teses (Codex)</span>
              <p className="text-xl font-bold text-cyan-400 mt-1">{store.theses.length}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Evidências (Research)</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">{store.evidences.length}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Scripts (Forge)</span>
              <p className="text-xl font-bold text-orange-400 mt-1">{store.forgeFiles.length}</p>
            </div>
          </div>
        </div>

        {/* Backup & Data Center */}
        <div className="p-6 rounded-2xl bg-[#0f0f1a] border border-[#1e1e30] space-y-4 clip-corner">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download size={16} className="text-violet-400" />
              <span>Central de Backup & Portabilidade do VARYNTH OS</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              O VARYNTH armazena seus dados com segurança no navegador. Baixe um snapshot completo em JSON para guardar cópia ou transferir seu ambiente para outro dispositivo.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              onClick={handleExportBackup}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 glow-accent transition-all"
            >
              <Download size={15} />
              <span>Exportar Backup Completo (.JSON)</span>
            </button>

            <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-[#14141f] hover:bg-[#1e1e30] border border-[#1e1e30] cursor-pointer transition-all">
              <Upload size={15} className="text-cyan-400" />
              <span>Restaurar de Arquivo JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>

          {importStatus && (
            <div className="p-3 rounded-lg bg-[#0a0a0f] border border-violet-500/30 text-xs text-cyan-300 font-mono">
              {importStatus}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
