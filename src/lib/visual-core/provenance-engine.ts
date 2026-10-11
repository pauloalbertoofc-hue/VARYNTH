import type { VisualProvenanceEntry } from "./contracts";

export function validateProvenance(entries: VisualProvenanceEntry[]): { valid: boolean; error?: string } {
  const ids = new Set<string>();
  let previousTime = "";
  for (const entry of entries) {
    if (!entry.id || ids.has(entry.id)) return { valid: false, error: "DUPLICATE_PROVENANCE_ID" };
    if (!entry.createdAt || Number.isNaN(Date.parse(entry.createdAt))) return { valid: false, error: "INVALID_PROVENANCE_TIMESTAMP" };
    if (previousTime && entry.createdAt < previousTime) return { valid: false, error: "PROVENANCE_OUT_OF_ORDER" };
    ids.add(entry.id);
    previousTime = entry.createdAt;
  }
  return { valid: true };
}

export function provenanceSummary(entries: VisualProvenanceEntry[]): { total: number; generated: number; actors: string[] } {
  return { total: entries.length, generated: entries.filter((entry) => entry.generated === true).length, actors: [...new Set(entries.map((entry) => entry.actor))] };
}

