import { athenaObservabilityJournal } from "../observability/local-observability-journal";

export type AdjustableGuardrail = "serializePlanOperations" | "rejectDuplicateConfirmations";

export interface AthenaGuardrailSettings {
  serializePlanOperations: boolean;
  rejectDuplicateConfirmations: boolean;
}

export const REQUIRED_GUARDRAILS = Object.freeze([
  "Permissões e confirmações sensíveis",
  "Fronteira única do ToolManager",
  "Isolamento entre sessão e projeto",
  "Rejeição de versões incompatíveis",
]);

const STORAGE_KEY = "varynth_athena_guardrails_v1";
const STORAGE_EVENT = "varynth_athena_guardrails_updated";
const DEFAULTS: Readonly<AthenaGuardrailSettings> = Object.freeze({
  serializePlanOperations: true,
  rejectDuplicateConfirmations: true,
});
let fallbackSettings: AthenaGuardrailSettings = { ...DEFAULTS };

function read(): AthenaGuardrailSettings {
  try {
    const raw = typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : undefined;
    const parsed = raw ? JSON.parse(raw) as Partial<AthenaGuardrailSettings> : fallbackSettings;
    return {
      serializePlanOperations: parsed.serializePlanOperations !== false,
      rejectDuplicateConfirmations: parsed.rejectDuplicateConfirmations !== false,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export class AthenaGuardrailPolicy {
  get(): AthenaGuardrailSettings {
    return read();
  }

  isEnabled(guardrail: AdjustableGuardrail): boolean {
    return this.get()[guardrail];
  }

  set(guardrail: AdjustableGuardrail, enabled: boolean): AthenaGuardrailSettings {
    const next = { ...this.get(), [guardrail]: enabled };
    fallbackSettings = next;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent?.(new CustomEvent(STORAGE_EVENT));
      }
    } catch {
      // The in-memory setting remains active for the current local session.
    }
    athenaObservabilityJournal.record({
      category: "SECURITY",
      type: enabled ? "GUARDRAIL_ENABLED" : "GUARDRAIL_DISABLED",
      status: "INFO",
      message: `${guardrail}: ${enabled ? "ativada" : "desativada"} localmente pelo usuário.`,
      details: { guardrail, enabled, scope: "adjustable", requiredGuardrailsUnaffected: true },
    });
    return next;
  }

  reset(): AthenaGuardrailSettings {
    fallbackSettings = { ...DEFAULTS };
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent?.(new CustomEvent(STORAGE_EVENT));
      }
    } catch {}
    return { ...DEFAULTS };
  }
}

export const athenaGuardrailPolicy = new AthenaGuardrailPolicy();
