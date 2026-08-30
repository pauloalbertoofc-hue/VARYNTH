/**
 * VARYNTH OS — ATHENA SEMANTIC INTERPRETATION ENGINE
 * Central Hybrid Semantic Fusion Engine combining Deterministic Safety Signals,
 * Pragmatic & Negation Analysis, Local Similarity (TF-IDF/Cosine), and Optional Small LM Enrichment.
 */

import {
  AthenaCanonicalIntent,
  SemanticInterpretation,
  SemanticObservationTrace,
  SemanticSource,
  ConfidenceBucket,
} from "./types";
import { NoiseDetector } from "./noise-detector";
import { NegationAnalyzer } from "./negation-analyzer";
import { PragmaticsAnalyzer } from "./pragmatics-analyzer";
import { SlotExtractor } from "./slot-extractor";
import { LocalSimilarityEngine } from "./similarity-engine";
import { LocalSemanticLMAdapter } from "./adapters/local-semantic-lm";

export interface SemanticContextInfo {
  hasPendingPlan?: boolean;
  hasPendingSlot?: boolean;
  currentProjectId?: string;
  currentTopic?: string;
  recentEntities?: string[];
  contextData?: Record<string, unknown>;
}

export class SemanticInterpretationEngine {
  /**
   * Synchronous deterministic baseline interpretation (Layers 1-5 + 7).
   */
  static interpretSync(
    cleanText: string,
    rawPrompt: string,
    context: SemanticContextInfo = {}
  ): SemanticInterpretation {
    const timestamp = new Date().toISOString();
    const deterministicSignals: string[] = [];
    const pragmaticFlags: string[] = [];

    // 1. Layer 1: Noise & Entropy Check
    const noiseRes = NoiseDetector.evaluate(rawPrompt, cleanText);
    if (noiseRes.isNoise) {
      deterministicSignals.push(`NOISE_DETECTED: ${noiseRes.reason}`);
      const trace: SemanticObservationTrace = {
        rawPrompt,
        normalizedText: cleanText,
        deterministicSignals,
        pragmaticFlags,
        similarityTopCandidates: [],
        selectedIntent: "UNKNOWN_INPUT",
        confidenceScore: noiseRes.confidence,
        confidenceBucket: "LOW",
        semanticSource: "DETERMINISTIC",
        margin: 1.0,
        timestamp,
      };

      return {
        intent: "UNKNOWN_INPUT",
        confidence: noiseRes.confidence,
        confidenceLevel: "LOW",
        slots: {},
        polarity: "UNCERTAIN",
        ambiguity: "SEMANTIC",
        semanticSource: "DETERMINISTIC",
        candidateScores: [{ intent: "UNKNOWN_INPUT", score: noiseRes.confidence }],
        margin: 1.0,
        isNoise: true,
        requiresClarification: true,
        clarificationPrompt: noiseRes.clarificationPrompt,
        trace,
      };
    }

    // 2. Layer 2: Negation & Scope Analysis
    const negRes = NegationAnalyzer.analyze(cleanText);
    if (negRes.hasPrimaryNegation) {
      deterministicSignals.push("PRIMARY_NEGATION_VETO");
    }
    if (negRes.polarity === "SCOPED_NEGATION") {
      deterministicSignals.push("SCOPED_NEGATION_DETECTED");
    }

    // 3. Layer 3: Pragmatics & Speech Acts Analysis
    const pragRes = PragmaticsAnalyzer.analyze(cleanText, Boolean(context.hasPendingPlan || context.hasPendingSlot));
    if (pragRes.isSarcasticOrIronic) pragmaticFlags.push("SARCASM_OR_IRONY");
    if (pragRes.isEmotionalVenting) pragmaticFlags.push("EMOTIONAL_VENTING");
    if (pragRes.isCapabilityQuestion) pragmaticFlags.push("CAPABILITY_INQUIRY");
    if (pragRes.isIndirectPoliteRequest) pragmaticFlags.push("POLITE_INDIRECT_REQUEST");
    if (pragRes.isApprovalPhrase) pragmaticFlags.push(`APPROVAL_PHRASE (pending: ${Boolean(context.hasPendingPlan)})`);

    // 4. Layer 4: Slot Extraction
    const slots = SlotExtractor.extractSlots(rawPrompt, cleanText);

    // 5. Layer 5: Local Statistical Similarity Engine (Baseline TF-IDF/Cosine)
    const simRes = LocalSimilarityEngine.match(cleanText, 5);
    const topCandidates = simRes.candidates;
    const similarityMargin = simRes.margin;

    // 7. Layer 7: Semantic Fusion & Precedence Resolution
    let selectedIntent: AthenaCanonicalIntent = "SOCIAL_CONVERSATION";
    let finalConfidence = 0.7;
    let semanticSource: SemanticSource = "SIMILARITY";
    const topSim = topCandidates[0];

    // Rule A: Sarcasm / Irony Safety Veto (Never approval)
    if (pragRes.isSarcasticOrIronic && pragRes.suggestedIntent) {
      selectedIntent = pragRes.suggestedIntent;
      finalConfidence = pragRes.confidence;
      semanticSource = "DETERMINISTIC";
      deterministicSignals.push("PRAGMATIC_SARCASM_VETO");
    }
    // Rule B: Emotional Venting (Empathy, no mutation)
    else if (pragRes.isEmotionalVenting) {
      selectedIntent = "SOCIAL_CONVERSATION";
      finalConfidence = 0.9;
      semanticSource = "DETERMINISTIC";
    }
    // Rule C: Approval Phrase Routing (Pending context required)
    else if (pragRes.isApprovalPhrase) {
      selectedIntent = context.hasPendingPlan ? "APPROVAL" : "SOCIAL_CONVERSATION";
      finalConfidence = pragRes.confidence;
      semanticSource = "DETERMINISTIC";
    }
    // Rule D: Primary Negation Veto over Actions
    else if (negRes.hasPrimaryNegation) {
      selectedIntent = cleanText.includes("tarefa") || cleanText.includes("video") ? "SOCIAL_CONVERSATION" : "REJECTION";
      finalConfidence = 0.95;
      semanticSource = "DETERMINISTIC";
      deterministicSignals.push("PRIMARY_NEGATION_ACTION_BLOCKED");
    }
    // Rule E: Capability Inquiry
    else if (pragRes.isCapabilityQuestion) {
      selectedIntent = "SOCIAL_CONVERSATION";
      finalConfidence = 0.85;
      semanticSource = "DETERMINISTIC";
    }
    // Rule F: Polite Indirect Command
    else if (pragRes.isIndirectPoliteRequest && pragRes.suggestedIntent) {
      selectedIntent = pragRes.suggestedIntent;
      finalConfidence = pragRes.confidence;
      semanticSource = "DETERMINISTIC";
    }
    // Rule G: Similarity Ranking & Statistical Score
    else if (topSim && topSim.score >= 0.28) {
      if (topSim.intent === "CLARIFICATION_RESPONSE" && !context.hasPendingSlot) {
        selectedIntent = "SOCIAL_CONVERSATION";
        finalConfidence = 0.7;
      } else {
        selectedIntent = topSim.intent;
        finalConfidence = Math.min(0.98, topSim.score + (similarityMargin > 0.08 ? 0.15 : 0.05));
      }
    }
    // Rule H: Fallback
    else {
      selectedIntent = "SOCIAL_CONVERSATION";
      finalConfidence = 0.5;
      semanticSource = "DETERMINISTIC";
    }

    const confidenceLevel: ConfidenceBucket =
      finalConfidence >= 0.72 ? "HIGH" : finalConfidence >= 0.45 ? "MEDIUM" : "LOW";

    const trace: SemanticObservationTrace = {
      rawPrompt,
      normalizedText: cleanText,
      deterministicSignals,
      pragmaticFlags,
      negationScope: negRes.negationScope,
      similarityTopCandidates: topCandidates.map((c) => ({ intent: c.intent, score: c.score })),
      selectedIntent,
      confidenceScore: finalConfidence,
      confidenceBucket: confidenceLevel,
      semanticSource,
      margin: similarityMargin,
      timestamp,
    };

    return {
      intent: selectedIntent,
      confidence: finalConfidence,
      confidenceLevel,
      slots,
      polarity: negRes.polarity,
      negatedScope: negRes.negationScope,
      ambiguity: similarityMargin < 0.06 && (topSim?.score || 0) > 0.4 ? "SEMANTIC" : "NONE",
      semanticSource,
      candidateScores: topCandidates.map((c) => ({ intent: c.intent, score: c.score })),
      margin: similarityMargin,
      isNoise: false,
      requiresClarification: false,
      trace,
    };
  }

  /**
   * Interprets normalized user input using layered hybrid semantic fusion including optional Small LM enrichment.
   */
  static async interpret(
    cleanText: string,
    rawPrompt: string,
    context: SemanticContextInfo = {}
  ): Promise<SemanticInterpretation> {
    const syncRes = this.interpretSync(cleanText, rawPrompt, context);
    if (syncRes.isNoise || syncRes.confidenceLevel === "HIGH") {
      return syncRes; // Skip Local LM call when confidence is already HIGH or input is noise
    }

    // Attempt Optional Local Small LM Enrichment for Medium/Ambiguous cases
    try {
      const lmCandidate = await LocalSemanticLMAdapter.inferSemanticIntent(cleanText, context.contextData || {});
      if (lmCandidate) {
        const updatedCandidates = [{ intent: lmCandidate.intent, score: lmCandidate.confidence }, ...syncRes.candidateScores];
        return {
          ...syncRes,
          intent: lmCandidate.confidence > 0.8 ? lmCandidate.intent : syncRes.intent,
          confidence: Math.max(syncRes.confidence, lmCandidate.confidence),
          semanticSource: "HYBRID",
          trace: {
            ...syncRes.trace,
            localLMCandidate: { intent: lmCandidate.intent, confidence: lmCandidate.confidence },
            semanticSource: "HYBRID",
            circuitBreakerState: LocalSemanticLMAdapter.getCircuitState(),
          },
        };
      }
    } catch {
      // Return sync baseline safely
    }

    return syncRes;
  }
}

