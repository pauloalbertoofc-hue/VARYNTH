export const CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION = 2 as const;
export const MIN_SUPPORTED_CAPABILITY_PLAN_SCHEMA_VERSION = 1 as const;
export const CURRENT_INTERACTION_CONTRACT_VERSION = 1 as const;
export const CURRENT_TOOL_CONTRACT_VERSION = 1 as const;

export function isSupportedPlanSchemaVersion(version: number): boolean {
  return Number.isInteger(version)
    && version >= MIN_SUPPORTED_CAPABILITY_PLAN_SCHEMA_VERSION
    && version <= CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION;
}
