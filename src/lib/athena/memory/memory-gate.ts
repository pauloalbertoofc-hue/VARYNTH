import { ConfidenceLevel } from "../domain/confidence";

export interface CandidateMemory {
  title: string;
  content: string;
  scope: string;
  projectId?: string;
  confidence: ConfidenceLevel;
  sourceType: string;
}

export interface MemoryGateDecision {
  accepted: boolean;
  reason: string;
}

export class MemoryGate {
  evaluate(candidate: CandidateMemory): MemoryGateDecision {
    // 1. Content check
    if (!candidate.content || candidate.content.trim().length < 5) {
      return {
        accepted: false,
        reason: "Conteúdo muito curto ou irrelevante para armazenamento em memória permanente.",
      };
    }

    // 2. Reject LOW confidence unverified facts
    if (candidate.confidence === "LOW") {
      return {
        accepted: false,
        reason: "Fato com baixo nível de confiança epistêmica rejeitado pelo Memory Gate.",
      };
    }

    // 3. Accepted
    return {
      accepted: true,
      reason: "Memória validada com sucesso pelo Memory Gate.",
    };
  }
}

export const memoryGate = new MemoryGate();

