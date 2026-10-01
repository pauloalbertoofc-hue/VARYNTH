import { preferenceService } from "./preference-service";
import { Preference } from "./contracts";
import { retrieveExperiences } from "./outcome-service";
import { getExperienceOwnerId } from "./identity";

export interface ExperienceContextRequest {
  requester: string;
  ownerId?: string;
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
  experiences: Awaited<ReturnType<typeof retrieveExperiences>>;
  instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION";
  generatedAt: string;
  truncated: boolean;
}

export async function buildExperienceContext(request: ExperienceContextRequest): Promise<ExperienceContext> {
  const budget = Math.max(0, Math.min(request.budget ?? 12, 50));
  // The current instruction is a precedence rule for the consuming agent, not
  // a reason to erase unrelated preferences from the context. Callers receive
  // both and must let explicit instructions win when they conflict.
  const { currentInstruction: _currentInstruction, ...retrievalRequest } = request;
  const ownerId = await getExperienceOwnerId(request.ownerId);
  const preferences = (await preferenceService.resolve({ ...retrievalRequest, ownerId })).filter((preference) =>
    preference.scope !== "GLOBAL" || (preference.status === "CONFIRMED" && preference.source === "MANUAL")
  );
  const experiences = await retrieveExperiences(request.domain, request.projectId, 50, { ownerId, agentId: request.agentId, moduleId: request.moduleId, artifactId: request.artifactId, sessionId: request.sessionId });
  const preferenceQuota = Math.ceil(budget / 2);
  const experienceQuota = budget - preferenceQuota;
  const selectedPreferences = preferences.slice(0, preferenceQuota);
  const selectedExperiences = experiences.slice(0, experienceQuota);
  let remaining = budget - selectedPreferences.length - selectedExperiences.length;
  const additionalPreferences = preferences.slice(selectedPreferences.length, selectedPreferences.length + remaining);
  remaining -= additionalPreferences.length;
  const additionalExperiences = experiences.slice(selectedExperiences.length, selectedExperiences.length + remaining);
  const boundedPreferences = [...selectedPreferences, ...additionalPreferences];
  const boundedExperiences = [...selectedExperiences, ...additionalExperiences];
  return { preferences: boundedPreferences, experiences: boundedExperiences, instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION", generatedAt: new Date().toISOString(), truncated: preferences.length > boundedPreferences.length || experiences.length > boundedExperiences.length };
}
