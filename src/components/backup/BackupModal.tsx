"use client";

import { useState } from "react";
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  X,
  RefreshCw,
  Layers,
  ShieldCheck,
  Package,
} from "lucide-react";
import { backupService } from "@/lib/backup/backup-service";
import { VarynthBackupPayload } from "@/lib/backup/types";
import { cn } from "@/lib/utils";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackupModal({ isOpen, onClose }: BackupModalProps) {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [importPayload, setImportPayload] = useState<VarynthBackupPayload | null>(null);
  const [restoreMode, setRestoreMode] = useState<"MERGE" | "REPLACE">("MERGE");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const backup = backupService.exportVarynthBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `varynth-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage({
        text: `Backup exportado com sucesso (${filename}) contendo ${backup.manifest.entitiesCount.projects} projetos e ${backup.manifest.entitiesCount.artifacts} artefatos.`,
        type: "success",
      });
    } catch (err: any) {
      setStatusMessage({ text: `Falha ao exportar backup: ${err?.message || err}`, type: "error" });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const validation = backupService.validateBackup(json);
        if (!validation.valid) {
          setStatusMessage({ text: `Arquivo inválido: ${validation.errors.join("; ")}`, type: "error" });
          setImportPayload(null);
        } else {
          setImportPayload(json);
          setStatusMessage({
            text: `Arquivo validado: ${json.manifest.entitiesCount.projects} projetos, ${json.manifest.entitiesCount.artifacts} artefatos.`,
            type: "info",
          });
        }
      } catch {
        setStatusMessage({ text: "Arquivo não é um JSON válido.", type: "error" });
        setImportPayload(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = () => {
    if (!importPayload) return;
    setIsProcessing(true);

    setTimeout(() => {
      const result = backupService.restoreVarynthBackup(importPayload, restoreMode);
      setIsProcessing(false);

      if (result.success) {
        setStatusMessage({
          text: `Restauração concluída no modo ${restoreMode}. Todos os módulos e stores foram sincronizados reativamente.`,
          type: "success",
        });
      } else {
        setStatusMessage({ text: `Erro na restauração: ${result.error}`, type: "error" });
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0a0a0f] border border-[#1e1e30] shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-[#1e1e30] bg-[#10101a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Universal Backup & Portabilidade
              </h3>
              <p className="text-[11px] text-slate-400">
                Preservação soberana e restauração atômica de todo o ecossistema VARYNTH
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1e1e30] bg-[#0c0c14] text-xs font-mono">
          <button
            onClick={() => {
              setActiveTab("export");
              setStatusMessage(null);
            }}
            className={cn(
              "flex-1 py-2.5 flex items-center justify-center gap-2 font-semibold transition-all",
              activeTab === "export"
                ? "bg-violet-600/20 text-violet-300 border-b-2 border-violet-500"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Download size={14} />
            <span>Exportar Meu VARYNTH</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("import");
              setStatusMessage(null);
            }}
            className={cn(
              "flex-1 py-2.5 flex items-center justify-center gap-2 font-semibold transition-all",
              activeTab === "import"
                ? "bg-cyan-600/20 text-cyan-300 border-b-2 border-cyan-500"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Upload size={14} />
            <span>Restaurar / Importar Backup</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {activeTab === "export" ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-2 text-xs">
                <div className="flex items-center gap-2 text-white font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Garantia de Soberania & Dados Sanitizados</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  O pacote exportado inclui 100% dos seus Projetos, Artefatos criativos, Versões, Tarefas, Notas, Vault, Teses, Evidências, Editais, Trilha de Auditoria e Configurações em formato JSON padronizado e portável.
                </p>
                <div className="text-[11px] font-mono text-cyan-400">
                  🔒 Zero tokens, chaves de API ou segredos são incluídos na exportação.
                </div>
              </div>

              <button
                onClick={handleExport}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xl border border-violet-400/30 flex items-center justify-center gap-2 transition-all"
              >
                <Download size={16} />
                <span>Baixar Pacote de Backup (.json)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3 text-xs">
                <div className="flex items-center gap-2 text-white font-bold">
                  <FileJson className="w-4 h-4 text-cyan-400" />
                  <span>Selecione o arquivo .varynth-backup ou .json</span>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-600/30 file:text-cyan-300 hover:file:bg-cyan-600/50 cursor-pointer"
                />

                {importPayload && (
                  <div className="mt-3 p-3 rounded-lg bg-[#141422] border border-[#2d2d4a] space-y-2 text-[11px]">
                    <div className="flex justify-between text-white font-mono">
                      <span>Origem: {importPayload.manifest.exportSource}</span>
                      <span>v{importPayload.manifest.varynthVersion}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono text-slate-400">
                      <div>Projetos: <strong className="text-white">{importPayload.manifest.entitiesCount.projects}</strong></div>
                      <div>Artefatos: <strong className="text-white">{importPayload.manifest.entitiesCount.artifacts}</strong></div>
                      <div>Tarefas: <strong className="text-white">{importPayload.manifest.entitiesCount.tasks}</strong></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mode Selection */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-400">Estratégia de Restauração:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="mode"
                    value="MERGE"
                    checked={restoreMode === "MERGE"}
                    onChange={() => setRestoreMode("MERGE")}
                  />
                  <span>Mesclar (Merge)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-amber-400">
                  <input
                    type="radio"
                    name="mode"
                    value="REPLACE"
                    checked={restoreMode === "REPLACE"}
                    onChange={() => setRestoreMode("REPLACE")}
                  />
                  <span>Substituir Tudo (Replace)</span>
                </label>
              </div>

              <button
                disabled={!importPayload || isProcessing}
                onClick={handleRestore}
                className={cn(
                  "w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all",
                  importPayload && !isProcessing
                    ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-xl border border-cyan-400/30"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                )}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processando restauração...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Executar Restauração</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div
              className={cn(
                "p-3 rounded-xl text-xs font-mono border flex items-start gap-2",
                statusMessage.type === "success" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
                statusMessage.type === "error" && "bg-red-500/10 border-red-500/30 text-red-300",
                statusMessage.type === "info" && "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
              )}
            >
              {statusMessage.type === "success" && <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {statusMessage.type === "error" && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {statusMessage.type === "info" && <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

