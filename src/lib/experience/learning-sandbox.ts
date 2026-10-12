import type { ExperienceEvent, ExperienceEventType } from "./contracts";
import { derivePreferenceCandidates } from "./preference-candidate-service";
import { extractSignal } from "./signals";

export interface LearningSandboxObservation {
  domain: string;
  key: string;
  value: string | number | boolean;
  artifactId: string;
  correlationId?: string;
  actor?: ExperienceEvent["actor"];
  learningEligible?: boolean;
  generatedAutomatically?: boolean;
  actionType?: Extract<ExperienceEventType, "MANUAL_EDIT" | "PROPOSAL_ACCEPTED" | "PROPOSAL_REJECTED" | "PREFERENCE_CONFIRMED" | "PREFERENCE_REJECTED" | "FEEDBACK_SUBMITTED">;
  feedbackType?: "LIKE" | "DISLIKE" | "ACCEPT" | "REJECT" | "CORRECTION" | "CONFIRM_PREFERENCE" | "REJECT_PREFERENCE";
}

export interface LearningSandboxResult {
  events: ExperienceEvent[];
  signals: NonNullable<ReturnType<typeof extractSignal>>[];
  candidates: ReturnType<typeof derivePreferenceCandidates>;
  persistentWrites: 0;
}

const SYNTHETIC_OWNER = "experience-sandbox-only";
const MAX_OBSERVATIONS = 20;
const SAFE_IDENTIFIER = /^[\p{L}\p{N}][\p{L}\p{N}_.:-]{0,79}$/u;

/**
 * Runs the production signal and candidate rules over explicitly synthetic,
 * in-memory events. This function intentionally has no persistence dependency.
 */
export function simulateLearningPipeline(observations: LearningSandboxObservation[]): LearningSandboxResult {
  if (!Array.isArray(observations) || observations.length > MAX_OBSERVATIONS) {
    throw new Error(`[EXPERIENCE_SANDBOX_INVALID] Use entre 0 e ${MAX_OBSERVATIONS} observações sintéticas.`);
  }

  const events = observations.map((observation, index): ExperienceEvent => {
    if (!observation || typeof observation !== "object") throw new Error("[EXPERIENCE_SANDBOX_INVALID] Observação inválida.");
    if (!SAFE_IDENTIFIER.test(observation.domain) || !SAFE_IDENTIFIER.test(observation.key) || !SAFE_IDENTIFIER.test(observation.artifactId)) {
      throw new Error("[EXPERIENCE_SANDBOX_INVALID] Domínio, chave e artefato devem ser identificadores curtos, sem texto pessoal.");
    }
    if (!(typeof observation.value === "string" || typeof observation.value === "number" || typeof observation.value === "boolean")
      || (typeof observation.value === "number" && !Number.isFinite(observation.value))
      || (typeof observation.value === "string" && (!observation.value.trim() || observation.value.length > 120))) {
      throw new Error("[EXPERIENCE_SANDBOX_INVALID] O valor deve ser uma escolha escalar curta e válida.");
    }
    if (observation.correlationId !== undefined && !SAFE_IDENTIFIER.test(observation.correlationId)) {
      throw new Error("[EXPERIENCE_SANDBOX_INVALID] correlationId inválido.");
    }
    const actor = observation.actor ?? "USER";
    const learningEligible = observation.learningEligible ?? actor === "USER";
    const actionType: ExperienceEventType = observation.actionType ?? "MANUAL_EDIT";
    return {
      id: `sandbox-event-${index + 1}`,
      ownerId: SYNTHETIC_OWNER,
      timestamp: new Date(0).toISOString(),
      actor,
      domain: observation.domain,
      moduleId: observation.domain,
      artifactId: observation.artifactId,
      actionType,
      metadata: {
        preferenceSignal: { key: observation.key, value: observation.value },
        generatedAutomatically: observation.generatedAutomatically === true,
        simulationOnly: true,
        ...(observation.feedbackType ? { feedbackType: observation.feedbackType } : {}),
      },
      source: "experience-learning-sandbox",
      privacyScope: "USER_SHARED",
      learningEligible,
      correlationId: observation.correlationId || `sandbox-correlation-${index + 1}`,
      schemaVersion: 1,
    };
  });

  return {
    events,
    signals: events.flatMap((event) => {
      const signal = extractSignal(event);
      return signal ? [signal] : [];
    }),
    candidates: derivePreferenceCandidates(events, SYNTHETIC_OWNER),
    persistentWrites: 0,
  };
}
