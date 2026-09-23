import { learningExclusionRepository } from "@/lib/persistence/repositories";
import type { LearningExclusion, LearningExclusionScope } from "./contracts";
import { getExperienceOwnerId } from "./identity";

const scoped = new Set<LearningExclusionScope>(["DOMAIN", "AGENT", "MODULE", "PROJECT", "ARTIFACT", "SESSION"]);

function exclusionId(ownerId: string, scope: LearningExclusionScope, scopeId?: string) {
  return `learning-exclusion-${encodeURIComponent(ownerId)}-${scope.toLowerCase()}-${encodeURIComponent(scopeId || "global")}`;
}

export class LearningExclusionService {
  async list(requestedOwnerId?: string) {
    const ownerId = await getExperienceOwnerId(requestedOwnerId);
    return learningExclusionRepository.getAll((item) => item.ownerId === ownerId || !item.ownerId);
  }

  async disable(scope: LearningExclusionScope, scopeId?: string, reason?: string, requestedOwnerId?: string): Promise<LearningExclusion> {
    if (scope === "GLOBAL" ? scopeId !== undefined : !scoped.has(scope) || !scopeId?.trim()) {
      throw new Error("[LEARNING_EXCLUSION_INVALID] escopo requer identificador válido.");
    }
    const ownerId = await getExperienceOwnerId(requestedOwnerId);
    const id = exclusionId(ownerId, scope, scopeId);
    const existing = await learningExclusionRepository.getById(id);
    const exclusion: LearningExclusion = {
      id, ownerId, scope, scopeId, reason: reason?.trim().slice(0, 300),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    return learningExclusionRepository.save(exclusion);
  }

  async enable(scope: LearningExclusionScope, scopeId?: string, requestedOwnerId?: string): Promise<boolean> {
    const ownerId = await getExperienceOwnerId(requestedOwnerId);
    return learningExclusionRepository.delete(exclusionId(ownerId, scope, scopeId));
  }
}

export const learningExclusionService = new LearningExclusionService();
