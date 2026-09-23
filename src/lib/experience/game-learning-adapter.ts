import { experienceService } from "./experience-service";
import type { ExperienceEvent } from "./contracts";
import type { GameDocumentState } from "@/lib/studio/game/types";

export type GameLearningAction = "MECHANIC_CHANGED" | "LEVEL_REBUILT" | "ASSET_REJECTED" | "DIFFICULTY_CHANGED" | "AGENT_PROPOSAL_MODIFIED" | "GAME_DOCUMENT_EDITED";

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

export interface GameLearningObservation {
  action: Extract<GameLearningAction, "MECHANIC_CHANGED" | "LEVEL_REBUILT" | "GAME_DOCUMENT_EDITED">;
  before: Record<string, number>;
  after: Record<string, number>;
}

/** Summarizes a user edit without retaining game content, names, scripts, or assets. */
export function collectGameLearningObservation(previous: GameDocumentState, next: GameDocumentState): GameLearningObservation | null {
  if (JSON.stringify(previous) === JSON.stringify(next)) return null;
  const counts = (state: GameDocumentState) => ({
    scenes: state.scenes.length,
    entities: state.entities.length,
    rules: state.rules.length,
    variables: state.variables.length,
  });
  const before = counts(previous);
  const after = counts(next);
  const changedStructure = before.scenes !== after.scenes || before.entities !== after.entities;
  const changedMechanics = before.rules !== after.rules || before.variables !== after.variables;
  return { action: changedStructure ? "LEVEL_REBUILT" : changedMechanics ? "MECHANIC_CHANGED" : "GAME_DOCUMENT_EDITED", before, after };
}

export class GameLearningAdapter {
  async record(input: GameLearningInput): Promise<ExperienceEvent> {
    return experienceService.record({
      actor: "USER", actionType: "MANUAL_EDIT", domain: "game", moduleId: "game", projectId: input.projectId, sessionId: input.sessionId, artifactId: input.artifactId, targetId: input.targetId,
      before: input.before, after: input.after, correlationId: input.correlationId, metadata: { gameAction: input.action }, source: "game-learning-adapter",
      privacyScope: input.projectId ? "PROJECT_SHARED" : "USER_SHARED", learningEligible: true,
    });
  }
}

export const gameLearningAdapter = new GameLearningAdapter();
