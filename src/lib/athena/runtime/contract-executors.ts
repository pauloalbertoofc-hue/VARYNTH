import type {
  InteractionContract,
  InteractionContractDecision,
} from "../domain/interaction-contract";
import { assertInteractionContract } from "../domain/interaction-contract";

export interface ContractExecutor {
  readonly contract: InteractionContract;
  execute<T>(decision: InteractionContractDecision, operation: () => T): T;
  executeAsync<T>(decision: InteractionContractDecision, operation: () => Promise<T>): Promise<T>;
}

class GuardedContractExecutor implements ContractExecutor {
  constructor(readonly contract: InteractionContract) {}

  execute<T>(decision: InteractionContractDecision, operation: () => T): T {
    assertInteractionContract(decision, this.contract);
    return operation();
  }

  async executeAsync<T>(decision: InteractionContractDecision, operation: () => Promise<T>): Promise<T> {
    assertInteractionContract(decision, this.contract);
    return operation();
  }
}

export const answerSelfExecutor = new GuardedContractExecutor("ANSWER_SELF");
export const useAgentExecutor = new GuardedContractExecutor("USE_AGENT");
export const useToolExecutor = new GuardedContractExecutor("USE_TOOL");

export const contractExecutors: Readonly<Record<InteractionContract, ContractExecutor>> = Object.freeze({
  ANSWER_SELF: answerSelfExecutor,
  USE_AGENT: useAgentExecutor,
  USE_TOOL: useToolExecutor,
});

