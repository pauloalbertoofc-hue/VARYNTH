import { experiencePreferenceRepository } from "@/lib/persistence/repositories";
import { EvidenceRef, Preference, PreferenceCandidate, PreferenceScope, PreferenceStatus } from "./contracts";
import { confidenceFromEvidence } from "./signals";

const scopeRank: Record<PreferenceScope, number> = { GLOBAL: 1, DOMAIN: 2, AGENT: 3, MODULE: 3, PROJECT: 4, ARTIFACT: 5, SESSION: 6 };

function idFor(candidate: PreferenceCandidate): string {
  return `preference-${candidate.scope.toLowerCase()}-${candidate.scopeId || "global"}-${candidate.domain}-${candidate.key}`.replace(/[^a-z0-9-]/gi, "-");
}

export class PreferenceService {
  async propose(candidate: PreferenceCandidate): Promise<Preference> {
    if (!candidate.evidence.length) throw new Error("[PREFERENCE_INVALID] Preferência inferida exige evidência.");
    const now = new Date().toISOString();
    const existing = await experiencePreferenceRepository.getById(idFor(candidate));
    const evidence = [...(existing?.evidence || []), ...candidate.evidence].filter((item, index, all) => all.findIndex((other) => other.eventId === item.eventId) === index);
    const preference: Preference = {
      id: idFor(candidate), subject: candidate.subject, domain: candidate.domain, key: candidate.key, value: candidate.value,
      scope: candidate.scope, scopeId: candidate.scopeId, confidence: confidenceFromEvidence(evidence),
      status: existing?.status === "CONFIRMED" ? "CONFIRMED" : "INFERRED", evidence, source: existing?.source === "MANUAL" ? "MANUAL" : "INFERRED",
      createdAt: existing?.createdAt || now, updatedAt: now, lastObservedAt: now,
    };
    return experiencePreferenceRepository.save(preference);
  }

  async setStatus(id: string, status: Extract<PreferenceStatus, "CONFIRMED" | "REJECTED" | "CONTESTED" | "DEPRECATED">, value?: unknown): Promise<Preference> {
    const current = await experiencePreferenceRepository.getById(id);
    if (!current) throw new Error("[PREFERENCE_NOT_FOUND] Preferência inexistente.");
    const updated = { ...current, status, value: value === undefined ? current.value : value, source: status === "CONFIRMED" ? "MANUAL" as const : current.source, updatedAt: new Date().toISOString() };
    return experiencePreferenceRepository.save(updated);
  }

  async resolve(input: { domain?: string; agentId?: string; moduleId?: string; projectId?: string; artifactId?: string; sessionId?: string; key?: string; currentInstruction?: unknown }): Promise<Preference[]> {
    if (input.currentInstruction !== undefined) return [];
    const all = await experiencePreferenceRepository.getAll((preference) => preference.status === "CONFIRMED" || preference.status === "INFERRED");
    return all.filter((preference) => {
      if (input.key && preference.key !== input.key) return false;
      if (preference.scope === "GLOBAL") return true;
      if (preference.scope === "DOMAIN") return !!input.domain && preference.scopeId === input.domain;
      if (preference.scope === "AGENT") return !!input.agentId && preference.scopeId === input.agentId;
      if (preference.scope === "MODULE") return !!input.moduleId && preference.scopeId === input.moduleId;
      if (preference.scope === "PROJECT") return !!input.projectId && preference.scopeId === input.projectId;
      if (preference.scope === "ARTIFACT") return !!input.artifactId && preference.scopeId === input.artifactId;
      return !!input.sessionId && preference.scopeId === input.sessionId;
    }).sort((a, b) => scopeRank[b.scope] - scopeRank[a.scope] || b.confidence - a.confidence);
  }
}

export const preferenceService = new PreferenceService();
