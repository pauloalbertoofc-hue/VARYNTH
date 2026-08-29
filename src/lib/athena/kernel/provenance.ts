import { ProvenanceRecord, ProvenanceSourceType } from "../domain/provenance";

export class ProvenanceTracker {
  private records: ProvenanceRecord[] = [];

  record(
    sourceType: ProvenanceSourceType,
    sourceTitle?: string,
    sourceId?: string,
    excerpt?: string
  ): ProvenanceRecord {
    const item: ProvenanceRecord = {
      id: "prov-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      sourceType,
      sourceId,
      sourceTitle,
      excerpt,
      timestamp: new Date().toISOString(),
    };
    this.records.push(item);
    return item;
  }

  getRecentProvenance(limit = 10): ProvenanceRecord[] {
    return this.records.slice(-limit);
  }

  clear(): void {
    this.records = [];
  }
}

export const provenanceTracker = new ProvenanceTracker();

