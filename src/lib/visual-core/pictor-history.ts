export interface PictorConsultation {
  id: string;
  prompt: string;
  response: string;
  captureId?: string;
  createdAt: string;
}

export const PICTOR_HISTORY_LIMIT = 20;

export function normalizePictorHistory(value: unknown): PictorConsultation[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PictorConsultation => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<PictorConsultation>;
    return typeof candidate.id === "string" && typeof candidate.prompt === "string" && typeof candidate.response === "string" && typeof candidate.createdAt === "string" && (candidate.captureId === undefined || typeof candidate.captureId === "string");
  }).slice(0, PICTOR_HISTORY_LIMIT);
}

export function appendPictorConsultation(history: PictorConsultation[], entry: PictorConsultation): PictorConsultation[] {
  return [entry, ...normalizePictorHistory(history)].slice(0, PICTOR_HISTORY_LIMIT);
}

export function parsePictorHistory(raw: string | null): PictorConsultation[] {
  if (!raw) return [];
  try { return normalizePictorHistory(JSON.parse(raw)); } catch { return []; }
}

