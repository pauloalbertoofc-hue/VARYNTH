"use client";

import React, { useState } from "react";
import {
  GitBranch,
  Link as LinkIcon,
  Unlink,
  Pin,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Maximize2,
} from "lucide-react";
import {
  Artifact,
  ArtifactRelationship,
  CreativeIntegrityReport,
  DependencyHealthStatus,
} from "@/lib/artifacts/types";
import { artifactService } from "@/lib/artifacts/artifact-service";
import { creativeGraph } from "@/lib/artifacts/creative-graph";
import { DependencyInspectorModal } from "./DependencyInspectorModal";
import { Surface } from "@/components/ui/Surface";

interface StudioRelationsPanelProps {
  artifact: Artifact;
  onUpdateArtifact?: (updated: Artifact) => void;
}

export function StudioRelationsPanel({ artifact, onUpdateArtifact }: StudioRelationsPanelProps) {
  const [isInspectorModalOpen, setIsInspectorModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const integrity: CreativeIntegrityReport = artifactService.getCreativeIntegrity(artifact.id);
  const relationships: ArtifactRelationship[] = artifact.relationships || [];
  const dependents = creativeGraph.getDependents(artifact.id);

  const getHealthBadge = (health: DependencyHealthStatus) => {
    switch (health) {
      case "VALID":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--vly-success)]/10 text-[var(--vly-success)] border border-[var(--vly-border-success)]">
            <CheckCircle2 size={10} /> Válido
          </span>
        );
      case "UPDATE_AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--vly-info)]/10 text-[var(--vly-info)] border border-[var(--vly-border-info)]">
            <RefreshCw size={10} className="animate-spin" /> Atualização
          </span>
        );
      case "SOURCE_TRASHED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--vly-warning)]/10 text-[var(--vly-warning)] border border-[var(--vly-border-warning)]">
            <AlertTriangle size={10} /> Na Lixeira
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--vly-danger)]/10 text-[var(--vly-danger)] border border-[var(--vly-border-danger)]">
            <AlertTriangle size={10} /> {health}
          </span>
        );
    }
  };

  const handleTogglePinMode = (rel: ArtifactRelationship) => {
    const newMode = rel.pinMode === "PINNED" ? "FOLLOW_LATEST" : "PINNED";
    artifactService.setPinMode(artifact.id, rel.targetArtifactId, newMode);

    const ref = artifactService.getById(artifact.id);
    if (ref && onUpdateArtifact) {
      onUpdateArtifact(ref);
    }

    setActionFeedback(`Modo alterado para ${newMode}.`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleAcceptUpdate = async (rel: ArtifactRelationship) => {
    const target = artifactService.getById(rel.targetArtifactId);
    if (!target) return;

    const latestVer = target.versions?.[target.versions.length - 1];
    const newVersionNumber = target.currentVersionNumber || latestVer?.versionNumber || 1;
    const newVersionId = target.currentVersionId || latestVer?.versionId || "v1-init";

    const res = await artifactService.acceptDependencyUpdate({
      consumerArtifactId: artifact.id,
      targetArtifactId: target.id,
      newVersionId,
      newVersionNumber,
      usageSlot: rel.usageSlot,
    });

    if (res.success) {
      const ref = artifactService.getById(artifact.id);
      if (ref && onUpdateArtifact) {
        onUpdateArtifact(ref);
      }
      setActionFeedback(`Dependência atualizada para v${newVersionNumber}.0`);
    } else {
      setActionFeedback(`Falha: ${res.error}`);
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleUnlink = (rel: ArtifactRelationship) => {
    if (!confirm(`Deseja desvincular a dependência do artefato "${rel.targetArtifactId}"?`)) {
      return;
    }

    artifactService.unlinkDependency(artifact.id, rel.targetArtifactId, rel.usageSlot);
    const ref = artifactService.getById(artifact.id);
    if (ref && onUpdateArtifact) {
      onUpdateArtifact(ref);
    }
    setActionFeedback("Dependência desvinculada.");
    setTimeout(() => setActionFeedback(null), 3000);
  };

  return (
    <Surface tone="panel" className="flex h-full flex-col space-y-4 p-4 text-xs text-[var(--vly-text-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--vly-text-primary)]">
          <GitBranch size={14} className="text-[var(--vly-accent)]" />
          <span>Relacionamentos ({relationships.length})</span>
        </div>
        <button
          onClick={() => setIsInspectorModalOpen(true)}
          className="vly-interactive px-2 py-1 bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] border border-[var(--vly-border-strong)] text-[var(--vly-text-secondary)] rounded-md text-[11px] font-medium flex items-center gap-1 transition"
          title="Abrir Inspetor Completo de Dependências"
        >
          <Maximize2 size={11} />
          <span>Inspetor</span>
        </button>
      </div>

      {actionFeedback && (
        <div className="p-2 rounded bg-[var(--vly-accent)]/10 border border-[var(--vly-border-accent)] text-[11px] text-[var(--vly-accent)]">
          {actionFeedback}
        </div>
      )}

      {/* Dependencies List */}
      <div className="flex-1 flex flex-col space-y-4 overflow-y-auto pr-1">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--vly-text-muted)] block mb-2">
            Dependências Diretas ({relationships.length})
          </span>

          {relationships.length === 0 ? (
            <div className="p-4 text-center bg-[var(--vly-world)] border border-[var(--vly-border-subtle)] rounded-xl text-[var(--vly-text-muted)] text-[11px] space-y-2">
              <p>Nenhuma dependência upstream vinculada a este artefato.</p>
              <button
                onClick={() => setIsInspectorModalOpen(true)}
                className="vly-interactive px-2.5 py-1 bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] text-[var(--vly-text-secondary)] rounded text-[10px] transition"
              >
                Vincular no Grafo
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {relationships.map((rel, idx) => {
                const target = artifactService.getById(rel.targetArtifactId);
                const issue = integrity.issues.find((i) => i.targetArtifactId === rel.targetArtifactId);
                const health: DependencyHealthStatus = issue?.code || "VALID";

                return (
                  <div
                    key={`${rel.targetArtifactId}-${idx}`}
                    className="p-2.5 rounded-lg bg-[var(--vly-surface-raised)] border border-[var(--vly-border-subtle)] flex flex-col gap-2 hover:border-[var(--vly-border-strong)] transition"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[var(--vly-text-primary)] text-[12px] truncate" title={target?.name || rel.targetArtifactId}>
                            {target?.name || rel.targetArtifactId}
                          </span>
                          {getHealthBadge(health)}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--vly-text-muted)] font-mono mt-0.5">
                          <span className="text-[var(--vly-accent)]">{rel.type}</span>
                          <span>•</span>
                          <span>v{rel.targetVersionNumber || 1}.0</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnlink(rel)}
                        className="vly-interactive p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-danger)] transition"
                        title="Desvincular dependência"
                      >
                        <Unlink size={12} />
                      </button>
                    </div>

                    {/* Actions & Pinning */}
                    <div className="pt-1.5 border-t border-[var(--vly-border-subtle)] flex items-center justify-between text-[10px]">
                      <button
                        onClick={() => handleTogglePinMode(rel)}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition ${
                          rel.pinMode === "PINNED"
                            ? "bg-[var(--vly-warning)]/10 border-[var(--vly-border-warning)] text-[var(--vly-warning)]"
                            : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-muted)]"
                        }`}
                        title={rel.pinMode === "PINNED" ? "Versão congelada" : "Segue última versão"}
                      >
                        <Pin size={10} />
                        <span>{rel.pinMode === "PINNED" ? "PINNED" : "FOLLOW"}</span>
                      </button>

                      {health === "UPDATE_AVAILABLE" && (
                        <button
                          onClick={() => handleAcceptUpdate(rel)}
                          className="vly-interactive px-2 py-0.5 bg-[var(--vly-success)] hover:opacity-90 text-[var(--vly-text-on-accent)] rounded font-medium transition text-[10px]"
                        >
                          Atualizar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Downstream Consumers */}
        {dependents.length > 0 && (
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--vly-text-muted)] block mb-2">
              Consumidores a Jusante ({dependents.length})
            </span>
            <div className="space-y-1.5">
              {dependents.map((dep) => (
                <div
                  key={dep.consumerArtifactId}
                  className="p-2 rounded bg-[var(--vly-world)] border border-[var(--vly-border-subtle)] flex items-center justify-between text-[11px]"
                >
                  <span className="text-[var(--vly-text-secondary)] truncate font-medium">{dep.consumerName}</span>
                  <span className="text-[9px] font-mono text-[var(--vly-accent)] bg-[var(--vly-accent)]/10 px-1.5 py-0.5 rounded">
                    {dep.relationship.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-[var(--vly-border-default)] pt-2 text-[10px] text-[var(--vly-text-muted)]">
        <span>Grafo Criativo V4</span>
        <span className="flex items-center gap-1 text-[var(--vly-text-secondary)]">
          <ShieldCheck size={11} className="text-[var(--vly-success)]" /> Integridade Verificada
        </span>
      </div>

      {/* Full Dependency Inspector Modal */}
      {isInspectorModalOpen && (
        <DependencyInspectorModal
          artifact={artifact}
          onClose={() => setIsInspectorModalOpen(false)}
          onUpdate={() => {
            const ref = artifactService.getById(artifact.id);
            if (ref && onUpdateArtifact) {
              onUpdateArtifact(ref);
            }
          }}
        />
      )}
    </Surface>
  );
}
