import { experienceEventRepository, experienceRepository } from "@/lib/persistence/repositories";
import { ExperienceRecord, EvidenceRef, PreferenceScope } from "./contracts";
import { getExperienceOwnerId } from "./identity";

export interface OutcomeInput {
  domain: string;
  context: Record<string, unknown>;
  situation: string;
  action: string;
  outcome: string;
  evidence: EvidenceRef[];
  scope?: PreferenceScope;
  scopeId?: string;
  usefulness?: number;
  ownerId?: string;
}

export async function retainExperience(input: OutcomeInput): Promise<ExperienceRecord> {
  if (!input.situation.trim() || !input.action.trim() || !input.outcome.trim()) throw new Error("[EXPERIENCE_INVALID] situação, ação e resultado são obrigatórios.");
  if (!input.evidence.length) throw new Error("[EXPERIENCE_INVALID] experiência exige provenance.");
  const ownerId = await getExperienceOwnerId(input.ownerId);
  const evidenceIds = new Set(input.evidence.map((item) => item.eventId));
  const sourceEvents = await experienceEventRepository.getAll((event) => evidenceIds.has(event.id));
  if (sourceEvents.length !== evidenceIds.size || sourceEvents.some((event) => event.ownerId !== ownerId)) {
    throw new Error("[EXPERIENCE_EVIDENCE_INVALID] Todas as evidências devem existir e pertencer à mesma conta.");
  }
  const now = new Date().toISOString();
  const record: ExperienceRecord = {
    id: `experience-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ownerId,
    domain: input.domain, context: input.context, situation: input.situation.trim().slice(0, 500), action: input.action.trim().slice(0, 500), outcome: input.outcome.trim().slice(0, 500),
    usefulness: input.usefulness === undefined ? undefined : Math.max(0, Math.min(1, input.usefulness)), confidence: Math.min(1, input.evidence.length / 2), evidence: input.evidence,
    scope: input.scope || "PROJECT", scopeId: input.scopeId, createdAt: now,
  };
  return experienceRepository.save(record);
}

export interface ExperienceAudience { ownerId?: string; agentId?: string; moduleId?: string; artifactId?: string; sessionId?: string; }

export async function retrieveExperiences(domain?: string, projectId?: string, limit = 8, audience: ExperienceAudience = {}): Promise<ExperienceRecord[]> {
  const ownerId = await getExperienceOwnerId(audience.ownerId);
  const records = await experienceRepository.getAll((record) => record.ownerId === ownerId && (!domain || record.domain === domain));
  return records.filter((record) => {
    if (record.scope === "GLOBAL") return true;
    if (record.scope === "DOMAIN") return !!domain && record.scopeId === domain;
    if (record.scope === "AGENT") return !!audience.agentId && record.scopeId === audience.agentId;
    if (record.scope === "MODULE") return !!audience.moduleId && record.scopeId === audience.moduleId;
    if (record.scope === "PROJECT") return !!projectId && record.scopeId === projectId;
    if (record.scope === "ARTIFACT") return !!audience.artifactId && record.scopeId === audience.artifactId;
    return !!audience.sessionId && record.scopeId === audience.sessionId;
  }).sort((a, b) => (b.usefulness || 0) - (a.usefulness || 0) || b.confidence - a.confidence).slice(0, Math.max(0, Math.min(limit, 50)));
}
