import { CognitiveIntent, ParsedCognitiveContext } from "../domain/conversation";

export interface CompletenessValidationResult {
  isComplete: boolean;
  missingAspects: string[];
  confidence: number;
  isGeneric: boolean;
}

export interface ResponseAspectEvidence {
  aspect: string;
  cues: readonly string[];
  aliases?: readonly string[];
}

function normalizeCueText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function containsCue(text: string, cue: string): boolean {
  const normalizedCue = normalizeCueText(cue).trim();
  if (!normalizedCue) return false;
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${normalizedCue.replace(/[.*+?^${}()|[\]\\\\]/g, "\\\\$&")}(?=$|[^\\p{L}\\p{N}])`, "u").test(text);
}

function cueIsRequested(text: string, cue: string): boolean {
  const normalizedCue = normalizeCueText(cue).trim();
  if (!normalizedCue) return false;
  const escapedCue = normalizedCue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapedCue}(?=$|[^\\p{L}\\p{N}])`, "gu");
  for (const match of text.matchAll(expression)) {
    const start = (match.index ?? 0) + match[0].length - normalizedCue.length;
    const rawPrefix = text.slice(Math.max(0, start - 100), start);
    const clausePrefix = rawPrefix.split(/[,;.!?]|\b(?:mas|por[eé]m|contudo|todavia)\b/u).at(-1) ?? rawPrefix;
    const prefix = clausePrefix;
    if (/\bnao\s+(?:deixe|deixem|deixar)\s+de\s+(?:\p{L}+\s+){0,2}$/u.test(prefix)) return true;
    if (/\bnao\s+(?:so|apenas|somente)\s+(?:\p{L}+\s+){0,2}$/u.test(prefix)) return true;
    if (/\b(?:nao|nunca|jamais|nem|sem|dispenso|dispense)\b(?:\s+\p{L}+){0,4}\s*$/u.test(prefix)) continue;
    return true;
  }
  return false;
}

/** Small, language-aware contract cues for explicit multi-part user requests. */
export function findUnaddressedResponseAspects(
  prompt: string,
  response: string,
  aspects: readonly ResponseAspectEvidence[],
): string[] {
  const normalizedResponse = normalizeCueText(response);
  const normalizedPrompt = normalizeCueText(prompt);
  return aspects
    .filter(({ cues, aliases = [] }) => {
      const requested = [...cues, ...aliases].some((cue) => cueIsRequested(normalizedPrompt, cue));
      const covered = [...cues, ...aliases].some((cue) => containsCue(normalizedResponse, cue));
      return requested && !covered;
    })
    .map(({ aspect }) => `REQUESTED_ASPECT:${aspect}`);
}

export class ResponseCompletenessValidator {
  /**
   * Validates if the generated response actually addresses the user's compound cognitive requests.
   */
  validate(
    parsed: ParsedCognitiveContext,
    responseText: string,
    request?: { prompt: string; aspects?: readonly ResponseAspectEvidence[] },
  ): CompletenessValidationResult {
    const text = responseText.trim();
    const lower = text.toLowerCase();
    const missingAspects: string[] = [];

    if (request?.aspects?.length) {
      missingAspects.push(...findUnaddressedResponseAspects(request.prompt, text, request.aspects));
    }

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
