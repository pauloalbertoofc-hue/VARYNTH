"use client";

import React, { useState } from "react";
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  FileIcon,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { Artifact, AssetFile } from "@/lib/artifacts/types";
import { assetManager } from "@/lib/artifacts/asset-manager";
import { artifactStore } from "@/lib/artifacts/artifact-store";
import { assetStorage } from "@/lib/persistence/indexeddb-adapter";
import { Surface } from "@/components/ui/Surface";

interface StudioAssetPanelProps {
  artifact: Artifact;
  onUpdateArtifact?: (updated: Artifact) => void;
}

export function StudioAssetPanel({ artifact, onUpdateArtifact }: StudioAssetPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Retrieve attached asset files
  const attachedAssetIds = Array.from(
    new Set([...(artifact.assetFileIds || []), ...assetManager.getUsagesForArtifact(artifact.id).map((u) => u.assetId)])
  );

  const attachedAssets: AssetFile[] = attachedAssetIds
    .map((id) => assetManager.getAsset(id))
    .filter((a): a is AssetFile => Boolean(a));

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const raw = reader.result as ArrayBuffer;
        const newAsset = await assetManager.registerAsset(
          {
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
            storageType: "INDEXEDDB_BLOB",
            createdBy: "USER",
            artifactIds: [artifact.id],
            metadata: {
              originalFileName: file.name,
              attachedToArtifactId: artifact.id,
              attachedAt: new Date().toISOString(),
            },
          },
          raw
        );

        // Update artifact asset list
        const updatedAssetFileIds = Array.from(new Set([...(artifact.assetFileIds || []), newAsset.id]));
        const updatedArtifact: Artifact = {
          ...artifact,
          assetFileIds: updatedAssetFileIds,
          updatedAt: new Date().toISOString(),
        };

        artifactStore.save(updatedArtifact, artifact.revision);

        if (onUpdateArtifact) {
          onUpdateArtifact(updatedArtifact);
        }

        setFeedback(`Asset "${file.name}" anexado com sucesso.`);
        setTimeout(() => setFeedback(null), 4000);
      } catch (err: any) {
        setFeedback(`Falha ao registrar asset: ${err?.message || "Erro desconhecido"}`);
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsArrayBuffer(file);
    // Reset file input value
    e.target.value = "";
  };

  const handleDownloadAsset = async (asset: AssetFile) => {
    try {
      const blob = await assetStorage.getBlob(asset.storageKey);
      if (!blob) {
        alert("Arquivo físico não encontrado no armazenamento local.");
        return;
      }

      const finalBlob = blob instanceof Blob ? blob : new Blob([blob]);
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = asset.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Falha ao exportar arquivo: ${err?.message || err}`);
    }
  };

  const handleDetachAsset = (assetId: string, assetName: string) => {
    if (!confirm(`Deseja desanexar o arquivo "${assetName}" deste artefato? O arquivo permanecerá salvo no acervo local.`)) {
      return;
    }

    const updatedAssetFileIds = (artifact.assetFileIds || []).filter((id) => id !== assetId);
    const updatedArtifact: Artifact = {
      ...artifact,
      assetFileIds: updatedAssetFileIds,
      updatedAt: new Date().toISOString(),
    };

    artifactStore.save(updatedArtifact, artifact.revision);

    if (onUpdateArtifact) {
      onUpdateArtifact(updatedArtifact);
    }

    setFeedback(`Asset "${assetName}" desanexado do artefato.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <Surface tone="panel" className="flex h-full flex-col space-y-4 p-4 text-xs text-[var(--vly-text-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--vly-text-primary)]">
          <Paperclip size={14} className="text-[var(--vly-info)]" />
          <span>Assets Físicos ({attachedAssets.length})</span>
        </div>
        <label className="vly-interactive cursor-pointer px-2.5 py-1 bg-[var(--vly-accent)] hover:opacity-90 text-[var(--vly-text-on-accent)] rounded-md text-[11px] font-medium flex items-center gap-1 transition shadow-sm">
          <Upload size={12} />
          <span>Anexar</span>
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      {feedback && (
        <div className="p-2 rounded bg-[var(--vly-info)]/10 border border-[var(--vly-border-info)] text-[11px] text-[var(--vly-info)]">
          {feedback}
        </div>
      )}

      {/* Asset List */}
      {attachedAssets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[var(--vly-world)] border border-[var(--vly-border-subtle)] rounded-xl space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] text-[var(--vly-text-muted)]">
            <Paperclip size={18} />
          </div>
          <div>
            <p className="font-medium text-[var(--vly-text-primary)]">Nenhum asset anexado</p>
            <p className="mt-1 max-w-[200px] text-[11px] text-[var(--vly-text-muted)]">
              Anexe imagens, vídeos, áudios ou dados binários para uso no Studio.
            </p>
          </div>
          <label className="vly-interactive cursor-pointer px-3 py-1.5 bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] border border-[var(--vly-border-strong)] text-[var(--vly-text-primary)] rounded-lg text-xs font-medium flex items-center gap-1.5 transition">
            <Plus size={13} />
            <span>Selecionar Arquivo</span>
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {attachedAssets.map((asset) => (
            <Surface tone="raised"
              key={asset.id}
              className="flex flex-col gap-2 rounded-lg p-2.5 hover:border-[var(--vly-border-strong)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded bg-[var(--vly-info)]/10 border border-[var(--vly-border-info)] flex items-center justify-center text-[var(--vly-info)] shrink-0">
                    <FileIcon size={14} />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-semibold text-[var(--vly-text-primary)] text-[12px] truncate" title={asset.name}>
                      {asset.name}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--vly-text-muted)] font-mono">
                      <span>{formatBytes(asset.sizeBytes)}</span>
                      <span>•</span>
                      <span className="truncate max-w-[80px]">{asset.mimeType}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDownloadAsset(asset)}
                    className="vly-interactive p-1 text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)] rounded transition"
                    title="Baixar arquivo físico"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    onClick={() => handleDetachAsset(asset.id, asset.name)}
                    className="vly-interactive p-1 text-[var(--vly-text-secondary)] hover:text-[var(--vly-danger)] hover:bg-[var(--vly-danger)]/10 rounded transition"
                    title="Desanexar deste artefato"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Status footer */}
              <div className="pt-1.5 border-t border-[var(--vly-border-subtle)] flex items-center justify-between text-[10px] text-[var(--vly-text-muted)]">
                <span className="flex items-center gap-1">
                  <HardDrive size={11} className="text-[var(--vly-text-secondary)]" />
                  <span>{asset.storageType}</span>
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-semibold ${
                    asset.status === "VALID"
                      ? "text-[var(--vly-success)] bg-[var(--vly-success)]/10"
                      : "text-[var(--vly-warning)] bg-[var(--vly-warning)]/10"
                  }`}
                >
                  {asset.status || "VALID"}
                </span>
              </div>
            </Surface>
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-[var(--vly-border-default)] pt-2 text-[10px] text-[var(--vly-text-muted)]">
        <span>Soberania Local-First</span>
        <span className="flex items-center gap-1 text-[var(--vly-text-secondary)]">
          <ShieldCheck size={11} className="text-[var(--vly-success)]" /> OPFS / IndexedDB
        </span>
      </div>
    </Surface>
  );
}
