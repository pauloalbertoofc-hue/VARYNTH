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
          <span className="px-1.5 py-0.5 rounded bg-[var(--vly-surface-warning)] text-[var(--vly-warning)] border border-[var(--vly-border-warning)] text-[9px] font-mono font-bold flex items-center gap-1 animate-pulse">
            <Loader2 className="w-2.5 h-2.5 animate-spin" /> EM EXECUÇÃO
          </span>
        );
      case "QUEUED":
        return (
          <span className="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] text-[var(--vly-info)] border border-[var(--vly-border-info)] text-[9px] font-mono font-bold flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> NA FILA
          </span>
        );
      case "FAILED":
        return (
          <span className="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--vly-danger)_12%,var(--vly-surface))] text-[var(--vly-danger)] border border-[var(--vly-border-danger)] text-[9px] font-mono font-bold flex items-center gap-1">
            <XCircle className="w-2.5 h-2.5" /> FALHOU
          </span>
        );
      case "INTERRUPTED":
        return (
          <span className="px-1.5 py-0.5 rounded bg-[var(--vly-surface-warning)] text-[var(--vly-warning)] border border-[var(--vly-border-warning)] text-[9px] font-mono font-bold flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> INTERROMPIDO
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] text-[var(--vly-success)] border border-[var(--vly-border-success)] text-[9px] font-mono font-bold flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> CONCLUÍDO
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-1.5 py-0.5 rounded bg-[var(--vly-surface-raised)] text-[var(--vly-text-muted)] border border-[var(--vly-border-default)] text-[9px] font-mono flex items-center gap-1">
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
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="job-monitor-panel"
        aria-label="Abrir monitor de background jobs"
        className={cn(
          "vly-interactive flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
          activeJobs.length > 0
            ? "bg-[var(--vly-surface-warning)] text-[var(--vly-warning)] border border-[var(--vly-border-warning)] hover:bg-[var(--vly-surface-hover)]"
            : attentionJobs.length > 0
            ? "bg-[color-mix(in_srgb,var(--vly-danger)_12%,var(--vly-surface))] text-[var(--vly-danger)] border border-[var(--vly-border-danger)] hover:bg-[var(--vly-surface-hover)]"
            : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] border border-transparent"
        )}
        title="Monitor de Background Jobs (Render, Build, Export)"
      >
        <Activity
          size={14}
          className={cn(
            activeJobs.length > 0
              ? "text-[var(--vly-warning)] animate-pulse"
              : attentionJobs.length > 0
              ? "text-[var(--vly-danger)]"
              : "text-[var(--vly-text-disabled)]"
          )}
        />
        <span className="hidden sm:inline text-[11px]">Jobs</span>
        {activeJobs.length > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-[var(--vly-warning)] text-[var(--vly-accent-contrast)] text-[10px] font-bold">
            {activeJobs.length}
          </span>
        )}
        {activeJobs.length === 0 && attentionJobs.length > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-[var(--vly-danger)] text-[var(--vly-accent-contrast)] text-[10px] font-bold">
            {attentionJobs.length}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div id="job-monitor-panel" role="region" aria-labelledby="job-monitor-title" className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[var(--vly-surface-floating)] border border-[var(--vly-border-strong)] shadow-2xl shadow-black/30 z-50 overflow-hidden text-[var(--vly-text-secondary)] vly-motion-enter clip-corner">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--vly-border-subtle)] flex items-center justify-between bg-[var(--vly-surface-raised)]">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-[var(--vly-accent)]" />
              <h3 id="job-monitor-title" className="text-xs font-bold text-[var(--vly-text-primary)] uppercase tracking-wider">
                Monitor de Background Jobs
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[var(--vly-text-disabled)]">
              {activeJobs.length} ativos · {jobs.length} total
            </span>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto p-3 space-y-2.5">
            {jobs.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--vly-text-disabled)]">
                Nenhum background job registrado no momento.
              </div>
            ) : (
              <>
                {/* Active Jobs */}
                {activeJobs.map((j) => (
                  <div
                    key={j.id}
                    className="p-3 rounded-xl bg-[var(--vly-surface-raised)] border border-[var(--vly-border-warning)] space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-[var(--vly-text-muted)] block">{j.type}</span>
                        <h4 className="text-xs font-semibold text-[var(--vly-text-primary)] truncate">{j.title}</h4>
                      </div>
                      {getStatusBadge(j.status)}
                    </div>

                    {typeof j.progress === "number" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-[var(--vly-text-muted)] font-mono">
                          <span>Progresso</span>
                          <span>{j.progress}%</span>
                        </div>
                        <div role="progressbar" aria-label={`Progresso de ${j.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={j.progress} className="w-full bg-[var(--vly-surface)] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[var(--vly-warning)] h-full rounded-full transition-all duration-300"
                            style={{ width: `${j.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="text-[var(--vly-text-disabled)] font-mono">ID: {j.id.slice(0, 12)}...</span>
                      {j.status === "RUNNING" || j.status === "QUEUED" ? (
                        <button
                          type="button"
                          onClick={(e) => handleCancel(j.id, e)}
                          aria-label={`Cancelar job ${j.title}`}
                          className="vly-interactive text-[var(--vly-danger)] hover:text-[var(--vly-accent-hover)] font-medium"
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
                    className="p-3 rounded-xl bg-[color-mix(in_srgb,var(--vly-danger)_8%,var(--vly-surface))] border border-[var(--vly-border-danger)] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-[var(--vly-text-muted)] block">{j.type}</span>
                        <h4 className="text-xs font-semibold text-[var(--vly-danger)] truncate">{j.title}</h4>
                      </div>
                      {getStatusBadge(j.status)}
                    </div>

                    {j.error && (
                      <p className="text-[10px] text-[var(--vly-danger)] bg-[color-mix(in_srgb,var(--vly-danger)_12%,var(--vly-surface))] p-2 rounded border border-[var(--vly-border-danger)] leading-relaxed font-mono">
                        {j.error.message}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span className="text-[var(--vly-text-disabled)] font-mono">ID: {j.id.slice(0, 12)}...</span>
                      <button
                        type="button"
                        onClick={(e) => handleRetry(j.id, e)}
                        aria-label={`Tentar novamente ${j.title}`}
                        className="vly-interactive flex items-center gap-1 text-[var(--vly-success)] hover:text-[var(--vly-accent-hover)] font-medium"
                      >
                        <RotateCcw size={11} /> Tentar Novamente
                      </button>
                    </div>
                  </div>
                ))}

                {/* Recent Completed */}
                {recentCompleted.length > 0 && activeJobs.length === 0 && attentionJobs.length === 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-[var(--vly-text-disabled)] uppercase tracking-wider block px-1">
                      Concluídos Recentemente
                    </span>
                    {recentCompleted.map((j) => (
                      <div
                        key={j.id}
                        onClick={() => handleNavigateToArtifact(j.relatedArtifactId)}
                        role={j.relatedArtifactId ? "button" : undefined}
                        tabIndex={j.relatedArtifactId ? 0 : undefined}
                        onKeyDown={(event) => {
                          if (j.relatedArtifactId && (event.key === "Enter" || event.key === " ")) {
                            event.preventDefault();
                            handleNavigateToArtifact(j.relatedArtifactId);
                          }
                        }}
                        className={cn(
                          "p-2.5 rounded-xl bg-[var(--vly-surface-raised)] border border-[var(--vly-border-default)] flex items-center justify-between text-xs",
                          j.relatedArtifactId ? "cursor-pointer hover:border-[var(--vly-border-accent)]" : ""
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-[var(--vly-text-secondary)] truncate block">{j.title}</span>
                          <span className="text-[9px] text-[var(--vly-text-disabled)] font-mono">{j.type}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(j.status)}
                          {j.relatedArtifactId && <ExternalLink size={12} className="text-[var(--vly-text-disabled)]" />}
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

