"use client";

import { useState, useEffect } from "react";
import {
  DocumentationReviewItem,
  InteractiveEvidence,
} from "@/lib/athena/guardian/types";
import { documentationGuardian } from "@/lib/athena/guardian/documentation-guardian";
import {
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  GitCompare,
  Sparkles,
  Edit3,
  Eye,
  History,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Save,
  RotateCcw,
  Check,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Surface } from "@/components/ui/Surface";

interface DocumentReviewViewerProps {
  item: DocumentationReviewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string, editedContent?: string) => void;
  onReject: (id: string, reason: string) => void;
  onNavigateToEvidence?: (evidence: InteractiveEvidence) => void;
}

type ViewerTab = "doc" | "diff" | "evidences" | "edit" | "preview" | "audit";

export function DocumentReviewViewer({
  item,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onNavigateToEvidence,
}: DocumentReviewViewerProps) {
  const [activeTab, setActiveTab] = useState<ViewerTab>("doc");
  const [editedText, setEditedText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [hasInspected, setHasInspected] = useState(false);

  useEffect(() => {
    if (item) {
      setEditedText(item.editedContent || item.fullDraftContent);
      setHasInspected(true);
      documentationGuardian.markAsRead(item.id, "Paulo");
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const currentContent = item.currentVersionContent || "";
  const draftContent = editedText || item.fullDraftContent;

  const handleSaveEdit = () => {
    documentationGuardian.updateDraftContent(item.id, editedText, "Paulo");
    setIsEditing(false);
  };

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) return;
    onReject(item.id, rejectionReason.trim());
    setShowRejectModal(false);
    setRejectionReason("");
    onClose();
  };

  const handleConfirmApprove = () => {
    onApprove(item.id, editedText !== item.fullDraftContent ? editedText : undefined);
    onClose();
  };

  const getChangeBadge = (changeType: string) => {
    switch (changeType) {
      case "NEW_DOCUMENT":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] text-[var(--vly-success)] border border-[var(--vly-border-success)]">
            NOVO DOCUMENTO
          </span>
        );
      case "DOCUMENT_UPDATE":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] text-[var(--vly-info)] border border-[var(--vly-border-info)]">
            ATUALIZAÇÃO DE DOCUMENTO
          </span>
        );
      case "HISTORICAL_CORRECTION":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--vly-surface-warning)] text-[var(--vly-warning)] border border-[var(--vly-border-warning)]">
            CORREÇÃO HISTÓRICA
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)] border border-[var(--vly-border-default)]">
            {changeType}
          </span>
        );
    }
  };

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/80 p-4 backdrop-blur-md vly-motion-enter text-[var(--vly-text-secondary)]">
      <Surface tone="floating" role="dialog" aria-modal="true" aria-labelledby="document-review-title" className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl">
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-6 md:flex-row md:items-center">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-[var(--vly-info)]">{item.id}</span>
              {getChangeBadge(item.changeType)}
              <span className="rounded border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2 py-0.5 font-mono text-[10px] text-[var(--vly-text-secondary)]">
                Tipo: {item.type}
              </span>
              {item.status === "APPROVED" && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] text-[var(--vly-success)] border border-[var(--vly-border-success)] font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> APROVADO
                </span>
              )}
              {item.status === "REJECTED" && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[color-mix(in_srgb,var(--vly-danger)_12%,var(--vly-surface))] text-[var(--vly-danger)] border border-[var(--vly-border-danger)] font-bold flex items-center gap-1">
                  <X className="w-3 h-3" /> REJEITADO
                </span>
              )}
            </div>
            <h2 id="document-review-title" className="text-base font-bold text-[var(--vly-text-primary)] leading-tight">{item.title}</h2>
            <div className="text-xs text-[var(--vly-text-muted)] font-mono flex items-center gap-2">
              <span>Alvo: <code className="text-[var(--vly-info)]">{item.targetDocument}</code></span>
              <span>•</span>
              <span>Fonte: {item.sourceEvidence}</span>
            </div>
          </div>

          <button
            type="button"
            aria-label="Fechar revisão do documento"
            onClick={onClose}
            className="vly-interactive self-start rounded-lg p-2 text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] md:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div role="tablist" aria-label="Seções da revisão" className="flex flex-wrap items-center gap-2 border-b border-[var(--vly-border-subtle)] bg-[var(--vly-world)]/40 px-6 pt-3 text-xs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "doc"}
            onClick={() => setActiveTab("doc")}
            className={`px-3.5 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all border-t border-x ${
              activeTab === "doc"
                ? "border-[var(--vly-border-info)] border-b-transparent bg-[var(--vly-surface-raised)] font-bold text-[var(--vly-info)]"
                : "border-transparent text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Documento Completo
          </button>

          {item.currentVersionContent && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "diff"}
              onClick={() => setActiveTab("diff")}
              className={`px-3.5 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all border-t border-x ${
                activeTab === "diff"
                  ? "border-[var(--vly-border-info)] border-b-transparent bg-[var(--vly-surface-raised)] font-bold text-[var(--vly-info)]"
                  : "border-transparent text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              Comparação (Diff)
            </button>
          )}

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "evidences"}
            onClick={() => setActiveTab("evidences")}
            className={`px-3.5 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all border-t border-x ${
              activeTab === "evidences"
                ? "border-[var(--vly-border-info)] border-b-transparent bg-[var(--vly-surface-raised)] font-bold text-[var(--vly-info)]"
                : "border-transparent text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Evidências Interativas ({item.interactiveEvidences.length})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "edit"}
            onClick={() => setActiveTab("edit")}
            className={`px-3.5 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all border-t border-x ${
              activeTab === "edit"
                ? "border-[var(--vly-border-info)] border-b-transparent bg-[var(--vly-surface-raised)] font-bold text-[var(--vly-info)]"
                : "border-transparent text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar Texto do Draft
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "preview"}
            onClick={() => setActiveTab("preview")}
            className={`px-3.5 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all border-t border-x ${
              activeTab === "preview"
                ? "border-[var(--vly-border-info)] border-b-transparent bg-[var(--vly-surface-raised)] font-bold text-[var(--vly-info)]"
                : "border-transparent text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview na Publicação
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "audit"}
            onClick={() => setActiveTab("audit")}
            className={`px-3.5 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all border-t border-x ${
              activeTab === "audit"
                ? "border-[var(--vly-border-info)] border-b-transparent bg-[var(--vly-surface-raised)] font-bold text-[var(--vly-info)]"
                : "border-transparent text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Trilha de Auditoria
          </button>
        </div>

        {/* TAB CONTENT BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: FULL DOCUMENT VIEWER */}
          {activeTab === "doc" && (
            <div className="space-y-6">
              <div className="space-y-1 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-world)]/60 p-4 text-xs text-[var(--vly-text-secondary)]">
                <strong className="text-[10px] font-mono uppercase tracking-wider text-[var(--vly-info)]">
                  Resumo da Proposta de Engenharia:
                </strong>
                <p>{item.summary}</p>
                <div className="pt-2 text-[11px] text-[var(--vly-text-secondary)]">
                  <strong className="text-[var(--vly-text-primary)]">Rationale Arquitetural:</strong> {item.rationale}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 font-sans text-sm text-slate-200 leading-relaxed whitespace-pre-line shadow-inner">
                {draftContent}
              </div>
            </div>
          )}

          {/* TAB 2: DIFF VIEWER */}
          {activeTab === "diff" && item.currentVersionContent && (
            <div className="space-y-4">
              <div className="text-xs font-mono text-[var(--vly-text-secondary)]">
                Comparação entre a <strong className="text-[var(--vly-danger)]">Versão Atual Oficial</strong> e a{" "}
                <strong className="text-[var(--vly-success)]">Versão Proposta pelo Guardian</strong>:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 rounded-xl border border-[var(--vly-danger)]/30 bg-[var(--vly-danger)]/10 p-4">
                  <div className="border-b border-[var(--vly-danger)]/40 pb-2 text-[11px] font-mono font-bold uppercase text-[var(--vly-danger)]">
                    Versão Atual em /docs
                  </div>
                  <pre className="max-h-[450px] overflow-y-auto whitespace-pre-wrap text-xs font-mono leading-relaxed text-[var(--vly-danger)]/80">
                    {item.currentVersionContent}
                  </pre>
                </div>

                <div className="space-y-2 rounded-xl border border-[var(--vly-success)]/30 bg-[var(--vly-success)]/10 p-4">
                  <div className="border-b border-[var(--vly-success)]/40 pb-2 text-[11px] font-mono font-bold uppercase text-[var(--vly-success)]">
                    Versão Proposta (Com a Lição / ADR Integrada)
                  </div>
                  <pre className="max-h-[450px] overflow-y-auto whitespace-pre-wrap text-xs font-mono leading-relaxed text-[var(--vly-success)]">
                    {draftContent}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INTERACTIVE EVIDENCES */}
          {activeTab === "evidences" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Evidências Técnicas Utilizadas
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  A Athena não inventa história. Toda proposta interpretativa está fundamentada em evidências verificáveis de código, testes de regressão ou decisões anteriores.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {item.interactiveEvidences.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                        {ev.type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{ev.targetId}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {ev.label}
                    </h4>
                    <p className="text-xs text-slate-400">{ev.description}</p>
                    {onNavigateToEvidence && (
                      <button
                        onClick={() => onNavigateToEvidence(ev)}
                        className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform pt-1"
                      >
                        Inspecionar Evidência <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: DIRECT EDITING BEFORE APPROVAL */}
          {activeTab === "edit" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Editar Texto do Draft antes da Publicação</h3>
                  <p className="text-xs text-slate-400">
                    Você pode refinar a redação, ajustar termos ou corrigir justificativas antes de publicar oficialmente.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditedText(item.fullDraftContent)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar Original
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Alteração
                  </button>
                </div>
              </div>

              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={16}
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 leading-relaxed"
                placeholder="Edite o conteúdo em Markdown do documento..."
              />
            </div>
          )}

          {/* TAB 5: PUBLICATION PREVIEW */}
          {activeTab === "preview" && (
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  Visualização no VARYNTH Technical Archive
                </div>
                <h1 className="text-xl font-bold text-white mt-1">{item.title}</h1>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  Status: <code>{item.status}</code> • Arquivo: <code>{item.targetDocument}</code>
                </div>
              </div>

              <div className="prose prose-invert max-w-none text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                {draftContent}
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                Trilha de Auditoria do Documento
              </h3>

              <div className="space-y-2">
                {item.auditTrail.map((audit, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        <span className="font-mono text-cyan-400 font-bold">[{audit.action}]</span>
                        <span>{audit.details || "Ação registrada no sistema"}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Ator: {audit.actor} • Timestamp: {audit.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS BAR */}
        <div className="flex flex-col justify-between gap-4 border-t border-[var(--vly-border-default)] bg-[var(--vly-surface)]/80 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Documento completo inspecionado e verificado para decisão humana.</span>
          </div>

          <div className="flex items-center gap-3">
            {item.status === "PENDING_REVIEW" && (
              <>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Rejeitar com Motivo
                </button>

                <button
                  onClick={handleConfirmApprove}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aprovar & Publicar em /docs
                </button>
              </>
            )}

            {item.status !== "PENDING_REVIEW" && (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Fechar Visualizador
              </button>
            )}
          </div>
        </div>
      </Surface>

      {/* REJECTION REASON MODAL DIALOG */}
      {showRejectModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <Surface tone="floating" className="w-full max-w-md space-y-4 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--vly-danger)]">
              <AlertTriangle className="w-5 h-5" />
              Registrar Motivo da Rejeição
            </div>
            <p className="text-xs text-[var(--vly-text-secondary)]">
              O motivo da rejeição será gravado na memória técnica do Guardian para que a Athena não repita a mesma premissa incorreta no futuro.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: A premissa histórica está incorreta; a indexação vetorial ainda não foi validada em produção..."
              rows={4}
              className="vly-field min-h-28 w-full resize-y rounded-xl border-[var(--vly-border-default)] bg-[var(--vly-surface)] p-3 text-xs text-[var(--vly-text-primary)] placeholder:text-[var(--vly-text-muted)] focus:border-[var(--vly-border-danger)] focus:ring-[var(--vly-danger-soft)]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="vly-interactive rounded-lg bg-[var(--vly-surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--vly-text-secondary)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
                className="vly-interactive rounded-lg border border-[var(--vly-border-danger)] bg-[var(--vly-danger)] px-4 py-1.5 text-xs font-bold text-[var(--vly-text-on-accent)] disabled:opacity-50"
              >
                Confirmar Rejeição
              </button>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}
