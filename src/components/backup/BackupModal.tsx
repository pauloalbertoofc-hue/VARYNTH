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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md vly-motion-enter">
      <div className="relative w-full max-w-xl rounded-2xl bg-[var(--vly-surface-floating)] border border-[var(--vly-border-strong)] shadow-2xl shadow-black/30 overflow-hidden text-[var(--vly-text-secondary)]">
        {/* Header */}
        <div className="p-4 border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] border border-[var(--vly-border-success)] flex items-center justify-center text-[var(--vly-success)]">
              <Database size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--vly-text-primary)] tracking-wide">
                Universal Backup & Portabilidade
              </h3>
              <p className="text-[11px] text-[var(--vly-text-muted)]">
                Preservação soberana e restauração atômica de todo o ecossistema VARYNTH
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="vly-interactive p-1 rounded-md text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] text-xs font-mono">
          <button
            onClick={() => {
              setActiveTab("export");
              setStatusMessage(null);
            }}
            className={cn(
              "flex-1 py-2.5 flex items-center justify-center gap-2 font-semibold transition-all",
              activeTab === "export"
                ? "bg-[var(--vly-surface-active)] text-[var(--vly-accent-hover)] border-b-2 border-[var(--vly-accent)]"
                : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)]"
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
                ? "bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] text-[var(--vly-info)] border-b-2 border-[var(--vly-info)]"
                : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)]"
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
              <div className="p-4 rounded-xl bg-[var(--vly-surface)] border border-[var(--vly-border-default)] space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[var(--vly-text-primary)] font-bold">
                  <ShieldCheck className="w-4 h-4 text-[var(--vly-success)]" />
                  <span>Garantia de Soberania & Dados Sanitizados</span>
                </div>
                <p className="text-[var(--vly-text-muted)] leading-relaxed">
                  O pacote exportado inclui 100% dos seus Projetos, Artefatos criativos, Versões, Tarefas, Notas, Vault, Teses, Evidências, Editais, Trilha de Auditoria e Configurações em formato JSON padronizado e portável.
                </p>
                <div className="text-[11px] font-mono text-[var(--vly-info)]">
                  🔒 Zero tokens, chaves de API ou segredos são incluídos na exportação.
                </div>
              </div>

              <button
                onClick={handleExport}
                className="vly-interactive w-full py-3 rounded-xl bg-[var(--vly-accent)] hover:bg-[var(--vly-accent-hover)] text-[var(--vly-accent-contrast)] text-xs font-bold shadow-xl border border-[var(--vly-border-accent)] flex items-center justify-center gap-2 transition-all"
              >
                <Download size={16} />
                <span>Baixar Pacote de Backup (.json)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--vly-surface)] border border-[var(--vly-border-default)] space-y-3 text-xs">
                <div className="flex items-center gap-2 text-[var(--vly-text-primary)] font-bold">
                  <FileJson className="w-4 h-4 text-[var(--vly-info)]" />
                  <span>Selecione o arquivo .varynth-backup ou .json</span>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="vly-field w-full text-xs text-[var(--vly-text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[color-mix(in_srgb,var(--vly-info)_18%,var(--vly-surface))] file:text-[var(--vly-info)] hover:file:bg-[var(--vly-surface-hover)] cursor-pointer"
                />

                {importPayload && (
                  <div className="mt-3 p-3 rounded-lg bg-[var(--vly-surface-raised)] border border-[var(--vly-border-default)] space-y-2 text-[11px]">
                    <div className="flex justify-between text-[var(--vly-text-primary)] font-mono">
                      <span>Origem: {importPayload.manifest.exportSource}</span>
                      <span>v{importPayload.manifest.varynthVersion}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[var(--vly-text-muted)]">
                      <div>Projetos: <strong className="text-[var(--vly-text-primary)]">{importPayload.manifest.entitiesCount.projects}</strong></div>
                      <div>Artefatos: <strong className="text-[var(--vly-text-primary)]">{importPayload.manifest.entitiesCount.artifacts}</strong></div>
                      <div>Tarefas: <strong className="text-[var(--vly-text-primary)]">{importPayload.manifest.entitiesCount.tasks}</strong></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mode Selection */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-[var(--vly-text-muted)]">Estratégia de Restauração:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[var(--vly-text-secondary)]">
                  <input
                    type="radio"
                    name="mode"
                    value="MERGE"
                    checked={restoreMode === "MERGE"}
                    onChange={() => setRestoreMode("MERGE")}
                  />
                  <span>Mesclar (Merge)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[var(--vly-warning)]">
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
                    ? "vly-interactive bg-[var(--vly-info)] hover:bg-[var(--vly-accent-hover)] text-[var(--vly-accent-contrast)] shadow-xl border border-[var(--vly-border-info)]"
                    : "bg-[var(--vly-surface-raised)] text-[var(--vly-text-disabled)] cursor-not-allowed border border-[var(--vly-border-default)]"
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
                statusMessage.type === "success" && "bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] border-[var(--vly-border-success)] text-[var(--vly-success)]",
                statusMessage.type === "error" && "bg-[color-mix(in_srgb,var(--vly-danger)_12%,var(--vly-surface))] border-[var(--vly-border-danger)] text-[var(--vly-danger)]",
                statusMessage.type === "info" && "bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] border-[var(--vly-border-info)] text-[var(--vly-info)]"
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

