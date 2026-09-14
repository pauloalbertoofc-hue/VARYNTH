export type ProcessingJobStatus = "aguardando" | "processando" | "concluido" | "falhou" | "cancelado";
export type ProcessingJob = { id: string; title: string; type: "upload" | "ocr" | "indexacao" | "compilacao" | "exportacao"; status: ProcessingJobStatus; progress: number; createdAt: string; message?: string };
const KEY = "varynth_vault_processing_queue";
export function listProcessingJobs(): ProcessingJob[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "[]") as ProcessingJob[];
    const seenActive = new Set<string>();
    const jobs = stored.filter((job) => {
      if (["concluido", "cancelado"].includes(job.status)) return true;
      const key = `${job.type}:${job.title.toLocaleLowerCase()}`;
      if (seenActive.has(key)) return false;
      seenActive.add(key);
      return true;
    });
    if (jobs.length !== stored.length) saveProcessingJobs(jobs);
    return jobs;
  } catch {
    return [];
  }
}
export function saveProcessingJobs(jobs: ProcessingJob[]) { localStorage.setItem(KEY, JSON.stringify(jobs.slice(0, 50))); }
export function addProcessingJob(job: Omit<ProcessingJob, "id" | "createdAt">) {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? `job-${crypto.randomUUID()}` : `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const next = { ...job, id, createdAt: new Date().toISOString() };
  saveProcessingJobs([next, ...listProcessingJobs()]);
  return next;
}
export function updateProcessingJob(id: string, update: Partial<ProcessingJob>) { const jobs = listProcessingJobs().map((job) => job.id === id ? { ...job, ...update } : job); saveProcessingJobs(jobs); return jobs; }
