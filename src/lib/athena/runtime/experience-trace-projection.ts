import type { AgentExperienceTrace, AgentResult } from "../domain/result";

export interface AgentExperienceTraceEntry {
  agentId: string;
  agentName: string;
  trace: AgentExperienceTrace;
}

function ids(value: unknown, limit = 24): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= 160))].slice(0, limit);
}

/** Projects only bounded identifiers and precedence; response or memory text never crosses this boundary. */
export function projectAgentExperienceTraces(results: readonly AgentResult[]): AgentExperienceTraceEntry[] {
  return results.flatMap((result): AgentExperienceTraceEntry[] => {
    const raw = result.metadata?.experienceTrace;
    if (!raw || typeof raw !== "object") return [];
    const candidate = raw as Partial<AgentExperienceTrace>;
    if (candidate.instructionPrecedence !== "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION") return [];
    return [{
      agentId: result.agentId,
      agentName: result.agentName,
      trace: {
        agentId: result.agentId,
        retrievedPreferenceIds: ids(candidate.retrievedPreferenceIds),
        retrievedExperienceIds: ids(candidate.retrievedExperienceIds),
        experienceIdsReferencedInResponse: ids(candidate.experienceIdsReferencedInResponse),
        evidenceEventIdsReferencedInResponse: ids(candidate.evidenceEventIdsReferencedInResponse),
        instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION",
      },
    }];
  });
}
