import { experienceService } from "./experience-service";
import type { ExperienceEvent } from "./contracts";

export type DocumentLearningAction = "FORMAT_CHANGED" | "DEPTH_CHANGED" | "STRUCTURE_REORDERED" | "CITATION_STYLE_CHANGED" | "DRAFT_ACCEPTED" | "DRAFT_REJECTED" | "CONTENT_EDITED";

export interface DocumentLearningInput {
  action: DocumentLearningAction;
  projectId?: string;
  sessionId?: string;
  artifactId?: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
  domain?: "writing" | "legal-workflow" | "research";
  correlationId?: string;
  /** True only when this edit is directly attributed to an explicit user action. */
  userInitiated?: boolean;
}

export class DocumentLearningAdapter {
  async record(input: DocumentLearningInput): Promise<ExperienceEvent> {
    const before = safeCharacterCount(input.before);
    const after = safeCharacterCount(input.after);
    return experienceService.record({
      actor: input.userInitiated === true ? "USER" : "SYSTEM", actionType: input.action === "DRAFT_ACCEPTED" ? "PROPOSAL_ACCEPTED" : input.action === "DRAFT_REJECTED" ? "PROPOSAL_REJECTED" : "MANUAL_EDIT", domain: input.domain || "writing",
      moduleId: "document", projectId: input.projectId, sessionId: input.sessionId, artifactId: input.artifactId, targetId: input.targetId,
      before, after, correlationId: input.correlationId, metadata: { documentAction: input.action, domain: input.domain || "writing", generatedAutomatically: input.userInitiated !== true },
      source: "document-learning-adapter", privacyScope: input.projectId ? "PROJECT_SHARED" : "USER_SHARED", learningEligible: input.userInitiated === true,
    });
  }
}

function safeCharacterCount(value: unknown): { characters: number } | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const characters = (value as Record<string, unknown>).characters;
  return typeof characters === "number" && Number.isInteger(characters) && characters >= 0
    ? { characters }
    : undefined;
}

export const documentLearningAdapter = new DocumentLearningAdapter();
