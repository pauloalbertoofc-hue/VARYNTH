export type ExecutionBudgetTier = "QUICK" | "STANDARD" | "DEEP";

export interface ExecutionBudget {
  tier: ExecutionBudgetTier;
  maxReflectionRounds: number;
  allowCouncilDeliberation: boolean;
  maxToolCalls: number;
  requiresStrictValidation: boolean;
}

export const BUDGET_CONFIGS: Record<ExecutionBudgetTier, ExecutionBudget> = {
  QUICK: {
    tier: "QUICK",
    maxReflectionRounds: 0,
    allowCouncilDeliberation: false,
    maxToolCalls: 2,
    requiresStrictValidation: false,
  },
  STANDARD: {
    tier: "STANDARD",
    maxReflectionRounds: 1,
    allowCouncilDeliberation: true,
    maxToolCalls: 5,
    requiresStrictValidation: true,
  },
  DEEP: {
    tier: "DEEP",
    maxReflectionRounds: 3,
    allowCouncilDeliberation: true,
    maxToolCalls: 12,
    requiresStrictValidation: true,
  },
};

