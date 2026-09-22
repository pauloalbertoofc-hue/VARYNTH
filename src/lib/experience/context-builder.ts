import { preferenceService } from "./preference-service";
import { Preference } from "./contracts";

export interface ExperienceContextRequest {
  requester: string;
  domain?: string;
  agentId?: string;
  moduleId?: string;
  projectId?: string;
  artifactId?: string;
  sessionId?: string;
  currentInstruction?: unknown;
  budget?: number;
}

export interface ExperienceContext {
  preferences: Preference[];
  generatedAt: string;
  truncated: boolean;
}

export async function buildExperienceContext(request: ExperienceContextRequest): Promise<ExperienceContext> {
  const budget = Math.max(0, Math.min(request.budget ?? 12, 50));
  const preferences = await preferenceService.resolve(request);
  return { preferences: preferences.slice(0, budget), generatedAt: new Date().toISOString(), truncated: preferences.length > budget };
}
