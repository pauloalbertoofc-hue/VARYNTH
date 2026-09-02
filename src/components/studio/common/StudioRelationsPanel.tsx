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
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={10} /> Válido
          </span>
        );
      case "UPDATE_AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <RefreshCw size={10} className="animate-spin" /> Atualização
          </span>
        );
      case "SOURCE_TRASHED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle size={10} /> Na Lixeira
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
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
    <div className="p-4 flex flex-col h-full text-xs text-slate-300 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1c1d30]">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <GitBranch size={14} className="text-purple-400" />
          <span>Relacionamentos ({relationships.length})</span>
        </div>
        <button
          onClick={() => setIsInspectorModalOpen(true)}
          className="px-2 py-1 bg-[#18192c] hover:bg-[#22243e] border border-[#2b2d4c] text-slate-300 rounded-md text-[11px] font-medium flex items-center gap-1 transition"
          title="Abrir Inspetor Completo de Dependências"
        >
          <Maximize2 size={11} />
          <span>Inspetor</span>
        </button>
      </div>

      {actionFeedback && (
        <div className="p-2 rounded bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-300">
          {actionFeedback}
        </div>
      )}

      {/* Dependencies List */}
      <div className="flex-1 flex flex-col space-y-4 overflow-y-auto pr-1">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block mb-2">
            Dependências Diretas ({relationships.length})
          </span>

          {relationships.length === 0 ? (
            <div className="p-4 text-center bg-[#0c0c16] border border-[#1b1b2d] rounded-xl text-slate-500 text-[11px] space-y-2">
              <p>Nenhuma dependência upstream vinculada a este artefato.</p>
              <button
                onClick={() => setIsInspectorModalOpen(true)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition"
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
                    className="p-2.5 rounded-lg bg-[#101120] border border-[#1e2038] flex flex-col gap-2 hover:border-slate-600 transition"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-200 text-[12px] truncate" title={target?.name || rel.targetArtifactId}>
                            {target?.name || rel.targetArtifactId}
                          </span>
                          {getHealthBadge(health)}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span className="text-purple-400">{rel.type}</span>
                          <span>•</span>
                          <span>v{rel.targetVersionNumber || 1}.0</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnlink(rel)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                        title="Desvincular dependência"
                      >
                        <Unlink size={12} />
                      </button>
                    </div>

                    {/* Actions & Pinning */}
                    <div className="pt-1.5 border-t border-[#18192c] flex items-center justify-between text-[10px]">
                      <button
                        onClick={() => handleTogglePinMode(rel)}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition ${
                          rel.pinMode === "PINNED"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            : "bg-slate-800 border-slate-700 text-slate-400"
                        }`}
                        title={rel.pinMode === "PINNED" ? "Versão congelada" : "Segue última versão"}
                      >
                        <Pin size={10} />
                        <span>{rel.pinMode === "PINNED" ? "PINNED" : "FOLLOW"}</span>
                      </button>

                      {health === "UPDATE_AVAILABLE" && (
                        <button
                          onClick={() => handleAcceptUpdate(rel)}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition text-[10px]"
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
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block mb-2">
              Consumidores a Jusante ({dependents.length})
            </span>
            <div className="space-y-1.5">
              {dependents.map((dep) => (
                <div
                  key={dep.consumerArtifactId}
                  className="p-2 rounded bg-[#0c0d18] border border-[#18192a] flex items-center justify-between text-[11px]"
                >
                  <span className="text-slate-300 truncate font-medium">{dep.consumerName}</span>
                  <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                    {dep.relationship.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-[#1c1d30] text-[10px] text-slate-500 flex items-center justify-between">
        <span>Grafo Criativo V4</span>
        <span className="flex items-center gap-1 text-slate-400">
          <ShieldCheck size={11} className="text-emerald-400" /> Integridade Verificada
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
    </div>
  );
}
