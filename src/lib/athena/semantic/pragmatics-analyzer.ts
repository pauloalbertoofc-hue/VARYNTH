/**
 * VARYNTH OS — ATHENA PRAGMATICS ANALYZER
 * Analyzes speech acts, capability inquiries vs direct commands, sarcasm,
 * emotional venting, polite indirect requests, and contextual approval flags.
 */

import { AthenaCanonicalIntent } from "./types";

export interface PragmaticAnalysisResult {
  speechAct: "COMMAND" | "CAPABILITY_INQUIRY" | "RHETORICAL_QUESTION" | "FEEDBACK" | "VENTING" | "HUMOR" | "ACKNOWLEDGEMENT";
  isSarcasticOrIronic: boolean;
  isIndirectPoliteRequest: boolean;
  isEmotionalVenting: boolean;
  isCapabilityQuestion: boolean;
  isApprovalPhrase: boolean;
  suggestedIntent?: AthenaCanonicalIntent;
  confidence: number;
}

export class PragmaticsAnalyzer {
  static analyze(cleanText: string, hasPendingConfirmation = false): PragmaticAnalysisResult {
    const text = cleanText
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^(athena|athenas)[,.:;!?\s-]+/, "")
      .trim();

    // 1. Sarcasm / Irony with positive prefix but negative intent
    // e.g. "perfeito era exatamente isso que eu nao queria", "maravilha quebrou tudo", "genial apagou o errado"
    const hasSarcasticNegative =
      (text.includes("perfeito") && text.includes("nao queria")) ||
      (text.includes("maravilha") && (text.includes("quebrou") || text.includes("apagou"))) ||
      (text.includes("genial") && (text.includes("errado") || text.includes("quebrou"))) ||
      (text.includes("excelente") && text.includes("nao funciona"));

    if (hasSarcasticNegative) {
      return {
        speechAct: "FEEDBACK",
        isSarcasticOrIronic: true,
        isIndirectPoliteRequest: false,
        isEmotionalVenting: false,
        isCapabilityQuestion: false,
        isApprovalPhrase: false,
        suggestedIntent: "SOCIAL_CONVERSATION",
        confidence: 0.9,
      };
    }

    // 2. Playful critique / Humor
    // e.g. "maravilha quebrou tudo kkk", "parabens athena nota do", "kkkkk"
    const hasHumor =
      text.includes("kkk") ||
      text.includes("hahaha") ||
      text.includes("rsrs") ||
      text.includes("nota do") ||
      text.includes("vai la e apaga tudo kkk");

    if (hasHumor) {
      return {
        speechAct: "HUMOR",
        isSarcasticOrIronic: true,
        isIndirectPoliteRequest: false,
        isEmotionalVenting: false,
        isCapabilityQuestion: false,
        isApprovalPhrase: false,
        suggestedIntent: "SOCIAL_CONVERSATION",
        confidence: 0.88,
      };
    }

    // 3. Emotional venting without mutation
    // e.g. "esse projeto esta me deixando maluco", "estou cansado disso", "que dor de cabeca"
    const hasVenting =
      text.includes("deixando maluco") ||
      text.includes("deixando louco") ||
      text.includes("estou estressado") ||
      text.includes("que cansaco") ||
      text.includes("que dor de cabeca");

    if (hasVenting) {
      return {
        speechAct: "VENTING",
        isSarcasticOrIronic: false,
        isIndirectPoliteRequest: false,
        isEmotionalVenting: true,
        isCapabilityQuestion: false,
        isApprovalPhrase: false,
        suggestedIntent: "SOCIAL_CONVERSATION",
        confidence: 0.9,
      };
    }

    // 4. Capability Question (Inquiry vs Execution Command)
    // "consegue/é possível?" asks about ability; "pode/poderia + action" is
    // ordinarily a polite request and is handled below as a governed request.
    const hasCapabilityInquiry =
      text.startsWith("voce consegue") ||
      text.startsWith("consegue") ||
      text.startsWith("consegue fazer") ||
      text.startsWith("seria possivel") ||
      text.startsWith("e possivel") ||
      text.startsWith("voce sabe se consegue") ||
      text.startsWith("voce tem como") ||
      text.startsWith("voce sabe como") ||
      text.startsWith("voce tem capacidade") ||
      /^(?:voce\s+)?(?:pode|poderia)\s+(?:me\s+)?(?:dizer|informar)\s+se\b/.test(text);

    if (hasCapabilityInquiry) {
      return {
        speechAct: "CAPABILITY_INQUIRY",
        isSarcasticOrIronic: false,
        isIndirectPoliteRequest: false,
        isEmotionalVenting: false,
        isCapabilityQuestion: true,
        isApprovalPhrase: false,
        suggestedIntent: "SOCIAL_CONVERSATION", // Dialog about capabilities
        confidence: 0.85,
      };
    }

    // 5. Rhetorical Question / Disagreement
    // e.g. "voce acha mesmo que eu vou publicar isso assim?", "acha que ficou bom?"
    const hasRhetoricalDisagreement =
      text.startsWith("voce acha mesmo que") ||
      text.startsWith("acha mesmo que") ||
      text.includes("vou publicar isso assim");

    if (hasRhetoricalDisagreement) {
      return {
        speechAct: "RHETORICAL_QUESTION",
        isSarcasticOrIronic: true,
        isIndirectPoliteRequest: false,
        isEmotionalVenting: false,
        isCapabilityQuestion: false,
        isApprovalPhrase: false,
        suggestedIntent: "REJECTION",
        confidence: 0.88,
      };
    }

    // 6. Polite indirect request
    // Distinguish action requests from asking for an explanation, analysis or help.
    const actionVerb = "(?:criar|crie|adicionar|adicione|gerar|gere|produzir|produza|fazer|faca|montar|monte|abrir|abra|salvar|salve|guardar|guarde|arquivar|arquive|apagar|apague|excluir|exclua|remover|remova|mover|mova|atualizar|atualize|alterar|altere|publicar|publique|enviar|envie|exportar|exporte|renderizar|renderize|iniciar|inicie|executar|execute|construir|construa)";
    const modalActionRequest = /^(?:(?:voce|vc)\s+)?(?:pode|poderia)\s+(?:(?:por\s+favor|me\s+fazer\s+o\s+favor\s+de)\s+)?(?:criar|crie|adicionar|adicione|gerar|gere|produzir|produza|fazer|faca|montar|monte|abrir|abra|salvar|salve|guardar|guarde|arquivar|arquive|apagar|apague|excluir|exclua|remover|remova|mover|mova|atualizar|atualize|alterar|altere|publicar|publique|enviar|envie|exportar|exporte|renderizar|renderize|iniciar|inicie|executar|execute|construir|construa)\b/.test(text) && text.length > "pode fazer".length;
    const asksForHelpRatherThanAction = /\b(?:me\s+)?ajudar\s+(?:a|com)\b/.test(text);
    const explicitCognitiveRequest = /\b(?:explicar|explique|explica|analisar|analise|examinar|examine|comparar|compare|resumir|resuma|criticar|critique|avaliar|avalie)\b/.test(text);
    const hasPoliteIndirect =
      (text.includes("se nao for incomodo") && !explicitCognitiveRequest && !asksForHelpRatherThanAction) ||
      (text.includes("voce poderia criar") && !explicitCognitiveRequest) ||
      (text.includes("voce poderia gerar") && !explicitCognitiveRequest) ||
      (text.includes("poderia fazer") && !explicitCognitiveRequest) ||
      text.includes("seria bom ter") ||
      (modalActionRequest && !asksForHelpRatherThanAction && !explicitCognitiveRequest);

    if (hasPoliteIndirect) {
      const isTaskOrNote = text.includes("tarefa") || text.includes("nota");
      const isCreative = text.includes("video") || text.includes("site") || text.includes("imagem") || text.includes("pdf");
      const isGovernedAction = new RegExp(`\\b${actionVerb}\\b`).test(text);

      return {
        speechAct: "COMMAND",
        isSarcasticOrIronic: false,
        isIndirectPoliteRequest: true,
        isEmotionalVenting: false,
        isCapabilityQuestion: false,
        isApprovalPhrase: false,
        suggestedIntent: isCreative ? "CREATIVE_INTENT" : (isTaskOrNote || isGovernedAction) ? "EXECUTION_REQUEST" : undefined,
        confidence: 0.86,
      };
    }

    // 7. Approval Phrase with vs without pending context
    // e.g. "pode", "pode fazer", "manda bala", "vai", "fechado"
    const approvalTokens = new Set(["confirmo", "confirmar", "pode", "pode fazer", "sim pode", "sim execute", "manda bala", "manda ver", "manda ver no rascunho", "pode mandar", "toca ficha", "vai nessa", "fechado", "vai", "vai em frente", "aprovado", "autorizado", "pode ser"]);
    if (approvalTokens.has(text) || text.startsWith("pode fazer") || text === "pode.") {
      return {
        speechAct: "ACKNOWLEDGEMENT",
        isSarcasticOrIronic: false,
        isIndirectPoliteRequest: false,
        isEmotionalVenting: false,
        isCapabilityQuestion: false,
        isApprovalPhrase: true,
        suggestedIntent: hasPendingConfirmation ? "APPROVAL" : "SOCIAL_CONVERSATION",
        confidence: hasPendingConfirmation ? 0.95 : 0.8,
      };
    }

    // 8. Default Direct Command or Neutral Statement
    return {
      speechAct: "COMMAND",
      isSarcasticOrIronic: false,
      isIndirectPoliteRequest: false,
      isEmotionalVenting: false,
      isCapabilityQuestion: false,
      isApprovalPhrase: false,
      confidence: 0.75,
    };
  }
}
