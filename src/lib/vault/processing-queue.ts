export type ProcessingJobStatus = "aguardando" | "processando" | "concluido" | "falhou" | "cancelado";
export type ProcessingJob = { id: string; title: string; type: "upload" | "ocr" | "indexacao" | "compilacao" | "exportacao"; status: ProcessingJobStatus; progress: number; createdAt: string; message?: string };
const KEY = "varynth_vault_processing_queue";
export function listProcessingJobs(): ProcessingJob[] { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
export function saveProcessingJobs(jobs: ProcessingJob[]) { localStorage.setItem(KEY, JSON.stringify(jobs.slice(0, 50))); }
export function addProcessingJob(job: Omit<ProcessingJob, "id" | "createdAt">) { const next = { ...job, id: `job-${Date.now()}`, createdAt: new Date().toISOString() }; saveProcessingJobs([next, ...listProcessingJobs()]); return next; }
