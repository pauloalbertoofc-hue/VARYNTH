import type {
  ConfidenceLevel,
  InteractionType,
  ParsedCognitiveContext,
} from "./conversation";
import { CURRENT_INTERACTION_CONTRACT_VERSION } from "./contract-versions";

export type InteractionContract = "ANSWER_SELF" | "USE_AGENT" | "USE_TOOL";

export interface InteractionContractCapabilities {
  mayAnswerDirectly: boolean;
  mayUseAgent: boolean;
  mayUseTool: boolean;
  mayMutateState: boolean;
}

export interface InteractionContractDecision {
  version: number;
  contract: InteractionContract;
  sourceInteractionType: InteractionType;
  reason: string;
  confidence: ConfidenceLevel;
  capabilities: Readonly<InteractionContractCapabilities>;
}

export interface InteractionContractTelemetry {
  version: number;
  contract: InteractionContract;
  sourceInteractionType: InteractionType;
  executor: InteractionContract;
  status: "ROUTED" | "COMPLETED" | "SKIPPED" | "FAILED";
  reason: string;
  timestamp: string;
}

const CONTRACT_BY_INTERACTION: Readonly<Record<InteractionType, InteractionContract>> = {
  CONVERSATION: "ANSWER_SELF",
  FACTUAL_QUERY: "ANSWER_SELF",
  COGNITIVE_REQUEST: "USE_AGENT",
  OPERATIONAL_REQUEST: "USE_TOOL",
};

const CAPABILITIES: Readonly<Record<InteractionContract, Readonly<InteractionContractCapabilities>>> = {
  ANSWER_SELF: Object.freeze({
    mayAnswerDirectly: true,
    mayUseAgent: false,
    mayUseTool: false,
    mayMutateState: false,
  }),
  USE_AGENT: Object.freeze({
    mayAnswerDirectly: false,
    mayUseAgent: true,
    mayUseTool: false,
    mayMutateState: false,
  }),
  USE_TOOL: Object.freeze({
    mayAnswerDirectly: false,
    mayUseAgent: false,
    mayUseTool: true,
    mayMutateState: true,
  }),
};

export function interactionContractFor(type: InteractionType): InteractionContract {
  return CONTRACT_BY_INTERACTION[type];
}

export function decisionForContract(
  contract: InteractionContract,
  reason: string,
  confidence: ConfidenceLevel = "HIGH"
): InteractionContractDecision {
  const sourceInteractionType: InteractionType =
    contract === "ANSWER_SELF" ? "FACTUAL_QUERY" :
    contract === "USE_AGENT" ? "COGNITIVE_REQUEST" :
    "OPERATIONAL_REQUEST";

  return Object.freeze({
    version: CURRENT_INTERACTION_CONTRACT_VERSION,
    contract,
    sourceInteractionType,
    reason,
    confidence,
    capabilities: CAPABILITIES[contract],
  });
}

export function resolveInteractionContract(
  parsed: Pick<ParsedCognitiveContext, "interactionType" | "intents" | "confidence" | "requiresAction">
): InteractionContractDecision {
  const contract = interactionContractFor(parsed.interactionType);
  const expectedAction = contract === "USE_TOOL";

  if (parsed.requiresAction !== expectedAction) {
    throw new Error(
      `[ATHENA_CONTRACT_MISMATCH] ${parsed.interactionType} resolved to ${contract}, ` +
      `but requiresAction=${parsed.requiresAction}.`
    );
  }

  const intentSummary = parsed.intents.length > 0 ? parsed.intents.join(", ") : "no explicit intent";
  return Object.freeze({
    version: CURRENT_INTERACTION_CONTRACT_VERSION,
    contract,
    sourceInteractionType: parsed.interactionType,
    reason: `${parsed.interactionType}: ${intentSummary}`,
    confidence: parsed.confidence,
    capabilities: CAPABILITIES[contract],
  });
}

export function assertInteractionContract(
  decision: InteractionContractDecision,
  expected: InteractionContract
): void {
  if (decision.version !== CURRENT_INTERACTION_CONTRACT_VERSION) {
    throw new Error(`[ATHENA_CONTRACT_VERSION_UNSUPPORTED] ${decision.version}`);
  }
  if (decision.contract !== expected) {
    throw new Error(
      `[ATHENA_CONTRACT_VIOLATION] Expected ${expected}, received ${decision.contract} ` +
      `from ${decision.sourceInteractionType}.`
    );
  }

  const canonical = CAPABILITIES[expected];
  const provided = decision.capabilities;
  if (
    provided.mayAnswerDirectly !== canonical.mayAnswerDirectly ||
    provided.mayUseAgent !== canonical.mayUseAgent ||
    provided.mayUseTool !== canonical.mayUseTool ||
    provided.mayMutateState !== canonical.mayMutateState
  ) {
    throw new Error(
      `[ATHENA_CONTRACT_CAPABILITY_VIOLATION] ${expected} received non-canonical capabilities.`
    );
  }
}
