import type { AthenaContext } from "../domain/context";
import type { Preference } from "@/lib/experience/contracts";

export type AgentGuidanceKey = "verbosity" | "formality" | "ideationMode" | "planningDetail" | "critiqueLens" | "creativeStyle";

const allowedValues: Record<string, readonly string[]> = {
  verbosity: ["concise", "detailed"],
  formality: ["formal", "informal"],
  ideationMode: ["practical", "divergent", "narrative"],
  planningDetail: ["minimal", "stepwise"],
  critiqueLens: ["evidence", "logic", "usability", "risk"],
  creativeStyle: ["sensory", "playful", "minimal", "experimental"],
};

const currentInstructionSignals: Record<AgentGuidanceKey, RegExp> = {
  verbosity: /\b(curto|breve|concis[oa]|resumid[oa]|detalhad[oa]|detalhes|passo a passo)\b/i,
  formality: /\b(formal|informal|descontra[ií]d[oa]|casual)\b/i,
  ideationMode: /\b(pr[aá]tico|divergente|narrativo|hist[oó]ria)\b/i,
  planningDetail: /\b(resumido|s[oó] os passos|passo a passo|detalhado)\b/i,
  critiqueLens: /\b(evid[eê]ncia|l[oó]gica|usabilidade|risco|riscos)\b/i,
  creativeStyle: /\b(sensorial|l[uú]dico|minimalista|experimental)\b/i,
};

function guidanceValueIsAllowed(key: AgentGuidanceKey, value: unknown): boolean {
  return typeof value === "string" && (allowedValues[key] || []).includes(value.trim().toLowerCase());
}

function isEligible(preference: Preference, agentId: string, key: AgentGuidanceKey): boolean {
  if (preference.status !== "CONFIRMED" || preference.source !== "MANUAL") return false;
  if (preference.scope === "GLOBAL") {
    if (preference.domain === "communication" || preference.domain === "communication-style") return (key as string) === "verbosity" || (key as string) === "formality";
    return false;
  }
  if (preference.scope === "AGENT") return preference.scopeId === agentId;
  return preference.domain === agentId || preference.domain === `agent.${agentId}`;
}

export function confirmedAgentGuidance<K extends AgentGuidanceKey>(
  context: AthenaContext,
  agentId: string,
  key: K,
  prompt: string,
): (typeof allowedValues)[K][number] | undefined {
  if (currentInstructionSignals[key].test(prompt)) return undefined;
  for (const item of [...(context.experienceContext?.preferences ?? [])].reverse()) {
    if (!isEligible(item, agentId, key) || item.key.toLowerCase() !== (key as string).toLowerCase()) continue;
    const value = item.value;
    if (guidanceValueIsAllowed(key, value)) return (value as string).trim().toLowerCase() as (typeof allowedValues)[K][number];
  }
  return undefined;
}

export function agentGuidanceInstruction(context: AthenaContext, agentId: string, prompt: string): string[] {
  const guidance: string[] = [];
  const verbosity = confirmedAgentGuidance(context, agentId, "verbosity", prompt);
  const formality = confirmedAgentGuidance(context, agentId, "formality", prompt);
  if (verbosity) guidance.push(verbosity === "concise" ? "Prefira uma resposta concisa, sem omitir ressalvas essenciais." : "Desenvolva a resposta com explicação e etapas suficientes, sem repetir ideias.");
  if (formality) guidance.push(formality === "formal" ? "Use registro formal, mantendo clareza e naturalidade." : "Use registro informal respeitoso, sem perder precisão.");
  return guidance;
}
