import { TaskType, TaskPriority } from "../domain/task";

export interface CognitiveDecision {
  intent: string;
  taskType: TaskType;
  priority: TaskPriority;
  complexity: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  requiresMemory: boolean;
  requiresWorkflow: boolean;
  requiredTools: string[];
  suggestedAgents: string[];
  extractedEntities: {
    targetProject?: string;
    keywords?: string[];
  };
}

export class StructuredOutputValidator {
  parseDecision(rawText: string, fallbackPrompt: string): CognitiveDecision {
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.intent && parsed.taskType) {
          return {
            intent: parsed.intent,
            taskType: parsed.taskType || "ACTION_FAST",
            priority: parsed.priority || "media",
            complexity: parsed.complexity || "LOW",
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
            requiresMemory: Boolean(parsed.requiresMemory),
            requiresWorkflow: Boolean(parsed.requiresWorkflow),
            requiredTools: Array.isArray(parsed.requiredTools) ? parsed.requiredTools : [],
            suggestedAgents: Array.isArray(parsed.suggestedAgents) ? parsed.suggestedAgents : [],
            extractedEntities: parsed.extractedEntities || {},
          };
        }
      }
    } catch {
      // ignore parse error and use deterministic fallback
    }

    // Fallback Decision
    return {
      intent: fallbackPrompt,
      taskType: "ACTION_FAST",
      priority: "media",
      complexity: "LOW",
      confidence: 0.9,
      requiresMemory: false,
      requiresWorkflow: false,
      requiredTools: [],
      suggestedAgents: ["sophia", "critias"],
      extractedEntities: {},
    };
  }
}

export const structuredOutputValidator = new StructuredOutputValidator();

