import { experienceEventRepository, experiencePreferenceRepository } from "@/lib/persistence/repositories";
import { EvidenceRef, Preference, PreferenceCandidate, PreferenceScope, PreferenceStatus } from "./contracts";
import { confidenceFromEvidence } from "./signals";
import { getExperienceOwnerId } from "./identity";
import { experienceService } from "./experience-service";
import { domainRegistry } from "@/lib/knowledge/domain-registry";

const scopeRank: Record<PreferenceScope, number> = { GLOBAL: 1, DOMAIN: 2, AGENT: 3, MODULE: 3, PROJECT: 4, ARTIFACT: 5, SESSION: 6 };

function idFor(candidate: PreferenceCandidate, ownerId: string): string {
  return ["preference", ownerId, candidate.scope.toLowerCase(), candidate.scopeId || "global", candidate.domain, candidate.key].map(encodeURIComponent).join(":");
}

export class PreferenceService {
  async declare(input: { domain: string; key: string; value: unknown; scope: Extract<PreferenceScope, "GLOBAL" | "DOMAIN">; scopeId?: string }, requestedOwnerId?: string): Promise<Preference> {
    const ownerId = await getExperienceOwnerId(requestedOwnerId);
    const domain = input.domain.trim().toLowerCase();
    const key = input.key.trim();
    const scopeId = input.scope === "DOMAIN" ? (input.scopeId?.trim() || domain) : undefined;
    if (!/^[a-z][a-z0-9_.-]{1,63}$/.test(domain) || !/^[a-z][a-zA-Z0-9_.-]{1,63}$/.test(key) || input.value === undefined || (input.scope === "DOMAIN" && !scopeId)) {
      throw new Error("[PREFERENCE_INVALID] Domínio, chave, valor ou escopo inválido.");
    }
    const candidate: PreferenceCandidate = { subject: ownerId, domain, key, value: input.value, scope: input.scope, scopeId, evidence: [], proposedAt: new Date().toISOString() };
    const id = idFor(candidate, ownerId);
    const stored = await experiencePreferenceRepository.getById(id);
    if (stored && stored.ownerId !== ownerId) throw new Error("[PREFERENCE_OWNER_MISMATCH] O identificador pertence a outra conta.");
    const event = await experienceService.record({
      ownerId, actor: "USER", actionType: "PREFERENCE_CONFIRMED", domain, metadata: { preferenceKey: key, preferenceValue: input.value, preferenceScope: input.scope, preferenceScopeId: scopeId },
      source: "experience-manual-preference", privacyScope: "USER_SHARED", learningEligible: false,
    });
    const now = new Date().toISOString();
    const preference: Preference = {
      id, ownerId, subject: ownerId, domain, key, value: input.value, scope: input.scope, scopeId,
      confidence: 1, status: "CONFIRMED", source: "MANUAL",
      evidence: [...(stored?.evidence || []).filter((item) => item.eventId !== event.id), { eventId: event.id, weight: "VERY_HIGH", reason: "Preferência declarada diretamente pelo usuário." }],
      createdAt: stored?.createdAt || now, updatedAt: now, lastObservedAt: now,
    };
    return experiencePreferenceRepository.save(preference);
  }

  async propose(candidate: PreferenceCandidate, requestedOwnerId?: string): Promise<Preference> {
    if (!candidate.evidence.length) throw new Error("[PREFERENCE_INVALID] Preferência inferida exige evidência.");
    const ownerId = await getExperienceOwnerId(requestedOwnerId);
    if (typeof window !== "undefined" && candidate.subject !== ownerId) throw new Error("[PREFERENCE_OWNER_MISMATCH] A hipótese precisa pertencer à conta autenticada.");
    const evidenceEventIds = new Set(candidate.evidence.map((item) => item.eventId));
    const sourceEvents = await experienceEventRepository.getAll((event) => evidenceEventIds.has(event.id));
    if (sourceEvents.length !== evidenceEventIds.size || sourceEvents.some((event) => event.ownerId !== ownerId)) {
      throw new Error("[PREFERENCE_EVIDENCE_INVALID] Todas as evidências devem existir e pertencer à mesma conta.");
    }
    const now = new Date().toISOString();
    const id = idFor(candidate, ownerId);
    const stored = await experiencePreferenceRepository.getById(id);
    const existing = stored?.ownerId === ownerId ? stored : null;
    const evidence = [...(existing?.evidence || []), ...candidate.evidence].filter((item, index, all) => all.findIndex((other) => other.eventId === item.eventId) === index);
    const conflictingValue = existing && JSON.stringify(existing.value) !== JSON.stringify(candidate.value);
    const preference: Preference = {
      id, ownerId, subject: candidate.subject, domain: candidate.domain, key: candidate.key, value: candidate.value,
      scope: candidate.scope, scopeId: candidate.scopeId, confidence: confidenceFromEvidence(evidence),
      status: conflictingValue ? "CONTESTED" : existing?.status === "CONFIRMED" ? "CONFIRMED" : "INFERRED", evidence, source: existing?.source === "MANUAL" ? "MANUAL" : "INFERRED",
      createdAt: existing?.createdAt || now, updatedAt: now, lastObservedAt: now,
    };
    return experiencePreferenceRepository.save(preference);
  }

  async setStatus(id: string, status: Extract<PreferenceStatus, "CONFIRMED" | "REJECTED" | "CONTESTED" | "DEPRECATED">, value?: unknown, requestedOwnerId?: string): Promise<Preference> {
    const ownerId = await getExperienceOwnerId(requestedOwnerId);
    const current = await experiencePreferenceRepository.getById(id);
    if (!current || current.ownerId !== ownerId) throw new Error("[PREFERENCE_NOT_FOUND] Preferência inexistente.");
    const updated = { ...current, status, value: value === undefined ? current.value : value, source: status === "CONFIRMED" ? "MANUAL" as const : current.source, updatedAt: new Date().toISOString() };
    return experiencePreferenceRepository.save(updated);
  }

  async applyDecay(now = new Date(), halfLifeDays = 30): Promise<number> {
    const ownerId = await getExperienceOwnerId();
    if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) throw new Error("[PREFERENCE_INVALID] half-life inválida.");
    const inferred = await experiencePreferenceRepository.getAll((preference) => preference.ownerId === ownerId && preference.status === "INFERRED");
    let changed = 0;
    for (const preference of inferred) {
      const observedAt = preference.lastObservedAt || preference.updatedAt;
      const ageDays = Math.max(0, (now.getTime() - Date.parse(observedAt)) / 86_400_000);
      const confidence = Math.max(0, Math.round(preference.confidence * Math.pow(0.5, ageDays / halfLifeDays) * 100) / 100);
      if (confidence !== preference.confidence) {
        await experiencePreferenceRepository.save({ ...preference, confidence, updatedAt: now.toISOString() });
        changed += 1;
      }
    }
    return changed;
  }

  async forget(id: string, requestedOwnerId?: string): Promise<boolean> {
    if (!id.trim()) return false;
    const ownerId = await getExperienceOwnerId(requestedOwnerId);
    const current = await experiencePreferenceRepository.getById(id);
    if (!current || current.ownerId !== ownerId) return false;
    return experiencePreferenceRepository.delete(id);
  }

  async exportAll(requestedOwnerId?: string): Promise<Preference[]> {
    const ownerId = await getExperienceOwnerId(requestedOwnerId);
    return experiencePreferenceRepository.getAll((preference) => preference.ownerId === ownerId);
  }

  async resolve(input: { ownerId?: string; domain?: string; agentId?: string; moduleId?: string; projectId?: string; artifactId?: string; sessionId?: string; key?: string; currentInstruction?: unknown }): Promise<Preference[]> {
    if (input.currentInstruction !== undefined) return [];
    const ownerId = await getExperienceOwnerId(input.ownerId);
    const all = await experiencePreferenceRepository.getAll((preference) => preference.ownerId === ownerId && (preference.status === "CONFIRMED" || preference.status === "INFERRED"));
    return all.filter((preference) => {
      if (input.key && preference.key !== input.key) return false;
      if (preference.scope === "GLOBAL") return true;
      if (preference.scope === "DOMAIN") return !!input.domain && domainRegistry.isWithinDomain(input.domain, preference.scopeId || preference.domain);
      if (preference.scope === "AGENT") return !!input.agentId && preference.scopeId === input.agentId;
      if (preference.scope === "MODULE") return !!input.moduleId && preference.scopeId === input.moduleId;
      if (preference.scope === "PROJECT") return !!input.projectId && preference.scopeId === input.projectId;
      if (preference.scope === "ARTIFACT") return !!input.artifactId && preference.scopeId === input.artifactId;
      return !!input.sessionId && preference.scopeId === input.sessionId;
    }).sort((a, b) => scopeRank[b.scope] - scopeRank[a.scope] || b.confidence - a.confidence);
  }
}

export const preferenceService = new PreferenceService();
