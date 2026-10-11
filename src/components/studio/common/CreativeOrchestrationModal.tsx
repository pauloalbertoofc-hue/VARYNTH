"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CreativePlan, CreativeExecutionPlan, PlanStatus } from "@/lib/orchestration/types";
import { CreativeOrchestrator } from "@/lib/orchestration/creative-orchestrator";
import { CreativeExecutionController } from "@/lib/orchestration/creative-execution-controller";
import { athenaEventBus } from "@/lib/athena/events/event-bus";
import { Network, Sparkles, Layers, ShieldCheck, CheckCircle2, AlertCircle, Play, X, RefreshCw } from "lucide-react";
import { STUDIO_DEFINITIONS } from "@/lib/studio/studio-registry";
import { Surface } from "@/components/ui/Surface";

interface CreativeOrchestrationModalProps {
  planId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreativeOrchestrationModal({
  planId,
  isOpen,
  onClose,
}: CreativeOrchestrationModalProps) {
  const [plan, setPlan] = useState<CreativePlan | null>(null);
  const [executionPlan, setExecutionPlan] = useState<CreativeExecutionPlan | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "dag" | "capabilities" | "execution">("overview");

  const refresh = useCallback(() => {
    if (planId) {
      const p = CreativeOrchestrator.getPlan(planId);
      setPlan(p || null);
      if (p) {
        const execP = CreativeExecutionController.getExecutionPlanByCreativePlanId(p.id);
        setExecutionPlan(execP || null);
      }
    } else {
      const all = CreativeOrchestrator.listPlans();
      const latest = all.length > 0 ? all[all.length - 1] : null;
      setPlan(latest);
      if (latest) {
        const execP = CreativeExecutionController.getExecutionPlanByCreativePlanId(latest.id);
        setExecutionPlan(execP || null);
      }
    }
  }, [planId]);

  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen, refresh]);

  useEffect(() => {
    const unsubCreated = athenaEventBus.on("CREATIVE_PLAN_CREATED", refresh);
    const unsubApproved = athenaEventBus.on("CREATIVE_PLAN_APPROVED", refresh);
    const unsubRevised = athenaEventBus.on("CREATIVE_PLAN_REVISED", refresh);
    const unsubExec = athenaEventBus.on("EXECUTION_COMPLETED", refresh);

    return () => {
      unsubCreated();
      unsubApproved();
      unsubRevised();
      unsubExec();
    };
  }, [refresh]);

  if (!isOpen) return null;

  const handleCreateSamplePlan = () => {
    const samplePlan = CreativeOrchestrator.planIntent({
      id: `intent-${Date.now()}`,
      userGoal: "Pipeline Multimídia: Roteiro, Áudio, Teaser e Web",
      sourceArtifactIds: [],
      requestedOutputs: [
        {
          artifactType: "DOCUMENT",
          description: "Roteiro Base com Estrutura de Atos",
          required: true,
        },
        {
          artifactType: "AUDIO",
          description: "Composição de Trilha Sonora",
          required: true,
        },
        {
          artifactType: "VIDEO",
          description: "Renderização do Teaser Promocional",
          required: true,
        },
        {
          artifactType: "WEBSITE",
          description: "Landing Page Oficial VARYNTH",
          required: true,
        },
      ],
      createdAt: new Date().toISOString(),
    });

    setPlan(samplePlan);
    refresh();
  };

  const handleApprove = () => {
    if (!plan) return;
    const res = CreativeOrchestrator.approvePlan(plan.id);
    if (res.success && res.executionPlan) {
      setExecutionPlan(res.executionPlan);
      setActiveTab("execution");
      refresh();
    }
  };

  const handleExecute = async () => {
    if (!executionPlan) return;
    setIsExecuting(true);
    try {
      const res = await CreativeExecutionController.executePlan(executionPlan);
      setExecutionPlan(res.executionPlan);
      refresh();
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = () => {
    if (executionPlan) {
      CreativeExecutionController.cancelPlan(executionPlan.id);
      refresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/80 backdrop-blur-md p-4 animate-fade-in">
      <Surface tone="floating" className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl text-[var(--vly-text-secondary)] clip-corner">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] bg-[var(--vly-surface)]/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--vly-border-accent)] bg-[var(--vly-accent-soft)] text-[var(--vly-accent)]">
              <Network size={18} />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]">
                {plan ? plan.title : "Orquestrador Criativo Multi-Estúdio"}
                {plan && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--vly-info)]/15 text-[var(--vly-info)] border border-[var(--vly-border-info)] font-mono">
                    Rev v{plan.revision}
                  </span>
                )}
                {plan && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      plan.status === "COMPLETED"
                        ? "bg-[var(--vly-success)]/15 text-[var(--vly-success)] border border-[var(--vly-border-success)]"
                        : plan.status === "APPROVED"
                        ? "bg-[var(--vly-info)]/15 text-[var(--vly-info)] border border-[var(--vly-border-info)]"
                        : plan.status === "BLOCKED"
                        ? "bg-[var(--vly-danger)]/15 text-[var(--vly-danger)] border border-[var(--vly-border-danger)]"
                        : "bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)] border border-[var(--vly-border-subtle)]"
                    }`}
                  >
                    {plan.status}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-[var(--vly-text-secondary)]">
                Coordenação de pipelines acíclicos dirigidos (DAG) através dos 6 Studios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="vly-interactive rounded-lg p-1 text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* If no plan exists yet, show clean intro & capabilities */}
        {!plan ? (
          <div className="p-8 flex flex-col items-center text-center space-y-6 overflow-y-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--vly-border-accent)] bg-[var(--vly-accent-soft)] text-[var(--vly-accent)]">
              <Sparkles size={28} />
            </div>
            <div className="max-w-lg space-y-2">
              <h3 className="text-base font-bold text-[var(--vly-text-primary)]">Nenhum Plano Ativo no Momento</h3>
              <p className="text-xs leading-relaxed text-[var(--vly-text-secondary)]">
                O Orquestrador Criativo permite encadear criações complexas com dependências governadas (ex: roteiro no Document Studio gera locução no Audio Studio, renderiza vídeo no Video Studio e publica no Web Studio).
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
              {STUDIO_DEFINITIONS.map((s) => (
                <div key={s.type} className="p-3 rounded-xl bg-[var(--vly-surface-raised)] border border-[var(--vly-border-subtle)] space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--vly-text-primary)]">
                    <span>{s.label}</span>
                    <span className="text-[9px] text-[var(--vly-text-muted)] font-mono">S{s.studioNumber}</span>
                  </div>
                  <p className="text-[10px] text-[var(--vly-text-secondary)] line-clamp-2">{s.description}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleCreateSamplePlan}
              className="vly-interactive flex items-center gap-2 rounded-xl border border-[var(--vly-border-accent)] bg-[var(--vly-accent)] px-5 py-2.5 text-xs font-semibold text-[var(--vly-text-on-accent)] shadow-lg shadow-[var(--vly-accent-soft)]"
            >
              <Play size={14} /> Criar Plano Integrado de Exemplo
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-[var(--vly-border-subtle)] bg-[var(--vly-world)]/40 px-6 gap-2">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-3 px-3 border-b-2 text-xs font-semibold transition ${
                  activeTab === "overview"
                    ? "border-[var(--vly-info)] text-[var(--vly-info)]"
                    : "border-transparent text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                }`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab("dag")}
                className={`py-3 px-3 border-b-2 text-xs font-semibold transition ${
                  activeTab === "dag"
                    ? "border-[var(--vly-info)] text-[var(--vly-info)]"
                    : "border-transparent text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                }`}
              >
                Grafo de Execução (DAG)
              </button>
              <button
                onClick={() => setActiveTab("capabilities")}
                className={`py-3 px-3 border-b-2 text-xs font-semibold transition ${
                  activeTab === "capabilities"
                    ? "border-[var(--vly-info)] text-[var(--vly-info)]"
                    : "border-transparent text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                }`}
              >
                Capacidades & Recursos
              </button>
              <button
                onClick={() => setActiveTab("execution")}
                className={`py-3 px-3 border-b-2 text-xs font-semibold transition ${
                  activeTab === "execution"
                    ? "border-[var(--vly-info)] text-[var(--vly-info)]"
                    : "border-transparent text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                }`}
              >
                Execução em Tempo Real
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto max-h-[55vh] space-y-4">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[var(--vly-surface-raised)] border border-[var(--vly-border-subtle)]">
                    <h4 className="text-xs font-bold text-[var(--vly-text-secondary)] uppercase tracking-wider mb-1">Resumo do Plano</h4>
                    <p className="text-xs text-[var(--vly-text-secondary)]">{plan.summary}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Artefatos Planejados ({plan.plannedArtifacts.length})</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {plan.plannedArtifacts.map((art, i) => (
                        <div key={art.tempId} className="p-3 rounded-xl bg-[#111220] border border-[#1e2036] flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-200">
                                {i + 1}. {art.title}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono">
                                {art.artifactType}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">ID Temp: {art.tempId}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "dag" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Topologia e Encadeamento</h4>
                  <div className="p-4 rounded-xl bg-[#111220] border border-[#1e2036] space-y-3 font-mono text-xs">
                    {plan.dependencies.length === 0 ? (
                      <p className="text-slate-500">Pipeline sequencial linear sem dependências cíclicas.</p>
                    ) : (
                      plan.dependencies.map((dep, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-indigo-400 font-bold">{dep.sourceTempId}</span>
                          <span className="text-slate-600">→</span>
                          <span className="text-slate-200">{dep.targetTempId}</span>
                          <span className="text-slate-500 text-[10px]">({dep.type})</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === "capabilities" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Capacidades Requeridas</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {plan.requiredCapabilities.map((cap, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#111220] border border-[#1e2036]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-200">{cap.capabilityId}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                              cap.available
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {cap.available ? "DISPONÍVEL" : "BLOQUEADO"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono">Domínio: {cap.domain}</span>
                        {cap.fallbackDescription && (
                          <span className="text-[10px] text-amber-400 mt-1 block">Fallback: {cap.fallbackDescription}</span>
                        )}
                        {cap.blockerMessage && (
                          <span className="text-[10px] text-rose-400 mt-1 block font-mono">{cap.blockerMessage}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "execution" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Status do Pipeline Governança</h4>
                  {executionPlan ? (
                    <div className="space-y-2">
                      {executionPlan.steps.map((s, idx) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#111220] border border-[#1e2036]"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                            <span className="text-xs font-semibold text-slate-200">{s.title}</span>
                          </div>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              s.status === "COMPLETED"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : s.status === "RUNNING"
                                ? "bg-amber-950 text-amber-300 border border-amber-800 animate-pulse"
                                : s.status === "BLOCKED"
                                ? "bg-rose-950 text-rose-300 border border-rose-800"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Aprove o plano abaixo para derivar o plano de execução governado.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-[#1c1d32] flex items-center justify-between bg-[#0a0a14]/80">
              <div className="text-xs text-slate-400">
                {plan.status === "APPROVED"
                  ? "✓ Plano aprovado pelo usuário. Pronto para execução."
                  : plan.status === "COMPLETED"
                  ? "✓ Pipeline concluído com sucesso."
                  : "Aguardando aprovação humana soberana."}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Fechar
                </button>

                {plan.status !== "APPROVED" && plan.status !== "COMPLETED" && (
                  <button
                    onClick={handleApprove}
                    disabled={plan.status === "BLOCKED"}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-500/20"
                  >
                    Aprovar Plano
                  </button>
                )}

                {executionPlan && executionPlan.status !== "COMPLETED" && (
                  <>
                    <button
                      onClick={handleExecute}
                      disabled={isExecuting}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-emerald-500/20"
                    >
                      {isExecuting ? "Executando..." : "Executar Agora"}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 bg-rose-900/60 hover:bg-rose-800 text-rose-300 text-xs font-semibold rounded-xl transition border border-rose-700"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </Surface>
    </div>
  );
}
