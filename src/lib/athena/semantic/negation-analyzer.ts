/**
 * VARYNTH OS — ATHENA NEGATION ANALYZER
 * Analyzes polarity, primary negation veto, scoped negation, and sentiment vs action contrast.
 */

import { SemanticPolarity } from "./types";

export interface NegationAnalysisResult {
  polarity: SemanticPolarity;
  hasPrimaryNegation: boolean;
  negationScope: {
    allowAction: boolean;
    allowPublish: boolean;
    allowMutate: boolean;
    disallowedActions: string[];
  };
  hasContrastingPositiveAction: boolean;
  positiveActionClause?: string;
  isDoubleNegation: boolean;
  confidence: number;
}

export class NegationAnalyzer {
  static analyze(cleanText: string): NegationAnalysisResult {
    const text = cleanText.toLowerCase();

    // 1. Check double negation (e.g. "não precisa deixar de criar", "não deixe de fazer")
    const isDoubleNegation =
      text.includes("nao precisa deixar de") ||
      text.includes("nao deixe de") ||
      text.includes("sem deixar de");

    if (isDoubleNegation) {
      return {
        polarity: "UNCERTAIN",
        hasPrimaryNegation: false,
        negationScope: {
          allowAction: true,
          allowPublish: true,
          allowMutate: true,
          disallowedActions: [],
        },
        hasContrastingPositiveAction: true,
        isDoubleNegation: true,
        confidence: 0.65,
      };
    }

    // 2. Check Scoped Negation / Action vs Publish / Action vs Execute
    // e.g. "crie o vídeo, mas não publique", "pode analisar, mas não execute", "analise sem alterar nada"
    const hasScopedExecutionVeto =
      text.includes("mas nao execute") ||
      text.includes("mas nao rode") ||
      text.includes("sem executar") ||
      text.includes("sem alterar") ||
      text.includes("sem mudar") ||
      text.includes("nao altere nada") ||
      text.includes("nao altere");

    const hasScopedPublishVeto =
      text.includes("mas nao publique") ||
      text.includes("sem publicar") ||
      text.includes("nao publicar") ||
      text.includes("nao lance");

    if (hasScopedExecutionVeto || hasScopedPublishVeto) {
      const disallowed: string[] = [];
      if (hasScopedExecutionVeto) disallowed.push("EXECUTE", "MUTATE");
      if (hasScopedPublishVeto) disallowed.push("PUBLISH");

      return {
        polarity: "SCOPED_NEGATION",
        hasPrimaryNegation: false,
        negationScope: {
          allowAction: true,
          allowPublish: !hasScopedPublishVeto,
          allowMutate: !hasScopedExecutionVeto,
          disallowedActions: disallowed,
        },
        hasContrastingPositiveAction: true,
        isDoubleNegation: false,
        confidence: 0.92,
      };
    }

    // 3. Check Negated Sentiment + Affirmative New Action
    // e.g. "Não gostei do título; faça outro", "Não gostei da capa, gere uma nova", "Não quero azul, use vermelho"
    const hasContrastingClause =
      (text.includes("nao gostei") || text.includes("nao quero assim") || text.includes("nao ficou bom")) &&
      (text.includes("faca") || text.includes("gere") || text.includes("crie") || text.includes("use") || text.includes("mude para"));

    if (hasContrastingClause) {
      return {
        polarity: "AFFIRMATIVE", // Overall intent is to produce the new requested action
        hasPrimaryNegation: false,
        negationScope: {
          allowAction: true,
          allowPublish: true,
          allowMutate: true,
          disallowedActions: [],
        },
        hasContrastingPositiveAction: true,
        isDoubleNegation: false,
        confidence: 0.88,
      };
    }

    // 4. Primary Explicit Action Negation
    // e.g. "não crie a tarefa", "não faça o vídeo ainda", "não quero que você altere nada", "não apague"
    const hasPrimaryNegation =
      text.startsWith("nao crie") ||
      text.startsWith("nao criar") ||
      text.startsWith("nao adicione") ||
      text.startsWith("nao faca") ||
      text.startsWith("nao fazer") ||
      text.startsWith("nao gere") ||
      text.startsWith("nao execute") ||
      text.startsWith("nao apague") ||
      text.startsWith("nao delete") ||
      text.startsWith("nao remova") ||
      text.startsWith("nao mova") ||
      text.startsWith("nao quero que") ||
      text.includes("nao precisa fazer") ||
      text.includes("nao faca o video ainda") ||
      text.includes("nao crie uma tarefa");

    if (hasPrimaryNegation) {
      return {
        polarity: "NEGATED",
        hasPrimaryNegation: true,
        negationScope: {
          allowAction: false,
          allowPublish: false,
          allowMutate: false,
          disallowedActions: ["CREATE", "EXECUTE", "MUTATE", "DELETE", "PUBLISH"],
        },
        hasContrastingPositiveAction: false,
        isDoubleNegation: false,
        confidence: 0.95,
      };
    }

    // 5. Default Affirmative
    return {
      polarity: "AFFIRMATIVE",
      hasPrimaryNegation: false,
      negationScope: {
        allowAction: true,
        allowPublish: true,
        allowMutate: true,
        disallowedActions: [],
      },
      hasContrastingPositiveAction: false,
      isDoubleNegation: false,
      confidence: 0.9,
    };
  }
}
