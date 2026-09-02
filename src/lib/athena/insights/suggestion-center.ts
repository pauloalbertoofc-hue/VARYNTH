import type { AthenaEngineContext } from "../engine";
import { analyzeAthenaState, type AthenaFinding } from "./global-intelligence";

export type SuggestionStatus = "ativa" | "adiada" | "ignorada" | "aceita";

export interface AthenaSuggestion extends AthenaFinding {
  id: string;
  status: SuggestionStatus;
  createdAt: string;
  updatedAt: string;
  snoozedUntil?: string;
}

interface SuggestionDecision {
  status: SuggestionStatus;
  updatedAt: string;
  snoozedUntil?: string;
}

const STORAGE_KEY = "varynth_athena_suggestion_decisions_v1";
let fallback: Record<string, SuggestionDecision> = {};

function read(): Record<string, SuggestionDecision> {
  if (typeof window === "undefined" || !window.localStorage) return { ...fallback };
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function write(value: Record<string, SuggestionDecision>): void {
  fallback = { ...value };
  if (typeof window !== "undefined" && window.localStorage) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* armazenamento indisponível */ }
  }
}

function stableId(finding: AthenaFinding): string {
  const input = `${finding.label}|${finding.detail}|${finding.projectId || "global"}`;
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  return `suggestion-${Math.abs(hash)}`;
}

export class AthenaSuggestionCenter {
  list(ctx: AthenaEngineContext, now = new Date()): AthenaSuggestion[] {
    const decisions = read();
    return analyzeAthenaState(ctx, undefined, now).findings.map((finding) => {
      const id = stableId(finding);
      const decision = decisions[id];
      const snoozeExpired = decision?.status === "adiada" && decision.snoozedUntil && new Date(decision.snoozedUntil).getTime() <= now.getTime();
      const status = snoozeExpired ? "ativa" : decision?.status || "ativa";
      return { ...finding, id, status, createdAt: decision?.updatedAt || now.toISOString(), updatedAt: decision?.updatedAt || now.toISOString(), snoozedUntil: snoozeExpired ? undefined : decision?.snoozedUntil };
    });
  }

  setStatus(id: string, status: SuggestionStatus, snoozedUntil?: string): void {
    const decisions = read();
    decisions[id] = { status, updatedAt: new Date().toISOString(), snoozedUntil };
    write(decisions);
  }

  clearForTests(): void {
    fallback = {};
    if (typeof window !== "undefined" && window.localStorage) localStorage.removeItem(STORAGE_KEY);
  }
}

export const athenaSuggestionCenter = new AthenaSuggestionCenter();
