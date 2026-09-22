import { learningExclusionRepository } from "@/lib/persistence/repositories";
import type { LearningExclusion, LearningExclusionScope } from "./contracts";

const scoped = new Set<LearningExclusionScope>(["DOMAIN", "AGENT", "MODULE", "PROJECT", "ARTIFACT", "SESSION"]);

function exclusionId(scope: LearningExclusionScope, scopeId?: string) {
  return `learning-exclusion-${scope.toLowerCase()}-${encodeURIComponent(scopeId || "global")}`;
}

export class LearningExclusionService {
  async list() {
    return learningExclusionRepository.getAll();
  }

  async disable(scope: LearningExclusionScope, scopeId?: string, reason?: string): Promise<LearningExclusion> {
    if (scope === "GLOBAL" ? scopeId !== undefined : !scoped.has(scope) || !scopeId?.trim()) {
      throw new Error("[LEARNING_EXCLUSION_INVALID] escopo requer identificador válido.");
    }
    const id = exclusionId(scope, scopeId);
    const existing = await learningExclusionRepository.getById(id);
    const exclusion: LearningExclusion = {
      id, scope, scopeId, reason: reason?.trim().slice(0, 300),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    return learningExclusionRepository.save(exclusion);
  }

  async enable(scope: LearningExclusionScope, scopeId?: string): Promise<boolean> {
    return learningExclusionRepository.delete(exclusionId(scope, scopeId));
  }
}

export const learningExclusionService = new LearningExclusionService();
