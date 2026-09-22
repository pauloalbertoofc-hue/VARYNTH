import { experienceService } from "./experience-service";
import type { ExperienceEvent } from "./contracts";

export type DocumentLearningAction = "FORMAT_CHANGED" | "DEPTH_CHANGED" | "STRUCTURE_REORDERED" | "CITATION_STYLE_CHANGED" | "DRAFT_ACCEPTED" | "DRAFT_REJECTED";

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
}

export class DocumentLearningAdapter {
  async record(input: DocumentLearningInput): Promise<ExperienceEvent> {
    return experienceService.record({
      actor: "USER", actionType: input.action === "DRAFT_ACCEPTED" ? "PROPOSAL_ACCEPTED" : input.action === "DRAFT_REJECTED" ? "PROPOSAL_REJECTED" : "MANUAL_EDIT",
      moduleId: "document", projectId: input.projectId, sessionId: input.sessionId, artifactId: input.artifactId, targetId: input.targetId,
      before: input.before, after: input.after, correlationId: input.correlationId, metadata: { documentAction: input.action, domain: input.domain || "writing" },
      source: "document-learning-adapter", privacyScope: input.projectId ? "PROJECT_SHARED" : "USER_SHARED", learningEligible: true,
    });
  }
}

export const documentLearningAdapter = new DocumentLearningAdapter();
