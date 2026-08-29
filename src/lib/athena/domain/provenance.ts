export type ProvenanceSourceType =
  | "USER"
  | "MEMORY"
  | "VAULT"
  | "CODEX"
  | "RESEARCH"
  | "CHRONOS"
  | "TOOL"
  | "AGENT"
  | "MODEL_INFERENCE"
  | "SYSTEM";

export interface ProvenanceRecord {
  id: string;
  sourceType: ProvenanceSourceType;
  sourceId?: string;
  sourceTitle?: string;
  excerpt?: string;
  timestamp: string;
}
