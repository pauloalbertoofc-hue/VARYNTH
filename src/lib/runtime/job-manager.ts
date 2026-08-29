import { Job, JobType, JobStatus, JobActor, JobLogEntry } from "./types";
import { athenaEventBus } from "../athena/events/event-bus";
import { notificationService } from "../notifications/notification-service";

const STORAGE_KEY = "varynth_jobs_v4";
const JOBS_EVENT = "varynth_jobs_updated";

export class JobManager {
  private jobs: Job[] = [];

  constructor() {
    this.init();
    this.setupStorageListener();
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
      } catch {
        // ignore
      }
    }
    this.jobs = this.getSeedJobs();
    this.saveToStorage();
  }

  private saveToStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.jobs));
      } catch {
        // ignore
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

  public createJob(params: {
    type: JobType;
    title: string;
    createdBy?: JobActor;
    relatedArtifactId?: string;
    relatedProjectId?: string;
    metadata?: Record<string, unknown>;
  }): Job {
    const now = new Date().toISOString();
    const newJob: Job = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: params.type,
      title: params.title,
      status: "QUEUED",
      progress: 0,
      createdAt: now,
      logs: [
        {
          timestamp: now,
          level: "INFO",
          message: `Job enfileirado com sucesso: ${params.title}`,
        },
      ],
      retryCount: 0,
      createdBy: params.createdBy || "USER",
      relatedArtifactId: params.relatedArtifactId,
      relatedProjectId: params.relatedProjectId,
      metadata: params.metadata || {},
    };

    this.jobs.unshift(newJob);
    this.saveToStorage();
    this.emitUpdate();

    athenaEventBus.emit("JOB_QUEUED", { jobId: newJob.id, title: newJob.title, type: newJob.type });

    return JSON.parse(JSON.stringify(newJob));
  }

  public updateProgress(jobId: string, progress: number, logMessage?: string): boolean {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return false;

    job.progress = Math.min(100, Math.max(0, progress));
    if (job.status === "QUEUED") {
      job.status = "RUNNING";
      job.startedAt = new Date().toISOString();
    }

    if (logMessage) {
      job.logs.push({
        timestamp: new Date().toISOString(),
        level: "INFO",
        message: logMessage,
      });
    }

    this.saveToStorage();
    this.emitUpdate();

    athenaEventBus.emit("JOB_PROGRESS", {
      jobId: job.id,
      progress: job.progress,
      status: job.status,
    });

    return true;
  }

  public completeJob(jobId: string, result?: unknown, logMessage?: string): boolean {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return false;

    const now = new Date().toISOString();
    job.status = "COMPLETED";
    job.progress = 100;
    job.completedAt = now;
    job.result = result;

    job.logs.push({
      timestamp: now,
      level: "INFO",
      message: logMessage || "Job concluído com 100% de sucesso.",
    });

    this.saveToStorage();
    this.emitUpdate();

    athenaEventBus.emit("JOB_COMPLETED", { jobId: job.id, title: job.title, result });

    // Trigger persistent notification
    notificationService.create({
      type: "JOB_COMPLETED",
      title: "Processamento Concluído",
      message: `O job "${job.title}" finalizou com sucesso.`,
      severity: "SUCCESS",
      source: "SYSTEM",
      targetPath: "/modules/technical-archive",
    });

    return true;
  }

  public failJob(jobId: string, error: string): boolean {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return false;

    const now = new Date().toISOString();
    job.status = "FAILED";
    job.completedAt = now;
    job.error = error;

    job.logs.push({
      timestamp: now,
      level: "ERROR",
      message: `Falha na execução: ${error}`,
    });

    this.saveToStorage();
    this.emitUpdate();

    athenaEventBus.emit("JOB_FAILED", { jobId: job.id, title: job.title, error });

    notificationService.create({
      type: "JOB_FAILED",
      title: "Falha no Processamento",
      message: `O job "${job.title}" falhou: ${error}`,
      severity: "CRITICAL",
      source: "SYSTEM",
      targetPath: "/modules/technical-archive",
    });

    return true;
  }

  public cancelJob(jobId: string): boolean {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return false;

    if (job.status === "COMPLETED" || job.status === "FAILED") return false;

    const now = new Date().toISOString();
    job.status = "CANCELLED";
    job.completedAt = now;

    job.logs.push({
      timestamp: now,
      level: "WARN",
      message: "Job cancelado por solicitação do usuário.",
    });

    this.saveToStorage();
    this.emitUpdate();

    athenaEventBus.emit("JOB_CANCELLED", { jobId: job.id, title: job.title });

    return true;
  }

  public resetToSeed(): void {
    this.jobs = this.getSeedJobs();
    this.saveToStorage();
    this.emitUpdate();
  }

  private getSeedJobs(): Job[] {
    return [
      {
        id: "job-001",
        type: "COMPILE_WASM",
        title: "Compilação do Rust Vector Engine (WASM)",
        status: "COMPLETED",
        progress: 100,
        createdAt: "2026-08-29T15:00:00.000Z",
        startedAt: "2026-08-29T15:00:01.000Z",
        completedAt: "2026-08-29T15:00:04.200Z",
        createdBy: "ATHENA",
        relatedArtifactId: "art-code-001",
        logs: [
          { timestamp: "2026-08-29T15:00:01.000Z", level: "INFO", message: "wasm-pack build --target web --release" },
          { timestamp: "2026-08-29T15:00:03.000Z", level: "INFO", message: "Otimização LTO concluída (Tamanho final: 182 KB)" },
          { timestamp: "2026-08-29T15:00:04.200Z", level: "INFO", message: "Binário WASM gerado com sucesso." },
        ],
        retryCount: 0,
        result: { binarySizeKb: 182, exportsCount: 8 },
      },
      {
        id: "job-002",
        type: "CODE_TEST_SUITE",
        title: "Execução da Suíte Histórica de Regressão (73 casos)",
        status: "COMPLETED",
        progress: 100,
        createdAt: "2026-08-29T16:00:00.000Z",
        startedAt: "2026-08-29T16:00:01.000Z",
        completedAt: "2026-08-29T16:00:03.500Z",
        createdBy: "SYSTEM",
        logs: [
          { timestamp: "2026-08-29T16:00:01.000Z", level: "INFO", message: "Carregando 15 golden cases e 58 paráfrases..." },
          { timestamp: "2026-08-29T16:00:03.500Z", level: "INFO", message: "73/73 aprovados com 100% de integridade." },
        ],
        retryCount: 0,
        result: { passed: 73, failed: 0, score: "100%" },
      },
    ];
  }
}

export const jobManager = new JobManager();

