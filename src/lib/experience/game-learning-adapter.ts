import { experienceService } from "./experience-service";
import type { ExperienceEvent } from "./contracts";

export type GameLearningAction = "MECHANIC_CHANGED" | "LEVEL_REBUILT" | "ASSET_REJECTED" | "DIFFICULTY_CHANGED" | "AGENT_PROPOSAL_MODIFIED";

export interface GameLearningInput {
  action: GameLearningAction;
  projectId?: string;
  sessionId?: string;
  artifactId?: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
  correlationId?: string;
}

export class GameLearningAdapter {
  async record(input: GameLearningInput): Promise<ExperienceEvent> {
    return experienceService.record({
      actor: "USER", actionType: "MANUAL_EDIT", moduleId: "game", projectId: input.projectId, sessionId: input.sessionId, artifactId: input.artifactId, targetId: input.targetId,
      before: input.before, after: input.after, correlationId: input.correlationId, metadata: { gameAction: input.action }, source: "game-learning-adapter",
      privacyScope: input.projectId ? "PROJECT_SHARED" : "USER_SHARED", learningEligible: true,
    });
  }
}

export const gameLearningAdapter = new GameLearningAdapter();
