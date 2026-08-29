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
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            NOVO DOCUMENTO
          </span>
        );
      case "DOCUMENT_UPDATE":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            ATUALIZAÇÃO DE DOCUMENTO
          </span>
        );
      case "HISTORICAL_CORRECTION":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            CORREÇÃO HISTÓRICA
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
            {changeType}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in text-slate-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* HEADER */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400">{item.id}</span>
              {getChangeBadge(item.changeType)}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Tipo: {item.type}
              </span>
              {item.status === "APPROVED" && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> APROVADO
                </span>
              )}
              {item.status === "REJECTED" && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-bold flex items-center gap-1">
                  <X className="w-3 h-3" /> REJEITADO
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-white leading-tight">{item.title}</h2>
            <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
              <span>Alvo: <code className="text-cyan-300">{item.targetDocument}</code></span>
              <span>•</span>
              <span>Fonte: {item.sourceEvidence}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors self-start md:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap items-center gap-2 px-6 pt-3 border-b border-slate-800/80 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab("doc")}
            className={`px-3.5 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all border-t border-x ${
              activeTab === "doc"
                ? "bg-slate-900 text-cyan-300 border-slate-700 border-b-transparent font-bold"
                : "text-slate-400 border-transparent hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Documento Completo
          </button>

          {item.currentVersionContent && (
            <button
              onClick={() => setActiveTab("diff")}
              className={`px-3.5 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all border-t border-x ${
                activeTab === "diff"
                  ? "bg-slate-900 text-cyan-300 border-slate-700 border-b-transparent font-bold"
                  : "text-slate-400 border-transparent hover:text-white"
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              Comparação (Diff)
            </button>
          )}

          <button
            onClick={() => setActiveTab("evidences")}
            className={`px-3.5 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all border-t border-x ${
              activeTab === "evidences"
                ? "bg-slate-900 text-cyan-300 border-slate-700 border-b-transparent font-bold"
                : "text-slate-400 border-transparent hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Evidências Interativas ({item.interactiveEvidences.length})
          </button>

          <button
            onClick={() => setActiveTab("edit")}
            className={`px-3.5 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all border-t border-x ${
              activeTab === "edit"
                ? "bg-slate-900 text-cyan-300 border-slate-700 border-b-transparent font-bold"
                : "text-slate-400 border-transparent hover:text-white"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar Texto do Draft
          </button>

          <button
            onClick={() => setActiveTab("preview")}
            className={`px-3.5 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all border-t border-x ${
              activeTab === "preview"
                ? "bg-slate-900 text-cyan-300 border-slate-700 border-b-transparent font-bold"
                : "text-slate-400 border-transparent hover:text-white"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview na Publicação
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3.5 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all border-t border-x ${
              activeTab === "audit"
                ? "bg-slate-900 text-cyan-300 border-slate-700 border-b-transparent font-bold"
                : "text-slate-400 border-transparent hover:text-white"
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
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                <strong className="text-cyan-400 font-mono uppercase tracking-wider text-[10px]">
                  Resumo da Proposta de Engenharia:
                </strong>
                <p>{item.summary}</p>
                <div className="pt-2 text-[11px] text-slate-400">
                  <strong className="text-slate-300">Rationale Arquitetural:</strong> {item.rationale}
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
              <div className="text-xs text-slate-400 font-mono">
                Comparação entre a <strong className="text-red-400">Versão Atual Oficial</strong> e a{" "}
                <strong className="text-emerald-400">Versão Proposta pelo Guardian</strong>:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-red-950/10 border border-red-900/30 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-red-400 uppercase border-b border-red-900/40 pb-2">
                    Versão Atual em /docs
                  </div>
                  <pre className="text-xs font-mono text-red-300/80 whitespace-pre-wrap leading-relaxed max-h-[450px] overflow-y-auto">
                    {item.currentVersionContent}
                  </pre>
                </div>

                <div className="p-4 rounded-xl bg-emerald-950/10 border border-emerald-900/30 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase border-b border-emerald-900/40 pb-2">
                    Versão Proposta (Com a Lição / ADR Integrada)
                  </div>
                  <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed max-h-[450px] overflow-y-auto">
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
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
      </div>

      {/* REJECTION REASON MODAL DIALOG */}
      {showRejectModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              Registrar Motivo da Rejeição
            </div>
            <p className="text-xs text-slate-400">
              O motivo da rejeição será gravado na memória técnica do Guardian para que a Athena não repita a mesma premissa incorreta no futuro.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: A premissa histórica está incorreta; a indexação vetorial ainda não foi validada em produção..."
              rows={4}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50"
              >
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

