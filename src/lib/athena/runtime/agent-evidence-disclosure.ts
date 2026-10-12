import type { AgentResult } from "../domain/result";

const MAX_DISCLOSURE_ITEMS = 8;
const MAX_DISCLOSURE_CHARS = 240;

function safeTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const text = entry
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_DISCLOSURE_CHARS);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
    if (result.length >= MAX_DISCLOSURE_ITEMS) break;
  }
  return result;
}

function safeConfidence(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : undefined;
}

/** Small, bounded, content-free projection for Athena's user-visible evidence disclosure. */
function safePersonaDisclosure(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const persona = value as Record<string, unknown>;
  const [identity, approach, evidenceBoundary, authorityBoundary] = [persona.identity, persona.approach, persona.evidenceBoundary, persona.authorityBoundary].map((item) => safeTextList([item])[0]);
  if (!identity || !approach || !evidenceBoundary || !authorityBoundary) return undefined;
  return { identity, approach, evidenceBoundary, authorityBoundary };
}

export function projectAgentEvidenceDisclosure(result: Pick<AgentResult, "confidence" | "sources" | "limitations"> & { personaDisclosure?: unknown }) {
  const persona = safePersonaDisclosure(result.personaDisclosure);
  return {
    confidence: safeConfidence(result.confidence),
    sources: safeTextList(result.sources),
    limitations: safeTextList(result.limitations),
    ...(persona ? { persona } : {}),
  };
}

export interface ReadAgentEvidenceDisclosure {
  agentName: string;
  success: boolean;
  accepted?: boolean;
  confidence?: number;
  sources: string[];
  limitations: string[];
  persona?: { identity: string; approach: string; evidenceBoundary: string; authorityBoundary: string };
}

/** Validates stored message metadata before displaying the disclosure in the UI. */
export function readAgentEvidenceDisclosure(metadata: unknown): ReadAgentEvidenceDisclosure | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const root = metadata as Record<string, unknown>;
  const execution = root.agentExecution;
  if (!execution || typeof execution !== "object") return undefined;
  const agent = execution as Record<string, unknown>;
  if (typeof agent.agentName !== "string" || !agent.agentName.trim() || typeof agent.success !== "boolean") return undefined;
  const validation = root.specialistResponseValidation;
  const accepted = validation && typeof validation === "object" && typeof (validation as Record<string, unknown>).accepted === "boolean"
    ? (validation as Record<string, unknown>).accepted as boolean
    : undefined;
  const persona = safePersonaDisclosure(agent.persona);
  return {
    agentName: agent.agentName.trim().slice(0, 80),
    success: agent.success,
    ...(accepted !== undefined ? { accepted } : {}),
    ...(safeConfidence(agent.confidence) !== undefined ? { confidence: safeConfidence(agent.confidence) } : {}),
    sources: safeTextList(agent.sources),
    limitations: safeTextList(agent.limitations),
    ...(persona ? { persona } : {}),
  };
}
