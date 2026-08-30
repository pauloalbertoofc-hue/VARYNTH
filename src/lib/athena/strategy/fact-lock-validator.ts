/**
 * VARYNTH OS — FACT LOCK & FACTUAL GROUNDING VALIDATOR
 * Fail-Closed validation preventing neural hallucination or corruption of structured domain facts.
 * Validates semantic numbers, entity statuses, and operational claims against authoritative state.
 */

import { ResponseIntent, StructuredFact } from "./types";

export interface FactLockValidationResult {
  isValid: boolean;
  rejectedReasons: string[];
}

export class FactLockValidator {
  /**
   * Validates a candidate neural response text against structured facts.
   * Operates FAIL-CLOSED: if any critical fact is contradicted, returns isValid: false.
   */
  public static validate(responseText: string, intent: ResponseIntent): FactLockValidationResult {
    const rejectedReasons: string[] = [];
    const text = responseText.toLowerCase();

    for (const fact of intent.keyFacts) {
      // 1. Validate Numeric Counts (e.g., pendingTasksCount)
      if (typeof fact.value === "number") {
        const factNum = fact.value;

        // Check if a different number is stated in connection with the key entity
        if (fact.key === "pendingTasksCount") {
          // If the text mentions "X tarefas" where X is different from factNum
          const taskMatch = text.match(/(\d+)\s+tarefas/);
          if (taskMatch) {
            const statedNum = parseInt(taskMatch[1], 10);
            if (statedNum !== factNum) {
              rejectedReasons.push(
                `FactLock Violation: Expected ${factNum} pending tasks, but neural text stated ${statedNum}.`
              );
            }
          }
        }

        if (fact.key === "activeProjectsCount") {
          const projMatch = text.match(/(\d+)\s+projetos/);
          if (projMatch) {
            const statedNum = parseInt(projMatch[1], 10);
            if (statedNum !== factNum) {
              rejectedReasons.push(
                `FactLock Violation: Expected ${factNum} active projects, but neural text stated ${statedNum}.`
              );
            }
          }
        }

        if (fact.key === "projectProgress") {
          // If project progress is 60%, neural model cannot claim 100% or "concluído integralmente"
          if (factNum < 100 && (text.includes("100% pronto") || text.includes("completamente concluído") || text.includes("totalmente pronto"))) {
            rejectedReasons.push(
              `FactLock Violation: Project is at ${factNum}% progress, but text claimed 100% completion.`
            );
          }
        }
      }
    }

    // 2. Reject False Operational Execution Claims
    if (intent.mode !== "EXECUTION_REPORT") {
      const falseExecutionPhrases = [
        "já criei a tarefa",
        "tarefa criada com sucesso",
        "projeto excluído com sucesso",
        "já apaguei o arquivo",
        "renderização concluída com sucesso",
      ];

      for (const phrase of falseExecutionPhrases) {
        if (text.includes(phrase)) {
          rejectedReasons.push(
            `FactLock Violation: Response claimed operational execution ('${phrase}') without execution authority.`
          );
        }
      }
    }

    return {
      isValid: rejectedReasons.length === 0,
      rejectedReasons,
    };
  }
}
