import type { InteractionContract } from "../domain/interaction-contract";
import type { AthenaEvent } from "../events/event-bus";
import { athenaEventBus } from "../events/event-bus";

export type ObservabilityCategory = "CONTRACT" | "PLAN" | "TOOL" | "AGENT" | "SECURITY" | "SYSTEM";
export type ObservabilityStatus = "INFO" | "ROUTED" | "COMPLETED" | "BLOCKED" | "FAILED" | "REVERTED";

export interface LocalObservabilityEntry {
  id: string;
  timestamp: string;
  category: ObservabilityCategory;
  type: string;
  status: ObservabilityStatus;
  message: string;
  contract?: InteractionContract;
  sessionId?: string;
  projectId?: string;
  taskId?: string;
  planId?: string;
  stepId?: string;
  capabilityId?: string;
  durationMs?: number;
  details?: Record<string, unknown>;
}

export interface ObservabilityDiagnostic {
  total: number;
  completed: number;
  failed: number;
  blocked: number;
  reversals: number;
  retries: number;
  averageDurationMs: number;
  byContract: Record<InteractionContract, number>;
}

const STORAGE_KEY = "varynth_athena_observability_v1";
const STORAGE_EVENT = "varynth_athena_observability_updated";
const RETENTION_LIMIT = 300;
let fallbackStorage = "[]";
const SENSITIVE_KEY = /(token|secret|password|authorization|cookie|content|rawprompt)/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (typeof value === "string") {
    const redacted = value
      .replace(/\btoken-[a-z0-9-]+\b/gi, "[REDACTED_TOKEN]")
      .replace(/\bBearer\s+[^\s]+/gi, "Bearer [REDACTED]");
    return redacted.length > 240 ? `${redacted.slice(0, 240)}…` : redacted;
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SENSITIVE_KEY.test(key))
      .slice(0, 30)
      .map(([key, item]) => [key, sanitize(item, depth + 1)])
  );
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function categoryFor(type: string): ObservabilityCategory {
  if (type.includes("PERMISSION") || type.includes("CONFIRMATION") || type.includes("DENIED")) return "SECURITY";
  if (type.includes("AGENT")) return "AGENT";
  if (type.includes("ACTION") || type.includes("TOOL")) return "TOOL";
  if (type.includes("PLAN") || type.includes("STEP") || type.includes("WORKFLOW") || type.includes("EXECUTION")) return "PLAN";
  return "SYSTEM";
}

function statusFor(type: string, payload: Record<string, unknown>): ObservabilityStatus {
  if (type.includes("FAILED") || type.includes("ERROR") || payload.success === false) return "FAILED";
  if (type.includes("BLOCKED") || type.includes("DENIED") || type.includes("REQUIRED")) return "BLOCKED";
  if (type.includes("COMPLETED") || type.includes("EXECUTED") || payload.success === true) return "COMPLETED";
  return "INFO";
}

export class LocalObservabilityJournal {
  private entries: LocalObservabilityEntry[] = [];

  constructor() {
    this.reload();
  }

  record(input: Omit<LocalObservabilityEntry, "id" | "timestamp"> & { id?: string; timestamp?: string }): LocalObservabilityEntry {
    const entry: LocalObservabilityEntry = {
      ...input,
      id: input.id || `obs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: input.timestamp || new Date().toISOString(),
      message: sanitize(input.message) as string,
      details: input.details ? sanitize(input.details) as Record<string, unknown> : undefined,
    };
    this.entries = [...this.entries, entry].slice(-RETENTION_LIMIT);
    this.persist();
    return clone(entry);
  }

  captureEvent(event: AthenaEvent): void {
    const payload = sanitize(event.payload) as Record<string, unknown>;
    this.record({
      timestamp: event.timestamp,
      category: categoryFor(event.type),
      type: event.type,
      status: statusFor(event.type, payload || {}),
      message: this.explainEvent(event.type, payload || {}),
      taskId: event.taskId,
      stepId: typeof payload?.stepId === "string" ? payload.stepId : undefined,
      capabilityId: typeof payload?.toolName === "string" ? payload.toolName : typeof payload?.agentId === "string" ? payload.agentId : undefined,
      details: payload,
    });
  }

  list(filters: Partial<Pick<LocalObservabilityEntry, "category" | "status" | "contract" | "planId" | "projectId">> = {}): LocalObservabilityEntry[] {
    return this.entries.filter((entry) => Object.entries(filters).every(([key, value]) => !value || entry[key as keyof LocalObservabilityEntry] === value)).map(clone).reverse();
  }

  diagnose(): ObservabilityDiagnostic {
    const durations = this.entries.map((entry) => entry.durationMs).filter((value): value is number => typeof value === "number");
    return {
      total: this.entries.length,
      completed: this.entries.filter((entry) => entry.status === "COMPLETED").length,
      failed: this.entries.filter((entry) => entry.status === "FAILED").length,
      blocked: this.entries.filter((entry) => entry.status === "BLOCKED").length,
      reversals: this.entries.filter((entry) => entry.status === "REVERTED" || entry.type.includes("REVERT")).length,
      retries: this.entries.filter((entry) => entry.type.includes("RETRY")).length,
      averageDurationMs: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
      byContract: {
        ANSWER_SELF: this.entries.filter((entry) => entry.contract === "ANSWER_SELF").length,
        USE_AGENT: this.entries.filter((entry) => entry.contract === "USE_AGENT").length,
        USE_TOOL: this.entries.filter((entry) => entry.contract === "USE_TOOL").length,
      },
    };
  }

  explain(entry: LocalObservabilityEntry): string {
    if (entry.status === "BLOCKED") return `${entry.message} A execução foi interrompida antes de ampliar autoridade ou iniciar uma etapa insegura.`;
    if (entry.status === "FAILED") return `${entry.message} O erro foi preservado no journal local para diagnóstico e repetição controlada.`;
    if (entry.contract) return `${entry.contract} foi escolhido porque ${entry.message.toLowerCase()}`;
    return entry.message;
  }

  exportSanitized(): string {
    return JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), retentionLimit: RETENTION_LIMIT, diagnostic: this.diagnose(), entries: sanitize(this.entries) }, null, 2);
  }

  clear(): void {
    this.entries = [];
    this.persist();
  }

  reload(): void {
    try {
      const raw = typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem(STORAGE_KEY) || "[]" : fallbackStorage;
      this.entries = (JSON.parse(raw) as LocalObservabilityEntry[]).slice(-RETENTION_LIMIT);
    } catch {
      this.entries = [];
    }
  }

  private persist(): void {
    const serialized = JSON.stringify(this.entries.slice(-RETENTION_LIMIT));
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, serialized);
        window.dispatchEvent?.(new CustomEvent(STORAGE_EVENT));
      } else fallbackStorage = serialized;
    } catch {
      fallbackStorage = serialized;
    }
  }

  private explainEvent(type: string, payload: Record<string, unknown>): string {
    if (type === "AGENT_CONTRIBUTION") return `O agente ${String(payload.agentId || "selecionado")} concluiu uma contribuição sem autoridade de mutação.`;
    if (type === "ACTION_CONFIRMATION_REQUIRED") return `A ferramenta ${String(payload.toolName || "selecionada")} exige confirmação humana.`;
    if (type === "ACTION_DENIED") return `A política local negou ${String(payload.toolName || "a ação")}: ${String(payload.reason || "sem autoridade suficiente")}.`;
    if (type === "ACTION_EXECUTED") return `A ferramenta ${String(payload.toolName || "selecionada")} terminou com success=${String(payload.success)}.`;
    if (type === "STEP_EXECUTED") return `A etapa ${String(payload.stepId || "desconhecida")} foi registrada como ${String(payload.status || "concluída")}.`;
    return `${type} registrado pelo runtime local.`;
  }
}

export const athenaObservabilityJournal = new LocalObservabilityJournal();
athenaEventBus.onAny((event) => athenaObservabilityJournal.captureEvent(event));
