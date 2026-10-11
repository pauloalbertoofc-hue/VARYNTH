"use client";

import { useState } from "react";
import {
  Artifact,
  ArtifactRelationship,
  DependencyHealthStatus,
  CreativeIntegrityReport,
} from "@/lib/artifacts/types";
import { artifactService } from "@/lib/artifacts/artifact-service";
import { creativeGraph } from "@/lib/artifacts/creative-graph";
import {
  X,
  Link as LinkIcon,
  Unlink,
  Pin,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Eye,
  GitFork,
  Boxes,
  ShieldCheck,
} from "lucide-react";
import { Surface } from "@/components/ui/Surface";

interface DependencyInspectorModalProps {
  artifact: Artifact;
  onClose: () => void;
  onUpdate?: () => void;
}

export function DependencyInspectorModal({
  artifact,
  onClose,
  onUpdate,
}: DependencyInspectorModalProps) {
  const [integrity, setIntegrity] = useState<CreativeIntegrityReport>(
    artifactService.getCreativeIntegrity(artifact.id)
  );
  const [impact] = useState(artifactService.getDependencyImpact(artifact.id));
  const [provenance] = useState(creativeGraph.getProvenanceChain(artifact.id));
  const [actionLoading, setActionLoading] = useState(false);

  const reloadIntegrity = () => {
    setIntegrity(artifactService.getCreativeIntegrity(artifact.id));
    if (onUpdate) onUpdate();
  };

  const handleTogglePin = (rel: ArtifactRelationship) => {
    const newMode = rel.pinMode === "PINNED" ? "FOLLOW_LATEST" : "PINNED";
    artifactService.setPinMode(artifact.id, rel.targetArtifactId, newMode);
    reloadIntegrity();
  };

  const handleUnlink = (rel: ArtifactRelationship) => {
    if (confirm(`Deseja desvincular a dependência '${rel.targetArtifactId}'?`)) {
      artifactService.unlinkDependency(artifact.id, rel.targetArtifactId, rel.usageSlot);
      reloadIntegrity();
    }
  };

  const handleAcceptUpdate = async (rel: ArtifactRelationship) => {
    const target = artifactService.getById(rel.targetArtifactId);
    if (!target) return;

    const latestVer = target.versions?.[target.versions.length - 1];
    const newVersionNumber = target.currentVersionNumber || latestVer?.versionNumber || 1;
    const newVersionId = target.currentVersionId || latestVer?.versionId || "v1-init";

    setActionLoading(true);
    const res = await artifactService.acceptDependencyUpdate({
      consumerArtifactId: artifact.id,
      targetArtifactId: target.id,
      newVersionId,
      newVersionNumber,
      usageSlot: rel.usageSlot,
    });
    setActionLoading(false);

    if (!res.success) {
      alert(`Falha ao atualizar dependência: ${res.error}`);
    } else {
      reloadIntegrity();
    }
  };

  const getHealthBadge = (health: DependencyHealthStatus) => {
    switch (health) {
      case "VALID":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[var(--vly-success)]/10 text-[var(--vly-success)] border border-[var(--vly-border-success)]">
            <CheckCircle2 className="w-3 h-3" /> Válido
          </span>
        );
      case "UPDATE_AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[var(--vly-info)]/10 text-[var(--vly-info)] border border-[var(--vly-border-info)]">
            <RefreshCw className="w-3 h-3 animate-spin" /> Atualização Disponível
          </span>
        );
      case "SOURCE_TRASHED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[var(--vly-warning)]/10 text-[var(--vly-warning)] border border-[var(--vly-border-warning)]">
            <AlertTriangle className="w-3 h-3" /> Origem na Lixeira
          </span>
        );
      case "SOURCE_MISSING":
      case "ASSET_MISSING":
      case "VERSION_MISMATCH":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[var(--vly-danger)]/10 text-[var(--vly-danger)] border border-[var(--vly-border-danger)]">
            <AlertCircle className="w-3 h-3" /> {health.replace("_", " ")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[var(--vly-surface-raised)] text-[var(--vly-text-muted)] border border-[var(--vly-border-subtle)]">
            {health}
          </span>
        );
    }
  };

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/80 p-4 backdrop-blur-sm">
      <Surface tone="floating" role="dialog" aria-modal="true" aria-labelledby="dependency-inspector-title" className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] bg-[var(--vly-surface)]/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-[var(--vly-border-accent)] bg-[var(--vly-accent-soft)] p-2 text-[var(--vly-accent)]">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h2 id="dependency-inspector-title" className="flex items-center gap-2 text-lg font-bold text-[var(--vly-text-primary)]">
                Grafo Criativo & Dependências
                {getHealthBadge(integrity.overallHealth)}
              </h2>
              <p className="text-xs text-[var(--vly-text-secondary)]">
                {artifact.name} ({artifact.type} · v{artifact.currentVersionNumber || 1}.0)
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar inspetor de dependências"
            onClick={onClose}
            className="vly-interactive rounded-lg p-1.5 text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Integrity Issues Alert */}
          {integrity.issues.length > 0 && (
            <div className="bg-[var(--vly-world)] border border-[var(--vly-border-subtle)] rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold text-[var(--vly-text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[var(--vly-info)]" /> Diagnóstico do CreativeIntegrityValidator
              </h3>
              <div className="space-y-1.5">
                {integrity.issues.map((iss, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start justify-between text-xs p-2.5 rounded border ${
                      iss.severity === "ERROR"
                        ? "bg-[var(--vly-danger)]/5 border-[var(--vly-border-danger)] text-[var(--vly-danger)]"
                        : iss.severity === "WARNING"
                        ? "bg-[var(--vly-warning)]/5 border-[var(--vly-border-warning)] text-[var(--vly-warning)]"
                        : "bg-[var(--vly-info)]/5 border-[var(--vly-border-info)] text-[var(--vly-info)]"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{iss.message}</p>
                      {iss.suggestedAction && (
                        <p className="text-[11px] opacity-75 mt-0.5">Sugestão: {iss.suggestedAction}</p>
                      )}
                    </div>
                    {iss.code === "UPDATE_AVAILABLE" && (
                      <button
                        onClick={() => {
                          const rel = artifact.relationships?.find(
                            (r) => r.targetArtifactId === iss.targetArtifactId
                          );
                          if (rel) handleAcceptUpdate(rel);
                        }}
                        disabled={actionLoading}
                        className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 rounded border border-cyan-500/40 text-xs font-medium ml-3 shrink-0"
                      >
                        Aceitar vNova
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing Dependencies */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-sky-400" /> Dependências Diretas ({artifact.relationships?.length || 0})
            </h3>
            {(!artifact.relationships || artifact.relationships.length === 0) ? (
              <p className="text-xs text-zinc-500 italic bg-zinc-950/50 p-3 rounded border border-zinc-800/60">
                Nenhum artefato ou asset vinculado como dependência direta.
              </p>
            ) : (
              <div className="space-y-2">
                {artifact.relationships.map((rel, idx) => {
                  const target = artifactService.getById(rel.targetArtifactId);
                  const isStale =
                    target &&
                    rel.pinMode === "PINNED" &&
                    (target.currentVersionNumber || 1) > (rel.targetVersionNumber || 1);

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-zinc-100">
                            {target?.name || rel.targetArtifactId}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 font-mono">
                            {target?.type || "DESCONHECIDO"}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {rel.type} {rel.semanticRole ? `(${rel.semanticRole})` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                          <span>
                            Pin: <strong className="text-zinc-200">{rel.pinMode || "PINNED"}</strong> (v{rel.targetVersionNumber || 1}.0)
                          </span>
                          {rel.usageSlot && (
                            <span>
                              Slot: <code className="text-zinc-300">{rel.usageSlot}</code>
                            </span>
                          )}
                          {isStale && (
                            <span className="text-cyan-400 font-medium flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" /> v{target?.currentVersionNumber}.0 disponível
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isStale && (
                          <button
                            onClick={() => handleAcceptUpdate(rel)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded border border-cyan-500/40"
                          >
                            Atualizar Pin
                          </button>
                        )}
                        <button
                          onClick={() => handleTogglePin(rel)}
                          title="Alternar entre PINNED e FOLLOW_LATEST"
                          className={`p-1.5 rounded border text-xs flex items-center gap-1 ${
                            rel.pinMode === "PINNED"
                              ? "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
                              : "bg-sky-500/20 text-sky-300 border-sky-500/30"
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleUnlink(rel)}
                          title="Desvincular"
                          className="p-1.5 rounded border bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Incoming Dependents */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-400" /> Consumidores & Dependentes ({impact.directDependentsCount})
            </h3>
            {impact.directDependentsCount === 0 ? (
              <p className="text-xs text-zinc-500 italic bg-zinc-950/50 p-3 rounded border border-zinc-800/60">
                Nenhum outro artefato consome este artefato atualmente. Seguro para modificações profundas.
              </p>
            ) : (
              <div className="space-y-2">
                {impact.directDependents.map((dep, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800"
                  >
                    <div>
                      <p className="font-medium text-sm text-zinc-100">{dep.consumerName}</p>
                      <p className="text-xs text-zinc-400">
                        Consome via <strong className="text-zinc-300">{dep.relationship.type}</strong>
                        {dep.relationship.usageSlot && ` no slot '${dep.relationship.usageSlot}'`}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-xs bg-zinc-800 text-zinc-300 rounded font-mono">
                      {dep.relationship.pinMode || "PINNED"} (v{dep.relationship.targetVersionNumber || 1}.0)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[var(--vly-border-default)] bg-[var(--vly-surface)]/50 px-6 py-3">
          <button
            onClick={onClose}
            className="vly-interactive rounded-lg bg-[var(--vly-surface-raised)] px-4 py-1.5 text-sm text-[var(--vly-text-primary)]"
          >
            Fechar
          </button>
        </div>
      </Surface>
    </div>
  );
}
