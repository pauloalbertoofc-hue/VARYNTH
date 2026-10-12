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

const agentDomainAliases: Record<string, readonly string[]> = {
  sophia: ["writing", "documents", "document"],
  musa: ["creative", "creativity", "ideation"],
  strategos: ["planning", "productivity", "workflow"],
  critias: ["critique", "review", "validation"],
  logos: ["research", "science", "scientific-methodology"],
  justitia: ["legal", "law"],
  "curador-pesquisa": ["research", "science"],
  mnemosyne: ["memory", "knowledge-graph"],
  bibliotecario: ["knowledge-management", "library"],
  archivist: ["documentation", "architecture"],
  euterpe: ["music", "audio", "voice", "mixing"],
  "music-curator": ["music", "audio"],
};

function experienceMatchesAgentDomain(domain: string, agentId: string, activeDomain?: string): boolean {
  const normalizedDomain = domain.trim().toLowerCase();
  const aliases = [agentId, ...(agentDomainAliases[agentId] || []), ...(activeDomain ? [activeDomain] : [])]
    .map((value) => value.trim().toLowerCase());
  return aliases.includes(normalizedDomain);
}

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
function suppressHistoricalGuidance(instruction: string): boolean {
  const normalized = instruction.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(?:nao\s+(?:use|considere|aplique|consulte)|sem|ignore|desconsidere)\b.{0,80}\b(?:experien|historico|memoria|preferenc|personaliz)\w*/i.test(normalized);
}

export function relevantExperienceGuidance(
  context: ExperienceAwareContext,
  agentId: string,
  activeArtifactId?: string,
  activeDomain?: string,
  currentInstruction = "",
): string[] {
  if (suppressHistoricalGuidance(currentInstruction)) return [];
  const records = (context.experienceContext?.experiences ?? []).filter((record) => {
    if (!record.outcome.trim() || !record.action.trim() || (record.usefulness ?? 0) <= 0) return false;
    if (record.scope === "GLOBAL") return experienceMatchesAgentDomain(record.domain, agentId, activeDomain);
    if (record.scope === "AGENT") return record.scopeId === agentId;
    if (record.scope === "DOMAIN") {
      return experienceMatchesAgentDomain(record.domain, agentId, activeDomain)
        || (!!activeDomain && record.scopeId?.trim().toLowerCase() === activeDomain.trim().toLowerCase());
    }
    if (record.scope === "PROJECT") {
      const projectId = context.activeProject?.id;
      return !!projectId && record.scopeId === projectId;
    }
    if (record.scope === "ARTIFACT") return !!activeArtifactId && record.scopeId === activeArtifactId;
    return false;
  }).slice(0, 2);

  return records.map((record) =>
    `Em experiências anteriores, mostrou-se útil: ${record.action.slice(0, 120)}. Isto não é fato sobre este caso; considere apenas como hipótese metodológica, valide-a no contexto atual e descarte-a se conflitar com seu pedido.`
  );
}

/** Shared, per-agent method hints for specialists that do not author their own guidance. */
export function specialistExperienceGuidance(
  context: ExperienceAwareContext,
  agentId: string,
  currentInstruction: string,
): string[] {
  if (!isExperienceSeekingRequest(currentInstruction)) return [];
  return relevantExperienceGuidance(context, agentId, undefined, agentId, currentInstruction).slice(0, 2);
}

/** Past outcomes are useful as method precedents, never as unsolicited facts. */
export function isExperienceSeekingRequest(prompt: string): boolean {
  const normalized = prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (suppressHistoricalGuidance(prompt)) return false;
  return /\b(ideia|ideias|brainstorm|sugira|sugestao|sugestoes|recomende|recomendacao|recomendacoes|planeje|planejamento|estrategia|proponha|crie uma proposta|como posso|como poderiamos)\b/.test(normalized);
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
