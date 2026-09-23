import type { Preference } from "./contracts";
import type { ResponseIntent } from "@/lib/athena/strategy/types";
import { normalizeText } from "@/lib/athena/conversation/conversation-manager";

type StyleKey = "verbosity" | "formality";
type StyleValue = "concise" | "detailed" | "formal" | "informal";

const styleValues: Record<StyleKey, readonly StyleValue[]> = {
  verbosity: ["concise", "detailed"],
  formality: ["formal", "informal"],
};

function currentPromptOverrides(prompt: string, key: StyleKey): boolean {
  const text = normalizeText(prompt);
  if (key === "verbosity") {
    return /\b(seja|responda|explique|fale|quero)\b.{0,35}\b(curto|breve|concis[oa]|resumid[oa]|detalhad[oa]|com detalhes|em detalhes|passo a passo)\b/.test(text)
      || /\b(sem detalhes|mais detalhes|mais conciso|mais breve)\b/.test(text);
  }
  return /\b(seja|fale|responda|escreva)\b.{0,35}\b(formal|informal|descontraid[oa]|casual)\b/.test(text);
}

export function applyConfirmedCommunicationStyle(
  intent: ResponseIntent,
  preferences: Preference[],
  prompt: string,
): ResponseIntent {
  const selected: Partial<Record<StyleKey, StyleValue>> = {};
  for (const preference of preferences) {
    if (preference.status !== "CONFIRMED" || preference.source !== "MANUAL") continue;
    if (preference.domain !== "communication" && preference.domain !== "communication-style") continue;
    const key = preference.key.toLowerCase() as StyleKey;
    if (!styleValues[key] || currentPromptOverrides(prompt, key)) continue;
    if (typeof preference.value !== "string") continue;
    const value = preference.value.trim().toLowerCase() as StyleValue;
    if (!styleValues[key].includes(value)) continue;
    selected[key] = value;
  }

  return {
    ...intent,
    ...(selected.verbosity && intent.mode !== "CLARIFICATION" && intent.mode !== "EXECUTION_REPORT"
      ? { verbosity: selected.verbosity === "concise" ? "SHORT" as const : "DETAILED" as const }
      : {}),
    ...(selected.formality ? { tone: selected.formality === "formal" ? "TECHNICAL" as const : "WARM" as const } : {}),
  };
}
