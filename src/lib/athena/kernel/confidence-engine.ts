import { ConfidenceAssessment, ConfidenceLevel } from "../domain/confidence";
import { AthenaTask } from "../domain/task";
import { AthenaContext } from "../domain/context";
import { AgentResult } from "../domain/result";

export class ConfidenceEngine {
  assess(
    task: AthenaTask,
    context: AthenaContext,
    agentResults: AgentResult[] = [],
    toolSuccess = true
  ): ConfidenceAssessment {
    let score = 0.5;

    // 1. Context factor (do we have relevant project/vault items?)
    const hasContext = context.relevantProjects.length > 0 || context.relevantVaultItems.length > 0;
    const contextScore = hasContext ? 0.9 : 0.6;

    // 2. Agent consensus
    let agentScore = 0.8;
    if (agentResults.length > 0) {
      const avgConfidence =
        agentResults.reduce((acc, a) => acc + a.confidence, 0) / agentResults.length;
      agentScore = avgConfidence;
    }

    // 3. Tool execution factor
    const toolScore = toolSuccess ? 1.0 : 0.3;

    // Aggregate score
    score = contextScore * 0.3 + agentScore * 0.4 + toolScore * 0.3;

    let level: ConfidenceLevel = "MEDIUM";
    if (score >= 0.85) {
      level = "HIGH";
    } else if (score < 0.55) {
      level = "LOW";
    }

    let rationale = "Avaliação baseada em evidências locais, execução de ferramentas e histórico do VARYNTH.";
    if (!toolSuccess) {
      rationale = "Houve falha na execução de ferramenta do Action Layer.";
    } else if (!hasContext) {
      rationale = "Consulta executada sem contexto específico de workspace ou Vault.";
    }

    return {
      level,
      score: Math.round(score * 100) / 100,
      factors: {
        sourceReliability: contextScore,
        agentConsensus: agentScore,
        contextCompleteness: hasContext ? 0.9 : 0.5,
        toolExecutionSuccess: toolSuccess,
      },
      rationale,
    };
  }
}

export const athenaConfidenceEngine = new ConfidenceEngine();

