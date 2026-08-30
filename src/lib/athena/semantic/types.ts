/**
 * VARYNTH OS — ATHENA SEMANTIC INTELLIGENCE REFINEMENT
 * Domain Types for Hybrid Local Semantic Interpretation Layer
 */

export type AthenaCanonicalIntent =
  | "SOCIAL_CONVERSATION"   // Cumprimentos, saudações, humor, empatia
  | "ECOSYSTEM_STATUS"      // Consulta geral do estado do sistema / recursos
  | "TASK_QUERY"           // Consulta a tarefas, pendências, fila de afazeres
  | "PROJECT_QUERY"        // Consulta ou foco em projetos
  | "ARTIFACT_QUERY"       // Consulta a artefatos específicos (docs, vídeos, código)
  | "EXECUTION_REQUEST"    // Comando de mutação operacional (criar tarefa, nota, lixeira)
  | "CREATIVE_INTENT"      // Intenção de criação multi-estúdio (vídeo, jogo, site, imagem)
  | "APPROVAL"             // Aprovação contextual de plano pendente ("Pode", "Manda bala")
  | "REJECTION"            // Rejeição de proposta ("Não gostei")
  | "CANCELLATION"         // Cancelamento antes da execução ("Espera, não faz")
  | "CORRECTION"           // Correção de fato ou entidade ("Não, falei do Projeto B")
  | "CLARIFICATION_RESPONSE"// Resposta direta a slot pendente ("O CNJ")
  | "ATHENA_SELF_STATUS"   // Diagnóstico do Kernel cognitivo da Athena
  | "ECOSYSTEM_BRIEFING"   // Resumo executivo de mudanças no ecossistema
  | "EPISTEMIC_QUERY"      // Pergunta filosófica / conceitual / teórica
  | "UNKNOWN_INPUT";       // Entrada sem sentido / alta entropia exigindo esclarecimento

export type SemanticPolarity =
  | "AFFIRMATIVE"
  | "NEGATED"
  | "SCOPED_NEGATION"
  | "UNCERTAIN";

export type SemanticAmbiguityType =
  | "NONE"
  | "REFERENCE"
  | "TARGET"
  | "ACTION"
  | "SCOPE"
  | "SEMANTIC";

export type SemanticSource =
  | "DETERMINISTIC"
  | "SIMILARITY"
  | "EMBEDDING"
  | "LOCAL_LM"
  | "HYBRID";

export type ConfidenceBucket = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface SemanticSlotProvenance<T = unknown> {
  name: string;
  value: T;
  sourceTextSpan: string;
  confidence: number;
  extractedBy: "REGEX" | "SIMILARITY" | "LOCAL_LM" | "HEURISTIC";
}

export interface SemanticObservationTrace {
  rawPrompt: string;
  normalizedText: string;
  deterministicSignals: string[];
  pragmaticFlags: string[];
  negationScope?: { allowAction: boolean; allowPublish: boolean; allowMutate: boolean };
  similarityTopCandidates: { intent: AthenaCanonicalIntent; score: number }[];
  localLMCandidate?: { intent: AthenaCanonicalIntent; confidence: number };
  selectedIntent: AthenaCanonicalIntent;
  confidenceScore: number;
  confidenceBucket: ConfidenceBucket;
  semanticSource: SemanticSource;
  margin: number;
  circuitBreakerState?: "CLOSED" | "OPEN" | "HALF_OPEN";
  timestamp: string;
}

export interface SemanticInterpretation {
  intent: AthenaCanonicalIntent;
  confidence: number; // 0.0 - 1.0 (calibrado por fonte)
  confidenceLevel: ConfidenceBucket;
  slots: Record<string, SemanticSlotProvenance>;
  polarity: SemanticPolarity;
  negatedScope?: {
    allowAction: boolean;
    allowPublish: boolean;
    allowMutate: boolean;
    disallowedActions: string[];
  };
  ambiguity: SemanticAmbiguityType;
  semanticSource: SemanticSource;
  candidateScores: { intent: AthenaCanonicalIntent; score: number }[];
  margin: number;
  isNoise: boolean;
  requiresClarification: boolean;
  clarificationPrompt?: string;
  trace: SemanticObservationTrace;
}

export interface SemanticCandidate {
  intent: AthenaCanonicalIntent;
  confidence: number;
  slots?: Record<string, unknown>;
  rationale?: string;
}

export interface IntentCorpusItem {
  canonicalPhrase: string;
  category: "canonical" | "formal" | "casual" | "short" | "indirect" | "colloquial" | "polite";
  intent: AthenaCanonicalIntent;
  expectedSlots?: Record<string, unknown>;
}

export interface SemanticFusionPolicy {
  minHighConfidenceThreshold: number;
  minMediumConfidenceThreshold: number;
  minCandidateMargin: number;
  enableLocalLMEnrichment: boolean;
  localLMTimeoutMs: number;
}
