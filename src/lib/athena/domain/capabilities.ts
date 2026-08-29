export type CapabilitySource = "core" | "tool" | "agent" | "local-model" | "external";

export interface AthenaCapability {
  id: string;
  name: string;
  description: string;
  available: boolean;
  source: CapabilitySource;
  reason?: string;
  requiresNetwork: boolean;
}

export type StandardCapabilityId =
  | "TASK_CREATION"
  | "NOTE_CAPTURE"
  | "CHRONOS_DEADLINE_SYNC"
  | "VAULT_LOCAL_SEARCH"
  | "CODEX_ARGUMENT_ANALYSIS"
  | "RESEARCH_EVIDENCE_BOARD"
  | "SAFE_TRASH_PROTOCOL"
  | "GLOBAL_UNDO_MANAGEMENT"
  | "AUDIT_TRAIL_OBSERVABILITY"
  | "COUNCIL_DELIBERATION_ENGINE"
  | "REFLECTION_VALIDATION_ENGINE"
  | "LOCAL_MODEL_INFERENCE"
  | "EXTERNAL_MODEL_INFERENCE"
  | "WEB_LIVE_SEARCH";

