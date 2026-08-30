/**
 * VARYNTH OS — ATHENA NOISE DETECTOR
 * Detects random character sequences, isolated punctuation, and uninterpretable noise
 * while strictly preserving technical identifiers, commit hashes, ADRs, and citations.
 */

export interface NoiseDetectionResult {
  isNoise: boolean;
  confidence: number;
  reason?: string;
  clarificationPrompt?: string;
}

// Known technical patterns that must NEVER be flagged as noise
const VALID_TECHNICAL_PATTERNS = [
  /^[0-9a-f]{6,40}$/i,                      // Git commit hashes (e.g. bfdf792, 80161a3)
  /^adr-\d{2,4}$/i,                         // ADR numbers (e.g. ADR-039)
  /^[a-z]{2,8}-\d{3,6}$/i,                  // Ticket / Case numbers (e.g. HC123456)
  /^[a-z]{3,8}-(reg|int|sys)-\d{3}$/i,      // Test suite IDs (e.g. IMGST-REG-030, ATHSYS-001, SEM-REG-001)
  /^(resp|adi|adc|adpf|re|hc|ms)\s*[\d./-]+/i, // Legal citations (e.g. REsp 1.876.543/SP)
  /^[a-z0-9_-]+\.(ts|tsx|js|jsx|json|md|py|rs|css|html)$/i, // File names
  /^[a-z0-9_-]+\/[a-z0-9_-]+/i,             // Module / repo paths
];

export class NoiseDetector {
  /**
   * Evaluates whether a raw prompt represents unintelligible noise.
   */
  static evaluate(rawPrompt: string, cleanText: string): NoiseDetectionResult {
    const trimmed = rawPrompt.trim();

    // 1. Empty or whitespace only
    if (trimmed.length === 0) {
      return {
        isNoise: true,
        confidence: 1.0,
        reason: "EMPTY_INPUT",
        clarificationPrompt: "Fiquei em dúvida sobre como direcionar. O que você gostaria de analisar ou fazer?",
      };
    }

    // 2. Punctuation or symbols only (e.g. "...", "???", "---", "!?!")
    const nonPunctuation = trimmed.replace(/[.,!?;:()_+\-~*&%$#@/\\<>{}[\]|'"`^]/g, "");
    if (nonPunctuation.trim().length === 0) {
      return {
        isNoise: true,
        confidence: 0.95,
        reason: "ISOLATED_PUNCTUATION",
        clarificationPrompt: "Fiquei em dúvida sobre como direcionar. O que você gostaria de explorar no sistema?",
      };
    }

    // 3. Check for valid technical identifiers before entropy checks
    const singleToken = trimmed.replace(/[.,!?]$/, "").trim();
    for (const pattern of VALID_TECHNICAL_PATTERNS) {
      if (pattern.test(singleToken) || pattern.test(trimmed)) {
        return { isNoise: false, confidence: 0.0 };
      }
    }

    // 4. Repeated isolated single characters (e.g. "aaaaaaa", "111111", "zzzzzzzz")
    if (/^(.)\1{4,}$/i.test(singleToken)) {
      return {
        isNoise: true,
        confidence: 0.9,
        reason: "REPEATED_CHARACTER_FLOOD",
        clarificationPrompt: "Não consegui identificar a intenção nessa mensagem. Pode reformular?",
      };
    }

    // 5. Random alphanumeric gibberish token without spaces or vowels (e.g. "xyz987abc", "asdklj", "qwrtyp")
    // If it's a single word without Portuguese/English syllable structure and contains no known words
    const tokens = cleanText.split(" ").filter(Boolean);
    if (tokens.length === 1) {
      const token = tokens[0];

      // Very short tokens (1-2 chars) that are not common prepositions/pronouns
      const validShortWords = new Set(["o", "a", "os", "as", "um", "de", "do", "da", "em", "no", "na", "se", "eu", "tu", "ele", "ela", "ia", "ai", "oi", "ok"]);
      if (token.length <= 2 && !validShortWords.has(token) && !/^\d+$/.test(token)) {
        return {
          isNoise: true,
          confidence: 0.85,
          reason: "UNKNOWN_SHORT_FRAGMENT",
          clarificationPrompt: "Fiquei em dúvida sobre esse termo. Poderia me dar mais contexto?",
        };
      }

      // Check mixed alphanumeric gibberish (e.g. "xyz987abc")
      const hasDigits = /\d/.test(token);
      const hasLetters = /[a-z]/.test(token);
      const isMixedAlphanumeric = hasDigits && hasLetters;
      const isVeryLowVowel = (token.match(/[aeiou]/g) || []).length === 0 && token.length >= 4;

      if ((isMixedAlphanumeric || isVeryLowVowel) && token.length >= 6 && !VALID_TECHNICAL_PATTERNS.some((p) => p.test(token))) {
        return {
          isNoise: true,
          confidence: 0.88,
          reason: "ALPHANUMERIC_GIBBERISH",
          clarificationPrompt: "Não consegui entender a que você está se referindo com esse termo. Pode reformular?",
        };
      }
    }

    return { isNoise: false, confidence: 0.0 };
  }
}
