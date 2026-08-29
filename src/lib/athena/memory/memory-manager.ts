import { AthenaTask } from "../domain/task";
import { AthenaMessage } from "../domain/response";

export interface SessionMemory {
  sessionId: string;
  recentMessages: AthenaMessage[];
}

export interface WorkingMemory {
  taskId: string;
  temporaryFacts: Record<string, unknown>;
  intermediateSteps: string[];
}

export interface EpisodicMemoryEntry {
  id: string;
  summary: string;
  scope: string;
  timestamp: string;
}

export interface SemanticConcept {
  id: string;
  name: string;
  definition: string;
  tags: string[];
}

export class MemoryManager {
  private sessionMemory: Map<string, SessionMemory> = new Map();
  private workingMemories: Map<string, WorkingMemory> = new Map();
  private episodicMemory: EpisodicMemoryEntry[] = [];
  private semanticMemory: SemanticConcept[] = [];

  // Session
  getSession(sessionId: string): SessionMemory {
    if (!this.sessionMemory.has(sessionId)) {
      this.sessionMemory.set(sessionId, { sessionId, recentMessages: [] });
    }
    return this.sessionMemory.get(sessionId)!;
  }

  appendMessage(sessionId: string, message: AthenaMessage): void {
    const session = this.getSession(sessionId);
    session.recentMessages = [message, ...session.recentMessages].slice(0, 30);
  }

  // Working Memory
  initWorkingMemory(taskId: string): WorkingMemory {
    const wm: WorkingMemory = { taskId, temporaryFacts: {}, intermediateSteps: [] };
    this.workingMemories.set(taskId, wm);
    return wm;
  }

  getWorkingMemory(taskId: string): WorkingMemory | undefined {
    return this.workingMemories.get(taskId);
  }

  clearWorkingMemory(taskId: string): void {
    this.workingMemories.delete(taskId);
  }

  // Episodic Memory (Histórico de decisões)
  recordEpisode(summary: string, scope: string): void {
    this.episodicMemory.unshift({
      id: "ep-" + Date.now(),
      summary,
      scope,
      timestamp: new Date().toISOString(),
    });
    this.episodicMemory = this.episodicMemory.slice(0, 50);
  }

  getRecentEpisodes(limit = 5): EpisodicMemoryEntry[] {
    return this.episodicMemory.slice(0, limit);
  }

  // Vector Contract Placeholder (Pronto para embeddings futuros)
  async queryVectorMemory(query: string, limit = 3): Promise<string[]> {
    // Vector search contract interface
    return [];
  }
}

export const athenaMemoryManager = new MemoryManager();

