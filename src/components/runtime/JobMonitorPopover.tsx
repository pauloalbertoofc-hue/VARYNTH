"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Play,
  RotateCcw,
  X,
  ExternalLink,
  Loader2,
  Layers,
} from "lucide-react";
import { jobManager } from "@/lib/runtime/job-manager";
import { Job, JobStatus } from "@/lib/runtime/types";
import { cn } from "@/lib/utils";

export function JobMonitorPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>(() => {
    try {
      return jobManager.getAll();
    } catch {
      return [];
    }
  });
  const popoverRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const syncJobs = () => {
    try {
      setJobs(jobManager.getAll());
    } catch {
      setJobs([]);
    }
  };

  useEffect(() => {
    syncJobs();

    const handleUpdate = () => syncJobs();
    window.addEventListener("varynth_jobs_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("varynth_jobs_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const activeJobs = useMemo(
    () => jobs.filter((j) => j.status === "RUNNING" || j.status === "QUEUED"),
    [jobs]
  );

  const attentionJobs = useMemo(
    () => jobs.filter((j) => j.status === "FAILED" || j.status === "INTERRUPTED"),
    [jobs]
  );

  const recentCompleted = useMemo(
    () => jobs.filter((j) => j.status === "COMPLETED" || j.status === "CANCELLED").slice(0, 5),
    [jobs]
  );

  const handleCancel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    jobManager.cancelJob(id);
    syncJobs();
  };

  const handleRetry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    jobManager.retryJob(id);
    syncJobs();
  };

  const handleNavigateToArtifact = (artifactId?: string) => {
    if (!artifactId) return;
    setIsOpen(false);
    router.push(`/modules/studio?id=${artifactId}`);
  };

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case "RUNNING":
        return (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold flex items-center gap-1 animate-pulse">
            <Loader2 className="w-2.5 h-2.5 animate-spin" /> EM EXECUÇÃO
          </span>
        );
      case "QUEUED":
        return (
          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-mono font-bold flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> NA FILA
          </span>
        );
      case "FAILED":
        return (
          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-mono font-bold flex items-center gap-1">
            <XCircle className="w-2.5 h-2.5" /> FALHOU
          </span>
        );
      case "INTERRUPTED":
        return (
          <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[9px] font-mono font-bold flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> INTERROMPIDO
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-bold flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> CONCLUÍDO
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 border border-slate-500/30 text-[9px] font-mono flex items-center gap-1">
            <X className="w-2.5 h-2.5" /> CANCELADO
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button in Navbar */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
          activeJobs.length > 0
            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
            : attentionJobs.length > 0
            ? "bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
        )}
        title="Monitor de Background Jobs (Render, Build, Export)"
      >
        <Activity
          size={14}
          className={cn(
            activeJobs.length > 0
              ? "text-amber-400 animate-pulse"
              : attentionJobs.length > 0
              ? "text-red-400"
              : "text-slate-500"
          )}
        />
        <span className="hidden sm:inline text-[11px]">Jobs</span>
        {activeJobs.length > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-bold">
            {activeJobs.length}
          </span>
        )}
        {activeJobs.length === 0 && attentionJobs.length > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {attentionJobs.length}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0f101f] border border-[#232542] shadow-2xl z-50 overflow-hidden text-slate-200 animate-fade-in clip-corner">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#1c1d32] flex items-center justify-between bg-[#0a0a14]/80">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-violet-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Monitor de Background Jobs
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {activeJobs.length} ativos · {jobs.length} total
            </span>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto p-3 space-y-2.5">
            {jobs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Nenhum background job registrado no momento.
              </div>
            ) : (
              <>
                {/* Active Jobs */}
                {activeJobs.map((j) => (
                  <div
                    key={j.id}
                    className="p-3 rounded-xl bg-[#141527] border border-amber-500/30 space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 block">{j.type}</span>
                        <h4 className="text-xs font-semibold text-white truncate">{j.title}</h4>
                      </div>
                      {getStatusBadge(j.status)}
                    </div>

                    {typeof j.progress === "number" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>Progresso</span>
                          <span>{j.progress}%</span>
                        </div>
                        <div className="w-full bg-[#0a0a14] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-400 h-full rounded-full transition-all duration-300"
                            style={{ width: `${j.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="text-slate-500 font-mono">ID: {j.id.slice(0, 12)}...</span>
                      {j.status === "RUNNING" || j.status === "QUEUED" ? (
                        <button
                          onClick={(e) => handleCancel(j.id, e)}
                          className="text-rose-400 hover:text-rose-300 font-medium"
                        >
                          Cancelar Job
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}

                {/* Attention / Failed Jobs */}
                {attentionJobs.map((j) => (
                  <div
                    key={j.id}
                    className="p-3 rounded-xl bg-[#17121c] border border-red-500/30 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 block">{j.type}</span>
                        <h4 className="text-xs font-semibold text-red-200 truncate">{j.title}</h4>
                      </div>
                      {getStatusBadge(j.status)}
                    </div>

                    {j.error && (
                      <p className="text-[10px] text-red-400 bg-red-950/40 p-2 rounded border border-red-900/40 leading-relaxed font-mono">
                        {j.error.message}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="text-slate-500 font-mono">ID: {j.id.slice(0, 12)}...</span>
                      <button
                        onClick={(e) => handleRetry(j.id, e)}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        <RotateCcw size={11} /> Tentar Novamente
                      </button>
                    </div>
                  </div>
                ))}

                {/* Recent Completed */}
                {recentCompleted.length > 0 && activeJobs.length === 0 && attentionJobs.length === 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1">
                      Concluídos Recentemente
                    </span>
                    {recentCompleted.map((j) => (
                      <div
                        key={j.id}
                        onClick={() => handleNavigateToArtifact(j.relatedArtifactId)}
                        className={cn(
                          "p-2.5 rounded-xl bg-[#111220] border border-[#1e2038] flex items-center justify-between text-xs",
                          j.relatedArtifactId ? "cursor-pointer hover:border-violet-500/40" : ""
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-300 truncate block">{j.title}</span>
                          <span className="text-[9px] text-slate-500 font-mono">{j.type}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(j.status)}
                          {j.relatedArtifactId && <ExternalLink size={12} className="text-slate-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

