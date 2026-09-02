import type { ActionType } from "./action";
import type { AthenaTask, TaskType } from "./task";
import type { AthenaContext } from "./context";

export type ExecutableCapabilityKind = "AGENT" | "TOOL";
export type CapabilitySelectionStatus = "SELECTED" | "NO_MATCH" | "AMBIGUOUS";
export type CapabilityCost = "LOW" | "MEDIUM" | "HIGH";
export type CapabilityAuthority = "READ_ONLY" | "PROPOSE" | "MUTATE_GOVERNED";

export interface ExecutableCapabilityManifest {
  id: string;
  kind: ExecutableCapabilityKind;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  cost: CapabilityCost;
  authority: CapabilityAuthority;
  domains: string[];
  skills: string[];
  taskTypes: TaskType[];
  actionType?: ActionType;
  mutatesData: boolean;
  requiresConfirmation: boolean;
  supportsUndo: boolean;
  requiredInputs: string[];
}

export interface CapabilityCandidateDiagnostic {
  capabilityId: string;
  kind: ExecutableCapabilityKind;
  score: number;
  eligible: boolean;
  reasons: string[];
  rejectionReason?: string;
}

export interface CapabilitySelectionResult {
  status: CapabilitySelectionStatus;
  selected?: ExecutableCapabilityManifest;
  candidates: CapabilityCandidateDiagnostic[];
  reason: string;
  clarificationPrompt?: string;
}

export interface AgentCapabilitySelectionRequest {
  kind: "AGENT";
  task: AthenaTask;
  context: AthenaContext;
  preferredCapabilityId?: string;
}

export interface ToolCapabilitySelectionRequest {
  kind: "TOOL";
  actionType: ActionType;
}

export type CapabilitySelectionRequest = AgentCapabilitySelectionRequest | ToolCapabilitySelectionRequest;
