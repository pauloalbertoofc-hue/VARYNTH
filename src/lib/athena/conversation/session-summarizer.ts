import { ConversationSummary } from "../domain/conversation";
import { AthenaMessage } from "../domain/response";

export class SessionSummarizer {
  summarize(messages: AthenaMessage[]): ConversationSummary {
    const topics: Set<string> = new Set();
    const decisions: string[] = [];
    const openQuestions: string[] = [];
    const referencedProjects: Set<string> = new Set();
    const importantFacts: string[] = [];

    messages.forEach((msg) => {
      const text = msg.text || "";

      // Detect project mentions
      const projMatch = text.match(/projeto\s+["']?([^"'\n,.]+)["']?/i);
      if (projMatch && projMatch[1]) {
        referencedProjects.add(projMatch[1].trim());
        topics.add(`Projeto: ${projMatch[1].trim()}`);
      }

      // Detect questions
      if (text.includes("?")) {
        const questionLines = text.split("\n").filter((l) => l.includes("?"));
        if (questionLines.length > 0) {
          openQuestions.push(questionLines[0].trim());
        }
      }

      // Detect decisions / actions
      if (text.includes("Criei a tarefa") || text.includes("salva com sucesso")) {
        decisions.push(text.split("\n")[0]);
      }
    });

    return {
      topics: Array.from(topics).slice(0, 5),
      decisions: decisions.slice(0, 5),
      openQuestions: openQuestions.slice(0, 3),
      referencedProjects: Array.from(referencedProjects).slice(0, 5),
      importantFacts: importantFacts.slice(0, 5),
    };
  }
}

export const sessionSummarizer = new SessionSummarizer();
