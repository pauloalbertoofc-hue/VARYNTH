"use client";

import React, { useState, useEffect } from "react";
import { CreativePlan, CreativeExecutionPlan, PlanStatus } from "@/lib/orchestration/types";
import { CreativeOrchestrator } from "@/lib/orchestration/creative-orchestrator";
import { CreativeExecutionController } from "@/lib/orchestration/creative-execution-controller";
import { athenaEventBus } from "@/lib/athena/events/event-bus";

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

  const refresh = () => {
    if (planId) {
      const p = CreativeOrchestrator.getPlan(planId);
      setPlan(p || null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen, planId]);

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
  }, []);

  if (!isOpen || !plan) return null;

  const handleApprove = () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🦉</span>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {plan.title}
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700">
                  Rev v{plan.revision}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                  plan.status === "COMPLETED" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
                  plan.status === "APPROVED" ? "bg-sky-950 text-sky-300 border border-sky-800" :
                  plan.status === "BLOCKED" ? "bg-rose-950 text-rose-300 border border-rose-800" :
                  "bg-slate-800 text-slate-300 border border-slate-700"
                }`}>
                  {plan.status}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">Plan Hash: {plan.planHash || "calculating..."}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg px-2 py-1 rounded hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/40 text-sm">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-4 font-medium border-b-2 transition-colors ${
              activeTab === "overview" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            📋 Visão Geral
          </button>
          <button
            onClick={() => setActiveTab("dag")}
            className={`py-3 px-4 font-medium border-b-2 transition-colors ${
              activeTab === "dag" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🔄 Grafo de Dependências (DAG)
          </button>
          <button
            onClick={() => setActiveTab("capabilities")}
            className={`py-3 px-4 font-medium border-b-2 transition-colors ${
              activeTab === "capabilities" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            ⚡ Capacidades & Bloqueios
          </button>
          <button
            onClick={() => setActiveTab("execution")}
            className={`py-3 px-4 font-medium border-b-2 transition-colors ${
              activeTab === "execution" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🚀 Execução Governada
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg">
                <h4 className="text-sm font-semibold text-slate-300 mb-1">Resumo Executivo</h4>
                <p className="text-sm text-slate-400">{plan.summary}</p>
                <div className="mt-3 flex gap-2">
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
                    Carga: <strong className="text-amber-400">{plan.resourceClass}</strong>
                  </span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
                    Outputs: <strong>{plan.plannedArtifacts.length}</strong>
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Saídas Previstas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plan.plannedArtifacts.map((art) => (
                    <div key={art.tempId} className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-semibold text-indigo-400 block">[{art.artifactType}] {art.tempId}</span>
                        <span className="text-sm font-medium text-slate-200">{art.title}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${art.required ? "bg-indigo-950 text-indigo-300 border border-indigo-800" : "bg-slate-800 text-slate-400"}`}>
                        {art.required ? "Obrigatório" : "Opcional"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "dag" && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-300">Relações de Precedência</h4>
              {plan.dependencies.length === 0 ? (
                <p className="text-sm text-slate-500">Todas as saídas são independentes e podem ser criadas em paralelo.</p>
              ) : (
                <div className="space-y-2">
                  {plan.dependencies.map((dep, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-sm">
                      <span className="font-mono text-slate-300">
                        <strong className="text-indigo-400">{dep.sourceTempId}</strong> depende de <strong className="text-emerald-400">{dep.targetTempId}</strong>
                      </span>
                      <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono">
                        Tipo: {dep.type} | Slot: {dep.usageSlot || "global"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "capabilities" && (
            <div className="space-y-4">
              {plan.blockers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-rose-400">Bloqueios & Restrições Locais</h4>
                  {plan.blockers.map((b) => (
                    <div key={b.id} className="p-3 bg-rose-950/30 border border-rose-800/60 rounded-lg text-sm text-rose-300">
                      <strong>[{b.severity}]</strong> {b.message}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Capacidades Consultadas</h4>
                <div className="space-y-2">
                  {plan.requiredCapabilities.map((cap) => (
                    <div key={cap.capabilityId} className="p-2.5 bg-slate-950/40 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-300">{cap.domain}: {cap.capabilityId}</span>
                      <span className={`px-2 py-0.5 rounded font-semibold ${cap.available ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-amber-950 text-amber-400 border border-amber-800"}`}>
                        {cap.available ? "DISPONÍVEL" : cap.fallbackAvailable ? "FALLBACK LOCAL" : "INDISPONÍVEL"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "execution" && (
            <div className="space-y-4">
              {executionPlan ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-300">
                      Plano de Execução: <strong className="text-indigo-400">{executionPlan.id}</strong>
                    </span>
                    <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-400">
                      Status: {executionPlan.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {executionPlan.steps.map((s) => (
                      <div key={s.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-sm">
                        <div>
                          <span className="font-mono text-xs text-indigo-400 block">Step #{s.stepNumber} [{s.type}]</span>
                          <span className="font-medium text-slate-200">{s.title}</span>
                          {s.error && <span className="text-xs text-rose-400 block mt-1">{s.error}</span>}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded font-mono font-semibold ${
                          s.status === "COMPLETED" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
                          s.status === "RUNNING" ? "bg-amber-950 text-amber-300 border border-amber-800 animate-pulse" :
                          s.status === "BLOCKED" ? "bg-rose-950 text-rose-300 border border-rose-800" :
                          "bg-slate-800 text-slate-400"
                        }`}>
                          {s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Aprove o plano para derivar o plano de execução governado.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="text-xs text-slate-500">
            {plan.status === "APPROVED" ? "Plano aprovado pelo usuário. Pronto para execução." : "Revisão pendente de aprovação humana."}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Fechar
            </button>

            {plan.status !== "APPROVED" && plan.status !== "COMPLETED" && (
              <button
                onClick={handleApprove}
                disabled={plan.status === "BLOCKED"}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
              >
                Aprovar Plano
              </button>
            )}

            {executionPlan && executionPlan.status !== "COMPLETED" && (
              <>
                <button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {isExecuting ? "Executando..." : "Executar Agora"}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-rose-900/60 hover:bg-rose-800 text-rose-300 text-sm font-medium rounded-lg transition-colors border border-rose-700"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
