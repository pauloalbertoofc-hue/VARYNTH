import type { ExperienceContext } from "@/lib/experience/context-builder";
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

type ExperienceAwareContext = Pick<AthenaContext, "experienceContext" | "activeProject">;

export function confirmedAgentGuidance<K extends AgentGuidanceKey>(
  context: ExperienceAwareContext,
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

export function agentGuidanceInstruction(context: ExperienceAwareContext, agentId: string, prompt: string): string[] {
  const guidance: string[] = [];
  const verbosity = confirmedAgentGuidance(context, agentId, "verbosity", prompt);
  const formality = confirmedAgentGuidance(context, agentId, "formality", prompt);
  if (verbosity) guidance.push(verbosity === "concise" ? "Prefira uma resposta concisa, sem omitir ressalvas essenciais." : "Desenvolva a resposta com explicação e etapas suficientes, sem repetir ideias.");
  if (formality) guidance.push(formality === "formal" ? "Use registro formal, mantendo clareza e naturalidade." : "Use registro informal respeitoso, sem perder precisão.");
  return guidance;
}

/**
 * Convert only positively useful, properly scoped past outcomes into a bounded
 * method hint. Experience is precedent, not evidence about the current task.
 */
export function relevantExperienceGuidance(context: ExperienceAwareContext, agentId: string): string[] {
  const records = (context.experienceContext?.experiences ?? []).filter((record) => {
    if (!record.outcome.trim() || !record.action.trim() || (record.usefulness ?? 0) <= 0) return false;
    if (record.scope === "GLOBAL") return true;
    if (record.scope === "AGENT") return record.scopeId === agentId;
    if (record.scope === "DOMAIN") {
      return record.scopeId === record.domain || record.domain === agentId || record.scopeId === agentId;
    }
    if (record.scope === "PROJECT") {
      const projectId = context.activeProject?.id;
      return !!projectId && record.scopeId === projectId;
    }
    return false;
  }).slice(0, 2);

  return records.map((record) =>
    `Em experiências anteriores, mostrou-se útil: ${record.action.slice(0, 120)}. Isto não é fato sobre este caso; considere apenas como hipótese metodológica, valide-a no contexto atual e descarte-a se conflitar com seu pedido.`
  );
}

/** Read only explicit confirmed communication preferences for this agent. */
export function confirmedCommunicationGuidance(context: ExperienceAwareContext, agentId: string, prompt: string): string[] {
  const guidance: string[] = [];
  const explicitFormality = /\b(formal|informal|descontra[ií]d[oa]|casual)\b/i.test(prompt);
  const explicitVerbosity = /\b(curto|breve|concis[oa]|resumid[oa]|detalhad[oa]|detalhes|passo a passo)\b/i.test(prompt);
  for (const preference of [...(context.experienceContext?.preferences ?? [])].reverse()) {
    if (preference.status !== "CONFIRMED" || preference.source !== "MANUAL") continue;
    const applies = preference.scope === "AGENT" && preference.scopeId === agentId
      || preference.scope === "GLOBAL" && (preference.domain === "communication" || preference.domain === "communication-style");
    if (!applies) continue;
    const key = preference.key.toLowerCase();
    const value = typeof preference.value === "string" ? preference.value.trim().toLowerCase() : "";
    if (key === "formality" && !explicitFormality && ["formal", "informal"].includes(value)) {
      guidance.push(value === "formal" ? "Use registro formal, mantendo clareza e naturalidade." : "Use registro informal respeitoso, sem perder precisão.");
    }
    if (key === "verbosity" && !explicitVerbosity && ["concise", "detailed"].includes(value)) {
      guidance.push(value === "concise" ? "Prefira uma resposta concisa, sem omitir ressalvas essenciais." : "Desenvolva a resposta com explicação suficiente, sem repetir ideias.");
    }
  }
  return [...new Set(guidance)];
}

export function formatExperienceMethodHints(hints: string[]): string {
  return hints.length
    ? `\n\n**Abordagem que pode valer testar:** ${hints.join(" ")}`
    : "";
}
