import type { ParsedCognitiveContext } from "../domain/conversation";
import {
  assertInteractionContract,
  InteractionContract,
  InteractionContractDecision,
  resolveInteractionContract,
} from "../domain/interaction-contract";

/** Canonical gateway between semantic interpretation and execution ownership. */
export class InteractionContractRouter {
  route(parsed: ParsedCognitiveContext): InteractionContractDecision {
    return resolveInteractionContract(parsed);
  }

  require(decision: InteractionContractDecision, expected: InteractionContract): void {
    assertInteractionContract(decision, expected);
  }
}

export const athenaInteractionContractRouter = new InteractionContractRouter();

