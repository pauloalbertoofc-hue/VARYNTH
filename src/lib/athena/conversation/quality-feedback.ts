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
  prompt?: string;
  response: string;
  correction?: string;
}

const STORAGE_KEY = "varynth-athena-conversation-feedback-v1";
const memoryRecords: AthenaConversationFeedback[] = [];

function readStored(): AthenaConversationFeedback[] {
  if (typeof window === "undefined") return [...memoryRecords];
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export const athenaConversationFeedback = {
  record(input: Omit<AthenaConversationFeedback, "id" | "timestamp">): AthenaConversationFeedback {
    const record: AthenaConversationFeedback = {
      ...input,
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
