export type AthenaFeedbackCategory =
  | "HELPFUL"
  | "MISUNDERSTOOD"
  | "GENERIC_RESPONSE"
  | "LOST_CONTEXT"
  | "WRONG_ACTION";

export interface AthenaConversationFeedback {
  id: string;
  timestamp: string;
  sessionId: string;
  messageId: string;
  category: AthenaFeedbackCategory;
  /** Accepted for compatibility but intentionally not persisted. */
  prompt?: string;
  /** Accepted for compatibility but intentionally not persisted. */
  response?: string;
  correction?: string;
}

const STORAGE_KEY = "varynth-athena-conversation-feedback-v1";
const memoryRecords: AthenaConversationFeedback[] = [];

function readStored(): AthenaConversationFeedback[] {
  if (typeof window === "undefined") return [...memoryRecords];
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as AthenaConversationFeedback[];
    const minimized = parsed.map(({ prompt: _prompt, response: _response, ...record }) => record);
    if (minimized.some((record, index) => Object.hasOwn(parsed[index], "prompt") || Object.hasOwn(parsed[index], "response"))) {
      // The original messages remain in conversation history; remove redundant legacy copies.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(minimized));
    }
    return minimized;
  } catch {
    return [];
  }
}

export const athenaConversationFeedback = {
  record(input: Omit<AthenaConversationFeedback, "id" | "timestamp">): AthenaConversationFeedback {
    const { prompt: _prompt, response: _response, ...retained } = input;
    const record: AthenaConversationFeedback = {
      ...retained,
      id: `ath-feedback-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    if (typeof window === "undefined") {
      memoryRecords.unshift(record);
      return record;
    }
    const records = [record, ...readStored()].slice(0, 500);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Feedback is best-effort and must never interrupt the conversation.
    }
    return record;
  },

  list(): AthenaConversationFeedback[] {
    return readStored();
  },
  latest(sessionId: string): AthenaConversationFeedback | undefined {
    return readStored().find(record => record.sessionId === sessionId && record.category !== "HELPFUL");
  },
};
