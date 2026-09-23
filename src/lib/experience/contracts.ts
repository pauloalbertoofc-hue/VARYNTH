export const EXPERIENCE_EVENT_TYPES = [
  "USER_ACTION", "AGENT_ACTION", "AGENT_PROPOSAL", "PROPOSAL_ACCEPTED", "PROPOSAL_REJECTED",
  "PROPOSAL_MODIFIED", "IMMEDIATE_UNDO", "DELAYED_UNDO", "REDO", "MANUAL_EDIT",
  "PROJECT_CREATED", "PROJECT_COMPLETED", "VERSION_CREATED", "EXPORT_CREATED", "FEEDBACK_SUBMITTED",
  "PREFERENCE_CONFIRMED", "PREFERENCE_CORRECTED", "PREFERENCE_REJECTED", "OUTCOME_RECORDED",
] as const;
export type ExperienceEventType = typeof EXPERIENCE_EVENT_TYPES[number];

export const EXPERIENCE_SCOPES = ["USER_SHARED", "AGENT_PRIVATE", "PROJECT_SHARED", "MODULE_SHARED", "SYSTEM_SHARED"] as const;
export type ExperiencePrivacyScope = typeof EXPERIENCE_SCOPES[number];

export interface ExperienceEvent {
  id: string;
  ownerId?: string;
  timestamp: string;
  actor: "USER" | "AGENT" | "SYSTEM";
  agentId?: string;
  moduleId?: string;
  domain?: string;
  projectId?: string;
  sessionId?: string;
  artifactId?: string;
  actionType: ExperienceEventType;
  targetType?: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
  metadata: Record<string, unknown>;
  source: string;
  privacyScope: ExperiencePrivacyScope;
  learningEligible: boolean;
  correlationId?: string;
  causationId?: string;
  schemaVersion: 1;
}

export interface EvidenceRef {
  eventId: string;
  weight: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW";
  reason: string;
}

export type PreferenceStatus = "INFERRED" | "CONFIRMED" | "CONTESTED" | "REJECTED" | "DEPRECATED";
export type PreferenceScope = "GLOBAL" | "DOMAIN" | "AGENT" | "MODULE" | "PROJECT" | "ARTIFACT" | "SESSION";

export type LearningExclusionScope = "GLOBAL" | "DOMAIN" | "AGENT" | "MODULE" | "PROJECT" | "ARTIFACT" | "SESSION";

export interface LearningExclusion {
  id: string;
  ownerId?: string;
  scope: LearningExclusionScope;
  scopeId?: string;
  reason?: string;
  createdAt: string;
}

export interface Preference {
  id: string;
  ownerId?: string;
  subject: string;
  domain: string;
  key: string;
  value: unknown;
  scope: PreferenceScope;
  scopeId?: string;
  confidence: number;
  status: PreferenceStatus;
  evidence: EvidenceRef[];
  source: "MANUAL" | "INFERRED";
  createdAt: string;
  updatedAt: string;
  lastObservedAt?: string;
}

export interface PreferenceCandidate {
  subject: string;
  domain: string;
  key: string;
  value: unknown;
  scope: PreferenceScope;
  scopeId?: string;
  evidence: EvidenceRef[];
  proposedAt: string;
}

export type FeedbackType = "LIKE" | "DISLIKE" | "ACCEPT" | "REJECT" | "RATING" | "PREFER_A" | "PREFER_B" | "CORRECTION" | "COMMENT" | "CONFIRM_PREFERENCE" | "REJECT_PREFERENCE";

export interface FeedbackInput {
  type: FeedbackType;
  targetType: string;
  targetId: string;
  context?: Record<string, unknown>;
  reason?: string;
  strength?: "LOW" | "MEDIUM" | "HIGH";
  projectId?: string;
  moduleId?: string;
  agentId?: string;
  sessionId?: string;
}

export interface ExperienceRecord {
  id: string;
  ownerId?: string;
  domain: string;
  context: Record<string, unknown>;
  situation: string;
  action: string;
  outcome: string;
  usefulness?: number;
  confidence: number;
  evidence: EvidenceRef[];
  scope: PreferenceScope;
  scopeId?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface ExperienceEventInput extends Omit<ExperienceEvent, "id" | "timestamp" | "schemaVersion"> {
  id?: string;
  timestamp?: string;
}

export function validateExperienceEvent(value: unknown): ExperienceEvent {
  if (!value || typeof value !== "object") throw new Error("[EXPERIENCE_EVENT_INVALID] Evento ausente.");
  const event = value as Partial<ExperienceEvent>;
  if (typeof event.id !== "string" || !event.id.trim()) throw new Error("[EXPERIENCE_EVENT_INVALID] id obrigatório.");
  if (!EXPERIENCE_EVENT_TYPES.includes(event.actionType as ExperienceEventType)) throw new Error("[EXPERIENCE_EVENT_INVALID] actionType desconhecido.");
  if (!EXPERIENCE_SCOPES.includes(event.privacyScope as ExperiencePrivacyScope)) throw new Error("[EXPERIENCE_EVENT_INVALID] privacyScope desconhecido.");
  if (!(event.actor === "USER" || event.actor === "AGENT" || event.actor === "SYSTEM")) throw new Error("[EXPERIENCE_EVENT_INVALID] actor desconhecido.");
  if (typeof event.timestamp !== "string" || Number.isNaN(Date.parse(event.timestamp))) throw new Error("[EXPERIENCE_EVENT_INVALID] timestamp inválido.");
  if (typeof event.source !== "string" || !event.source.trim()) throw new Error("[EXPERIENCE_EVENT_INVALID] source obrigatório.");
  if (event.schemaVersion !== 1 || typeof event.learningEligible !== "boolean" || !event.metadata || typeof event.metadata !== "object") throw new Error("[EXPERIENCE_EVENT_INVALID] contrato incompleto.");
  if (event.actor === "AGENT" && event.learningEligible) throw new Error("[EXPERIENCE_EVENT_INVALID] eventos de agente não podem aprender por padrão.");
  return event as ExperienceEvent;
}
