import { CognitiveIntent, ParsedCognitiveContext } from "../domain/conversation";

export interface CompletenessValidationResult {
  isComplete: boolean;
  missingAspects: string[];
  confidence: number;
  isGeneric: boolean;
}

export class ResponseCompletenessValidator {
  /**
   * Validates if the generated response actually addresses the user's compound cognitive requests.
   */
  validate(
    parsed: ParsedCognitiveContext,
    responseText: string
  ): CompletenessValidationResult {
    const text = responseText.trim();
    const lower = text.toLowerCase();
    const missingAspects: string[] = [];

    const genericMarkers = [
      "conectada ao seu ecossistema",
      "conectada ao núcleo do seu",
      "como seu copilot digital, posso",
      "o que temos na pauta hoje",
      "essa reflexão abre caminhos interessantes",
      "conectar com o acervo do vault",
      "como deseja que eu te ajude agora",
    ];
    const isGeneric = genericMarkers.some((marker) => lower.includes(marker));

    if (isGeneric && !parsed.intents.includes("SOCIAL_CONVERSATION")) {
      missingAspects.push("GENERIC_RESPONSE_SUBSTITUTED_FOR_ANSWER");
    }

    // Check 1: Must not be empty or too trivial for cognitive requests
    if (parsed.interactionType === "COGNITIVE_REQUEST" && text.length < 30) {
      missingAspects.push("RESPONSE_TOO_BRIEF");
    }

    // Check 2: Anti-Evasion Check — response must not merely rephrase the question or defer
    const isEvasive =
      lower.includes("estou acompanhando sua linha de raciocinio") ||
      lower.includes("estou acompanhando sua linha de raciocínio") ||
      lower.includes("como gostaria de encaminhar essa reflexao") ||
      lower.includes("como gostaria de encaminhar essa reflexão") ||
      (lower.startsWith("entendi perfeitamente") && text.length < 120);

    if (isEvasive) {
      missingAspects.push("EVASIVE_PLACEHOLDER_DETECTED");
    }

    // Check 3: If user asked for Brainstorm / Ideas, check if response contains ideas/options
    if (parsed.intents.includes("BRAINSTORM")) {
      const hasProposals =
        lower.includes("1.") ||
        lower.includes("•") ||
        lower.includes("opção") ||
        lower.includes("opcao") ||
        lower.includes("ideia") ||
        lower.includes("caminho") ||
        lower.includes("frente");

      if (!hasProposals) {
        missingAspects.push("MISSING_IDEAS_OR_PROPOSALS");
      }
    }

    // Check 4: If user asked for Recommendation, check if response recommends something
    if (parsed.intents.includes("RECOMMEND")) {
      const hasRecommendation =
        lower.includes("recomendo") ||
        lower.includes("sugiro") ||
        lower.includes("começaria") ||
        lower.includes("comecaria") ||
        lower.includes("destaque") ||
        lower.includes("interessante") ||
        lower.includes("prioridade");

      if (!hasRecommendation) {
        missingAspects.push("MISSING_RECOMMENDATION");
      }
    }

    // Check 5: If user asked for Critique, check if response contains critical review
    if (parsed.intents.includes("CRITIQUE")) {
      const hasCritique =
        lower.includes("crítica") ||
        lower.includes("critica") ||
        lower.includes("ponto cego") ||
        lower.includes("risco") ||
        lower.includes("atenção") ||
        lower.includes("atencao") ||
        lower.includes("desafio");

      if (!hasCritique) {
        missingAspects.push("MISSING_CRITIQUE_ANALYSIS");
      }
    }

    // Check 6: If user asked for Comparison, check if response compares entities
    if (parsed.intents.includes("COMPARE")) {
      const hasComparison =
        lower.includes("enquanto") ||
        lower.includes("comparando") ||
        lower.includes("por outro lado") ||
        lower.includes("diferença") ||
        lower.includes("diferenca") ||
        lower.includes("versus") ||
        lower.includes("vs");

      if (!hasComparison) {
        missingAspects.push("MISSING_COMPARATIVE_ELEMENTS");
      }
    }

    const isComplete = missingAspects.length === 0;
    const confidence = isComplete ? 1.0 : Math.max(0.2, 1.0 - missingAspects.length * 0.35);

    return {
      isComplete,
      missingAspects,
      confidence,
      isGeneric,
    };
  }
}

export const responseCompletenessValidator = new ResponseCompletenessValidator();
