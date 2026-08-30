/**
 * VARYNTH OS — ATHENA LOCAL SIMILARITY ENGINE
 * Statistical lexical/n-gram TF-IDF & Cosine Similarity baseline over canonical intent examples.
 * 
 * Note: This provides deterministic statistical matching for natural paraphrases without requiring
 * any external or local neural network runtime.
 */

import { AthenaCanonicalIntent } from "./types";
import { ALL_INTENT_EXAMPLES } from "./intent-taxonomy";

export interface IntentSimilarityCandidate {
  intent: AthenaCanonicalIntent;
  score: number;
  matchedExample: string;
}

export class LocalSimilarityEngine {
  private static vocabulary: Map<string, number> = new Map();
  private static idfWeights: Map<string, number> = new Map();
  private static exampleVectors: { intent: AthenaCanonicalIntent; phrase: string; vector: Map<string, number> }[] = [];
  private static isInitialized = false;

  private static extractNgrams(text: string): string[] {
    const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
    const ngrams: string[] = [];

    // Word unigrams & bigrams
    for (let i = 0; i < tokens.length; i++) {
      ngrams.push(tokens[i]);
      if (i < tokens.length - 1) {
        ngrams.push(`${tokens[i]}_${tokens[i + 1]}`);
      }
    }

    // Character trigrams for morphological robustness (e.g. "pendente", "pendência", "pendencias")
    for (let i = 0; i < text.length - 2; i++) {
      ngrams.push(`c:${text.substring(i, i + 3)}`);
    }

    return ngrams;
  }

  static initialize(): void {
    if (this.isInitialized) return;

    const docFreq: Map<string, number> = new Map();
    const totalDocs = ALL_INTENT_EXAMPLES.length;

    // 1. Build Document Frequencies
    ALL_INTENT_EXAMPLES.forEach((ex) => {
      const ngrams = new Set(this.extractNgrams(ex.canonicalPhrase));
      ngrams.forEach((ng) => {
        docFreq.set(ng, (docFreq.get(ng) || 0) + 1);
      });
    });

    // 2. Compute IDF Weights
    docFreq.forEach((count, ng) => {
      const idf = Math.log(1 + (totalDocs / (1 + count)));
      this.idfWeights.set(ng, idf);
    });

    // 3. Build Example TF-IDF Vectors
    this.exampleVectors = ALL_INTENT_EXAMPLES.map((ex) => {
      const ngrams = this.extractNgrams(ex.canonicalPhrase);
      const tf: Map<string, number> = new Map();
      ngrams.forEach((ng) => tf.set(ng, (tf.get(ng) || 0) + 1));

      const vector: Map<string, number> = new Map();
      let norm = 0;
      tf.forEach((count, ng) => {
        const idf = this.idfWeights.get(ng) || 1.0;
        const val = count * idf;
        vector.set(ng, val);
        norm += val * val;
      });

      const length = Math.sqrt(norm) || 1.0;
      vector.forEach((val, ng) => vector.set(ng, val / length));

      return {
        intent: ex.intent,
        phrase: ex.canonicalPhrase,
        vector,
      };
    });

    this.isInitialized = true;
  }

  /**
   * Computes top matching intent candidates against the canonical example database.
   */
  static match(cleanText: string, topK = 5): { candidates: IntentSimilarityCandidate[]; margin: number } {
    this.initialize();

    const queryNgrams = this.extractNgrams(cleanText);
    const tf: Map<string, number> = new Map();
    queryNgrams.forEach((ng) => tf.set(ng, (tf.get(ng) || 0) + 1));

    const queryVector: Map<string, number> = new Map();
    let queryNorm = 0;
    tf.forEach((count, ng) => {
      const idf = this.idfWeights.get(ng) || 1.0;
      const val = count * idf;
      queryVector.set(ng, val);
      queryNorm += val * val;
    });

    const length = Math.sqrt(queryNorm) || 1.0;
    queryVector.forEach((val, ng) => queryVector.set(ng, val / length));

    // Aggregate maximum score per intent
    const intentBestScores: Map<AthenaCanonicalIntent, { score: number; phrase: string }> = new Map();

    for (const ex of this.exampleVectors) {
      let dotProduct = 0;
      queryVector.forEach((qVal, ng) => {
        const docVal = ex.vector.get(ng);
        if (docVal !== undefined) {
          dotProduct += qVal * docVal;
        }
      });

      const current = intentBestScores.get(ex.intent);
      if (!current || dotProduct > current.score) {
        intentBestScores.set(ex.intent, { score: dotProduct, phrase: ex.phrase });
      }
    }

    const sorted: IntentSimilarityCandidate[] = Array.from(intentBestScores.entries())
      .map(([intent, data]) => ({
        intent,
        score: Math.min(1.0, Math.max(0.0, data.score)),
        matchedExample: data.phrase,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    const top1 = sorted[0]?.score || 0;
    const top2 = sorted[1]?.score || 0;
    const margin = Math.max(0, top1 - top2);

    return { candidates: sorted, margin };
  }
}

