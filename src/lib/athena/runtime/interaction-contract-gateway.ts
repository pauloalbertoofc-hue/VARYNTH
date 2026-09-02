import type {
  InteractionContractDecision,
  InteractionContractTelemetry,
} from "../domain/interaction-contract";
import { contractExecutors } from "./contract-executors";
import { athenaObservabilityJournal } from "../observability/local-observability-journal";

const TELEMETRY_LIMIT = 200;

export class InteractionContractGateway {
  private telemetry: InteractionContractTelemetry[] = [];

  execute<T>(decision: InteractionContractDecision, operation: () => T): T {
    this.record(decision, "ROUTED");
    try {
      const result = contractExecutors[decision.contract].execute(decision, operation);
      this.record(decision, result === undefined ? "SKIPPED" : "COMPLETED");
      return result;
    } catch (error) {
      this.record(decision, "FAILED");
      throw error;
    }
  }

  async executeAsync<T>(decision: InteractionContractDecision, operation: () => Promise<T>): Promise<T> {
    this.record(decision, "ROUTED");
    try {
      const result = await contractExecutors[decision.contract].executeAsync(decision, operation);
      this.record(decision, result === undefined ? "SKIPPED" : "COMPLETED");
      return result;
    } catch (error) {
      this.record(decision, "FAILED");
      throw error;
    }
  }

  recentTelemetry(): readonly InteractionContractTelemetry[] {
    return this.telemetry.map((entry) => ({ ...entry }));
  }

  clearTelemetry(): void {
    this.telemetry = [];
  }

  private record(
    decision: InteractionContractDecision,
    status: InteractionContractTelemetry["status"]
  ): void {
    this.telemetry.push({
      contract: decision.contract,
      sourceInteractionType: decision.sourceInteractionType,
      executor: decision.contract,
      status,
      reason: decision.reason,
      timestamp: new Date().toISOString(),
    });
    athenaObservabilityJournal.record({
      category: "CONTRACT",
      type: `CONTRACT_${status}`,
      status: status === "SKIPPED" ? "INFO" : status,
      contract: decision.contract,
      message: decision.reason,
      details: {
        sourceInteractionType: decision.sourceInteractionType,
        executor: decision.contract,
        confidence: decision.confidence,
      },
    });
    if (this.telemetry.length > TELEMETRY_LIMIT) this.telemetry.shift();
  }
}

export const athenaInteractionContractGateway = new InteractionContractGateway();
