import {
  WebPreviewEnvelope,
  WebPreviewMessageType,
  PreviewSessionCredentials,
  WebConsoleLogEntry,
  SUPPORTED_PREVIEW_SCHEMA_VERSION,
} from "./types";
import { athenaEventBus } from "../../athena/events/event-bus";

const MAX_PAYLOAD_BYTES_DEFAULT = 64 * 1024; // 64 KB
const MAX_MESSAGES_PER_SECOND_DEFAULT = 50;
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

const ALLOWED_MESSAGE_TYPES: Set<WebPreviewMessageType> = new Set([
  "PREVIEW_READY",
  "CONSOLE_LOG",
  "CONSOLE_WARN",
  "CONSOLE_ERROR",
  "RUNTIME_ERROR",
  "VIEWPORT_EVENT",
  "DOM_MUTATION",
  "HEARTBEAT",
]);

export interface BridgeValidationResult {
  valid: boolean;
  rejectedReason?: string;
  envelope?: WebPreviewEnvelope;
}

export class WebPreviewBridge {
  private activeSessions: Map<string, PreviewSessionCredentials> = new Map();
  private sessionRateLimiters: Map<string, { count: number; windowStart: number }> = new Map();
  private sessionLogs: Map<string, WebConsoleLogEntry[]> = new Map();
  private listeners: Map<string, Array<(entry: WebConsoleLogEntry) => void>> = new Map();

  /**
   * Creates a new cryptographically randomized preview session.
   */
  public createPreviewSession(
    websiteId: string,
    options?: { maxPayloadBytes?: number; maxMessagesPerSecond?: number }
  ): PreviewSessionCredentials {
    const previewSessionId = `prev-sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const channelToken = `tok-${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;

    const credentials: PreviewSessionCredentials = {
      previewSessionId,
      channelToken,
      allowedOrigins: ["null", "about:blank"], // Opaque sandbox origin
      maxPayloadBytes: options?.maxPayloadBytes || MAX_PAYLOAD_BYTES_DEFAULT,
      maxMessagesPerSecond: options?.maxMessagesPerSecond || MAX_MESSAGES_PER_SECOND_DEFAULT,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      isActive: true,
    };

    this.activeSessions.set(previewSessionId, credentials);
    this.sessionRateLimiters.set(previewSessionId, { count: 0, windowStart: Date.now() });
    this.sessionLogs.set(previewSessionId, []);

    athenaEventBus.emit("PREVIEW_SESSION_CREATED", { previewSessionId, websiteId });

    return credentials;
  }

  /**
   * Generates the minimal self-contained client bridge script to be injected into the preview document.
   */
  public generateClientBridgeScript(credentials: PreviewSessionCredentials): string {
    return `
<script id="__varynth_preview_bridge__">
(function() {
  const SESS_ID = "${credentials.previewSessionId}";
  const CH_TOKEN = "${credentials.channelToken}";
  const SCHEMA_VER = ${SUPPORTED_PREVIEW_SCHEMA_VERSION};

  function sendEnvelope(type, payload) {
    try {
      const envelope = {
        schemaVersion: SCHEMA_VER,
        previewSessionId: SESS_ID,
        channelToken: CH_TOKEN,
        type: type,
        timestamp: new Date().toISOString(),
        payload: payload
      };
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(envelope, "*");
      }
    } catch(err) {
      // Intentionally swallowed in sandbox
    }
  }

  // Hook console methods safely
  const _log = console.log;
  const _warn = console.warn;
  const _error = console.error;
  const _info = console.info;

  console.log = function(...args) {
    _log.apply(console, args);
    sendEnvelope("CONSOLE_LOG", { message: args.map(String).join(" ") });
  };
  console.warn = function(...args) {
    _warn.apply(console, args);
    sendEnvelope("CONSOLE_WARN", { message: args.map(String).join(" ") });
  };
  console.error = function(...args) {
    _error.apply(console, args);
    sendEnvelope("CONSOLE_ERROR", { message: args.map(String).join(" ") });
  };

  window.addEventListener("error", function(e) {
    sendEnvelope("RUNTIME_ERROR", {
      message: e.message || "Erro de execução não tratado",
      sourceFile: e.filename,
      line: e.lineno,
      stack: e.error ? e.error.stack : undefined
    });
  });

  window.addEventListener("unhandledrejection", function(e) {
    sendEnvelope("RUNTIME_ERROR", {
      message: "Promise Rejection: " + (e.reason ? (e.reason.message || String(e.reason)) : "Unknown"),
      stack: e.reason ? e.reason.stack : undefined
    });
  });

  window.addEventListener("DOMContentLoaded", function() {
    sendEnvelope("PREVIEW_READY", { url: window.location.href, title: document.title });
  });
})();
</script>`;
  }

  /**
   * Validates and ingests an incoming message envelope from the sandbox preview.
   */
  public receiveMessage(rawEnvelope: unknown, senderOrigin = "null"): BridgeValidationResult {
    // 1. Structure Check
    if (!rawEnvelope || typeof rawEnvelope !== "object") {
      return { valid: false, rejectedReason: "INVALID_STRUCTURE: Envelope deve ser um objeto JSON." };
    }

    const env = rawEnvelope as Partial<WebPreviewEnvelope>;

    // 2. Schema Version Check
    if (env.schemaVersion !== SUPPORTED_PREVIEW_SCHEMA_VERSION) {
      return { valid: false, rejectedReason: `UNSUPPORTED_SCHEMA: Esperado versão ${SUPPORTED_PREVIEW_SCHEMA_VERSION}, recebido ${env.schemaVersion}.` };
    }

    // 3. Session Identification & Active State
    if (!env.previewSessionId) {
      return { valid: false, rejectedReason: "MISSING_SESSION_ID: previewSessionId é obrigatório." };
    }

    const session = this.activeSessions.get(env.previewSessionId);
    if (!session) {
      return { valid: false, rejectedReason: "SESSION_NOT_FOUND: previewSessionId inexistente ou forjado." };
    }

    if (!session.isActive) {
      return { valid: false, rejectedReason: "SESSION_TERMINATED: A sessão de preview foi encerrada e não aceita mais mensagens." };
    }

    // Check expiration
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      session.isActive = false;
      return { valid: false, rejectedReason: "SESSION_EXPIRED: Sessão de preview expirada." };
    }

    // 4. Channel Token Validation
    if (!env.channelToken || env.channelToken !== session.channelToken) {
      return { valid: false, rejectedReason: "INVALID_CHANNEL_TOKEN: Token de canal de sessão inválido." };
    }

    // 5. Message Type Allowlist
    if (!env.type || !ALLOWED_MESSAGE_TYPES.has(env.type as WebPreviewMessageType)) {
      return { valid: false, rejectedReason: `UNKNOWN_MESSAGE_TYPE: Tipo de mensagem "${env.type}" não permitido pelo protocolo seguro.` };
    }

    // 6. Payload Size Check
    const payloadStr = JSON.stringify(env.payload || {});
    if (payloadStr.length > session.maxPayloadBytes) {
      return {
        valid: false,
        rejectedReason: `PAYLOAD_TOO_LARGE: Tamanho do payload (${payloadStr.length} bytes) excede o limite permitido (${session.maxPayloadBytes} bytes).`,
      };
    }

    // 7. Message Flood Protection / Rate Limiting
    const rateLimiter = this.sessionRateLimiters.get(env.previewSessionId);
    if (rateLimiter) {
      const now = Date.now();
      if (now - rateLimiter.windowStart < 1000) {
        rateLimiter.count++;
        if (rateLimiter.count > session.maxMessagesPerSecond) {
          // Protocol abuse detected: terminate session immediately
          session.isActive = false;
          athenaEventBus.emit("PREVIEW_PROTOCOL_ABUSE", {
            previewSessionId: env.previewSessionId,
            reason: "RATE_LIMIT_EXCEEDED",
            messageCount: rateLimiter.count,
          });
          return {
            valid: false,
            rejectedReason: "PREVIEW_PROTOCOL_ABUSE: Taxa de mensagens excedida (Flood detectado). Sessão encerrada preemptivamente.",
          };
        }
      } else {
        rateLimiter.count = 1;
        rateLimiter.windowStart = now;
      }
    }

    // 8. Process Valid Message
    const validEnvelope = env as WebPreviewEnvelope;
    this.handleValidEnvelope(validEnvelope);

    return { valid: true, envelope: validEnvelope };
  }

  private handleValidEnvelope(env: WebPreviewEnvelope): void {
    const logs = this.sessionLogs.get(env.previewSessionId) || [];
    const payload = (env.payload || {}) as Record<string, unknown>;

    let level: "log" | "warn" | "error" | "info" = "info";
    if (env.type === "CONSOLE_LOG") level = "log";
    else if (env.type === "CONSOLE_WARN") level = "warn";
    else if (env.type === "CONSOLE_ERROR" || env.type === "RUNTIME_ERROR") level = "error";

    const entry: WebConsoleLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      level,
      message: (payload.message as string) || `[${env.type}] Evento recebido`,
      timestamp: env.timestamp || new Date().toISOString(),
      stack: payload.stack as string | undefined,
      sourceFile: payload.sourceFile as string | undefined,
      line: payload.line as number | undefined,
    };

    logs.push(entry);
    this.sessionLogs.set(env.previewSessionId, logs);

    // Notify listeners
    const sessionListeners = this.listeners.get(env.previewSessionId) || [];
    sessionListeners.forEach((fn) => fn(entry));
  }

  public getSessionLogs(previewSessionId: string): WebConsoleLogEntry[] {
    return this.sessionLogs.get(previewSessionId) || [];
  }

  public clearSessionLogs(previewSessionId: string): void {
    this.sessionLogs.set(previewSessionId, []);
  }

  public terminateSession(previewSessionId: string): boolean {
    const session = this.activeSessions.get(previewSessionId);
    if (!session) return false;
    session.isActive = false;
    athenaEventBus.emit("PREVIEW_SESSION_TERMINATED", { previewSessionId });
    return true;
  }

  public subscribeToLogs(previewSessionId: string, callback: (entry: WebConsoleLogEntry) => void): () => void {
    const current = this.listeners.get(previewSessionId) || [];
    this.listeners.set(previewSessionId, [...current, callback]);

    return () => {
      const updated = (this.listeners.get(previewSessionId) || []).filter((cb) => cb !== callback);
      this.listeners.set(previewSessionId, updated);
    };
  }
}

export const webPreviewBridge = new WebPreviewBridge();

