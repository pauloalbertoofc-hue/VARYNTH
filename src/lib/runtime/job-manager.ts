import {
  Job,
  JobType,
  JobStatus,
  JobPriority,
  JobActor,
  JobLogEntry,
  JobError,
  JobCheckpoint,
} from "./types";
import { athenaEventBus } from "../athena/events/event-bus";
import { notificationStore } from "../notifications/notification-store";
import { permissionPolicyEngine } from "../permissions/permission-policy";

const STORAGE_KEY = "varynth_jobs_v4";
const JOBS_EVENT = "varynth_jobs_updated";

export class JobManager {
  private jobs: Job[] = [];
  private maxConcurrentJobs = 3;

  constructor() {
    this.init();
    this.setupStorageListener();
    this.recoverInterruptedJobs();
  }

  private setupStorageListener(): void {
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY) {
          this.reloadFromStorage();
          this.emitUpdate();
        }
      });
    }
  }

  private emitUpdate(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(JOBS_EVENT));
    }
  }

  private init(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.jobs = parsed;
            return;
          }
        }
      } catch (err) {
        console.warn("[JobManager] Erro ao carregar jobs do localStorage:", err);
      }
    }
    this.jobs = this.getSeedJobs();
    this.saveToStorage();
  }

  private saveToStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.jobs));
      } catch (err) {
        console.error("[JobManager] Erro ao persistir jobs:", err);
      }
    }
  }

  public reloadFromStorage(): void {
    this.init();
  }

  public getAll(): Job[] {
    return JSON.parse(JSON.stringify(this.jobs));
  }

  public getById(id: string): Job | undefined {
    const j = this.jobs.find((job) => job.id === id);
    return j ? JSON.parse(JSON.stringify(j)) : undefined;
  }

  public getJob(id: string): Job | undefined {
    return this.getById(id);
  }

  /**
   * On initialization, detects running/paused jobs from previous session and marks them as INTERRUPTED.
   */
  public recoverInterruptedJobs(): number {
    let count = 0;
    this.jobs.forEach((j) => {
      if (j.status === "RUNNING" || j.status === "PAUSED") {
        j.status = "INTERRUPTED";
        j.logs.push({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          timestamp: new Date().toISOString(),
          level: "WARNING",
          message: "Execução interrompida devido a reinicialização da aplicação (Job Recovery).",
        });
        count++;
        athenaEventBus.emit("JOB_INTERRUPTED", { jobId: j.id, title: j.title });
      }
    });

    if (count > 0) {
      this.saveToStorage();
      this.emitUpdate();
    }
    return count;
  }

  public createJob(params: {
    type: JobType;
    title: string;
    description?: string;
    priority?: JobPriority;
    createdBy?: JobActor;
    relatedArtifactId?: string;
    relatedProjectId?: string;
    creationEngineId?: string;
    metadata?: Record<string, unknown>;
  }): Job {
    // 1. Permission check for autonomous jobs
    if (params.createdBy === "ATHENA") {
      const perm = permissionPolicyEngine.evaluate({
        actor: { type: "ATHENA" },
        action: "CREATE",
        targetDomain: "WORKSPACE_PROJECT",
      });
      if (!perm.allowed) {
        throw new Error(`Permissão negada para criação de job: ${perm.reason}`);
      }
    }

    const now = new Date().toISOString();
    const id = `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newJob: Job = {
      id,
      type: params.type,
      title: params.title,
      description: params.description,
      status: "QUEUED",
      priority: params.priority || "NORMAL",
      progress: 0,
      createdAt: now,
      logs: [
        {
          id: `log-${Date.now()}-1`,
          timestamp: now,
          level: "INFO",
          message: `Job enfileirado com sucesso: ${params.title}`,
        },
      ],
      retryCount: 0,
      checkpoints: [],
      createdBy: params.createdBy || "USER",
      relatedArtifactId: params.relatedArtifactId,
      relatedProjectId: params.relatedProjectId,
      creationEngineId: params.creationEngineId,
      metadata: params.metadata || {},
    };

    this.jobs.unshift(newJob);
    this.saveToStorage();
    this.emitUpdate();

    athenaEventBus.emit("JOB_QUEUED", { jobId: id, title: newJob.title, type: newJob.type });

    return JSON.parse(JSON.stringify(newJob));
  }

  public startJob(id: string): boolean {
    const job = this.jobs.find((j) => j.id === id);
    if (!job || job.status !== "QUEUED") return false;

    // Check concurrency limit
    const runningCount = this.jobs.filter((j) => j.status === "RUNNING").length;
    if (runningCount >= this.maxConcurrentJobs) {
      this.addLog(id, "WARNING", `Limite de concorrência (${this.maxConcurrentJobs}) atingido. Job aguardando na fila.`);
      return false;
    }

    job.status = "RUNNING";
    job.startedAt = new Date().toISOString();
    this.addLog(id, "INFO", "Execução iniciada pelo Job Runtime Engine.");

    this.saveToStorage();
    this.emitUpdate();

    athenaEventBus.emit("JOB_STARTED", { jobId: id, title: job.title });
    return true;
  }

  public updateProgress(id: string, progress: number, logMessage?: string): boolean {
    const job = this.jobs.find((j) => j.id === id);
    if (!job || (job.status !== "RUNNING" && job.status !== "PAUSED")) return false;

    job.progress = Math.min(100, Math.max(0, Math.round(progress)));

    if (logMessage) {
      this.addLog(id, "INFO", logMessage);
    }

    this.saveToStorage();
    this.emitUpdate();

    athenaEventBus.emit("JOB_PROGRESS", { jobId: id, progress: job.progress });
    return true;
  }

  public saveCheckpoint(
    jobId: string,
    stepName: string,
    progress: number,
    snapshotData: Record<string, unknown> = {}
  ): JobCheckpoint | null {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return null;

    const checkpoint: JobCheckpoint = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      jobId,
      timestamp: new Date().toISOString(),
      stepName,
      progress,
      snapshotData,
    };

    job.checkpoints = [...(job.checkpoints || []), checkpoint];
    job.progress = progress;
    this.addLog(jobId, "INFO", `Checkpoint de segurança salvo: ${stepName} (${progress}%)`);

    this.saveToStorage();
    this.emitUpdate();
    return checkpoint;
  }

  public completeJob(id: string, result?: unknown): boolean {
    const job = this.jobs.find((j) => j.id === id);
    if (!job || job.status !== "RUNNING") return false;

    job.status = "COMPLETED";
    job.progress = 100;
    job.completedAt = new Date().toISOString();
    job.result = result;

    this.addLog(id, "INFO", "Execução concluída com sucesso (100%).");

    this.saveToStorage();
    this.emitUpdate();

    athenaEventBus.emit("JOB_COMPLETED", { jobId: id, title: job.title, result });

    notificationStore.add({
      type: "JOB_COMPLETED",
      title: `Job Concluído: ${job.title}`,
      message: `A tarefa em segundo plano "${job.title}" foi finalizada com êxito.`,
      severity: "SUCCESS",
      source: "ATHENA",
      targetPath: "/modules/labs",
    });

    return true;
  }

  public failJob(id: string, error: JobError | string): boolean {
    const job = this.jobs.find((j) => j.id === id);
    if (!job) return false;

    const formattedError: JobError =
      typeof error === "string"
        ? { code: "EXECUTION_ERROR", message: error, recoverable: true }
        : error;

    job.status = "FAILED";
    job.completedAt = new Date().toISOString();
    job.error = formattedError;

    this.addLog(id, "ERROR", `Execução falhou: ${formattedError.message}`, formattedError.details);

    this.saveToStorage();
    this.emitUpdate();

    athenaEventBus.emit("JOB_FAILED", { jobId: id, title: job.title, error: formattedError });

    notificationStore.add({
      type: "JOB_FAILED",
      title: `Falha na Execução: ${job.title}`,
      message: `Erro durante o processamento: ${formattedError.message}`,
      severity: "CRITICAL",
      source: "ATHENA",
      targetPath: "/modules/labs",
    });

    return true;
  }

  public cancelJob(id: string, reason = "Cancelado pelo usuário"): boolean {
    const job = this.jobs.find((j) => j.id === id);
    if (!job || job.status === "COMPLETED" || job.status === "CANCELLED") return false;

    job.status = "CANCELLED";
    job.completedAt = new Date().toISOString();
    this.addLog(id, "WARNING", `Execução cancelada: ${reason}`);

    this.saveToStorage();
    this.emitUpdate();

    athenaEventBus.emit("JOB_CANCELLED", { jobId: id, title: job.title, reason });
    return true;
  }

  public retryJob(id: string): Job | null {
    const job = this.jobs.find((j) => j.id === id);
    if (!job || (job.status !== "FAILED" && job.status !== "INTERRUPTED")) return null;

    job.retryCount = (job.retryCount || 0) + 1;
    job.status = "QUEUED";
    job.progress = 0;
    job.error = undefined;
    job.completedAt = undefined;

    this.addLog(id, "INFO", `Job reenfileirado para nova tentativa (Tentativa #${job.retryCount}).`);

    this.saveToStorage();
    this.emitUpdate();

    athenaEventBus.emit("JOB_QUEUED", { jobId: id, title: job.title, retryCount: job.retryCount });
    return JSON.parse(JSON.stringify(job));
  }

  public addLog(
    jobId: string,
    level: "DEBUG" | "INFO" | "WARNING" | "ERROR",
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return;

    const entry: JobLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
    };

    job.logs.push(entry);
    // Log retention: keep max 100 entries per job
    if (job.logs.length > 100) {
      job.logs = job.logs.slice(-100);
    }
  }

  private getSeedJobs(): Job[] {
    const now = new Date().toISOString();
    return [
      {
        id: "job-seed-01",
        type: "COMPILE_WASM",
        title: "Compilação do Vector Engine (Rust/WASM)",
        description: "Geração de bindings WASM locais para busca semântica offline",
        status: "COMPLETED",
        priority: "HIGH",
        progress: 100,
        createdAt: now,
        startedAt: now,
        completedAt: now,
        createdBy: "SYSTEM",
        logs: [
          { id: "l1", timestamp: now, level: "INFO", message: "wasm-pack build --target web iniciado" },
          { id: "l2", timestamp: now, level: "INFO", message: "Otimização via wasm-opt concluída (2.1 MB)" },
        ],
        retryCount: 0,
        checkpoints: [],
      },
    ];
  }
}

export const jobManager = new JobManager();
