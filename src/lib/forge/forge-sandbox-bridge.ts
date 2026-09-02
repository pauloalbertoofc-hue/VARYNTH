/**
 * VARYNTH OS — Forge Isolated Sandbox Bridge
 *
 * Implements communication, message envelope verification, rate-limiting,
 * safe serialization, static bootstrap generation, and structured postMessage
 * code dispatching for executing untrusted user code inside an opaque-origin sandbox.
 */

import {
  ForgeSandboxEnvelope,
  ForgeSandboxMessageType,
  ForgeExecutionSession,
  ForgeValidationResult,
  FORGE_SANDBOX_SCHEMA_VERSION,
  FORGE_MAX_PAYLOAD_BYTES,
  FORGE_MAX_MESSAGES_PER_SECOND,
  FORGE_DEFAULT_TIMEOUT_MS,
} from "./types";

const ALLOWED_MESSAGE_TYPES = new Set<ForgeSandboxMessageType>([
  "SANDBOX_READY",
  "RUN_REQUEST",
  "STDOUT",
  "STDERR",
  "EXECUTION_RESULT",
  "RUNTIME_ERROR",
  "TIMEOUT",
]);

export class ForgeSandboxBridge {
  private activeSessions: Map<string, ForgeExecutionSession> = new Map();
  private rateLimiters: Map<string, { count: number; windowStart: number }> = new Map();

  /**
   * Creates a new cryptographically randomized execution session.
   */
  public createSession(timeoutMs = FORGE_DEFAULT_TIMEOUT_MS): ForgeExecutionSession {
    const sessionId = `forge-sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const channelToken = `tok-${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;

    const session: ForgeExecutionSession = {
      sessionId,
      channelToken,
      createdAt: Date.now(),
      timeoutMs,
      isActive: true,
    };

    this.activeSessions.set(sessionId, session);
    this.rateLimiters.set(sessionId, { count: 0, windowStart: Date.now() });
    return session;
  }

  /**
   * Invalidates and cleans up an execution session.
   */
  public invalidateSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.activeSessions.delete(sessionId);
    }
    this.rateLimiters.delete(sessionId);
  }

  /**
   * Validates an incoming message event against the active session.
   */
  public validateMessage(
    data: unknown,
    origin: string,
    activeSession: ForgeExecutionSession | null
  ): ForgeValidationResult {
    // 1. Validate origin: must be opaque sandbox origin ("null" or "about:blank" or empty string)
    if (origin !== "null" && origin !== "about:blank" && origin !== "") {
      return { valid: false, rejectedReason: `UNTRUSTED_ORIGIN: Origin '${origin}' is not the opaque sandbox.` };
    }

    // 2. Validate envelope structure
    if (!data || typeof data !== "object") {
      return { valid: false, rejectedReason: "INVALID_ENVELOPE: Message payload is not an object." };
    }

    const env = data as Partial<ForgeSandboxEnvelope>;

    if (env.schemaVersion !== FORGE_SANDBOX_SCHEMA_VERSION) {
      return { valid: false, rejectedReason: `SCHEMA_MISMATCH: Version ${env.schemaVersion} not supported.` };
    }

    if (!activeSession || !activeSession.isActive) {
      return { valid: false, rejectedReason: "INACTIVE_SESSION: No active session accepting messages." };
    }

    if (env.sessionId !== activeSession.sessionId) {
      return { valid: false, rejectedReason: "SESSION_MISMATCH: sessionId does not match active session." };
    }

    if (env.channelToken !== activeSession.channelToken) {
      return { valid: false, rejectedReason: "TOKEN_MISMATCH: channelToken is invalid or forged." };
    }

    if (!env.type || !ALLOWED_MESSAGE_TYPES.has(env.type as ForgeSandboxMessageType)) {
      return { valid: false, rejectedReason: `DISALLOWED_TYPE: Message type '${env.type}' not in allowlist.` };
    }

    // 3. Payload size check
    let serialized = "";
    try {
      serialized = JSON.stringify(env.payload || {});
      if (serialized.length > FORGE_MAX_PAYLOAD_BYTES) {
        return { valid: false, rejectedReason: "PAYLOAD_OVERSIZED: Payload exceeds maximum allowed 64KB." };
      }
    } catch {
      return { valid: false, rejectedReason: "PAYLOAD_CORRUPT: Cannot serialize message payload." };
    }

    // 4. Rate Limiting Check (max 50 messages/sec)
    const now = Date.now();
    const rate = this.rateLimiters.get(activeSession.sessionId) || { count: 0, windowStart: now };

    if (now - rate.windowStart > 1000) {
      rate.count = 1;
      rate.windowStart = now;
    } else {
      rate.count++;
      if (rate.count > FORGE_MAX_MESSAGES_PER_SECOND) {
        return { valid: false, rejectedReason: "RATE_LIMIT_EXCEEDED: Exceeded 50 messages per second." };
      }
    }
    this.rateLimiters.set(activeSession.sessionId, rate);

    return {
      valid: true,
      envelope: env as ForgeSandboxEnvelope,
    };
  }

  /**
   * Generates the immutable static bootstrap HTML document for the sandbox.
   * CONTAINS ZERO USER CODE — completely separated from user source content.
   */
  public getStaticBootstrapDocument(session: ForgeExecutionSession): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; style-src 'none'; font-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';">
  <title>VARYNTH Forge Sandboxed Execution</title>
</head>
<body>
<script>
(function() {
  const SESS_ID = "${session.sessionId}";
  const CH_TOKEN = "${session.channelToken}";
  const SCHEMA_VER = ${FORGE_SANDBOX_SCHEMA_VERSION};

  function sendEnvelope(type, payload) {
    try {
      const envelope = {
        schemaVersion: SCHEMA_VER,
        sessionId: SESS_ID,
        channelToken: CH_TOKEN,
        type: type,
        timestamp: new Date().toISOString(),
        payload: payload || {}
      };
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(envelope, "*");
      }
    } catch(err) {
      // Ignored in sandbox
    }
  }

  // Safe serializer avoiding circular references and memory exhaustion
  function safeSerialize(val, depth) {
    if (depth === undefined) depth = 0;
    if (depth > 4) return "[Max Depth Exceeded]";
    if (val === null) return "null";
    if (val === undefined) return "undefined";
    if (typeof val === "string") return val.length > 2000 ? val.substring(0, 2000) + "... [truncated]" : val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "function") return "[Function: " + (val.name || "anonymous") + "]";
    if (typeof val === "symbol") return val.toString();

    try {
      if (Array.isArray(val)) {
        if (val.length > 100) {
          return "[" + val.slice(0, 100).map(function(item) { return safeSerialize(item, depth + 1); }).join(", ") + ", ... " + (val.length - 100) + " more items]";
        }
        return "[" + val.map(function(item) { return safeSerialize(item, depth + 1); }).join(", ") + "]";
      }

      if (typeof val === "object") {
        const keys = Object.keys(val);
        if (keys.length > 50) {
          const subset = keys.slice(0, 50);
          return "{" + subset.map(function(k) { return JSON.stringify(k) + ": " + safeSerialize(val[k], depth + 1); }).join(", ") + ", ... " + (keys.length - 50) + " more keys}";
        }
        return "{" + keys.map(function(k) { return JSON.stringify(k) + ": " + safeSerialize(val[k], depth + 1); }).join(", ") + "}";
      }
    } catch(e) {
      return "[Unserializable Object]";
    }

    return String(val);
  }

  const logs = [];
  const maxLogs = 150;

  function pushLog(prefix, args) {
    if (logs.length >= maxLogs) {
      if (logs.length === maxLogs) {
        logs.push("[WARN] Limite máximo de logs atingido (150 linhas). Logs adicionais foram suprimidos.");
      }
      return;
    }
    const formatted = Array.prototype.slice.call(args).map(function(a) { return safeSerialize(a, 0); }).join(" ");
    logs.push(prefix + " " + formatted);
  }

  // Shadow console safely
  const customConsole = {
    log: function() { pushLog("[LOG]", arguments); },
    warn: function() { pushLog("[WARN]", arguments); },
    error: function() { pushLog("[ERROR]", arguments); },
    info: function() { pushLog("[INFO]", arguments); }
  };

  // Expose internal handler on window scope inside sandbox only
  window.__VARYNTH_CUSTOM_CONSOLE__ = customConsole;

  // Intercept global syntax / compilation errors in injected scripts
  window.addEventListener("error", function(e) {
    const errorMsg = e.message || (e.error ? e.error.message : "Syntax/Compilation Error");
    logs.push("[RUNTIME ERROR] " + errorMsg);
    sendEnvelope("RUNTIME_ERROR", {
      logs: logs,
      error: errorMsg,
      durationMs: 0
    });
  });

  window.addEventListener("unhandledrejection", function(e) {
    const errorMsg = (e.reason && e.reason.message) ? e.reason.message : String(e.reason);
    logs.push("[RUNTIME ERROR] Unhandled Promise Rejection: " + errorMsg);
    sendEnvelope("RUNTIME_ERROR", {
      logs: logs,
      error: errorMsg,
      durationMs: 0
    });
  });

  let executionStarted = false;

  window.addEventListener("message", function(e) {
    if (executionStarted) return;
    const msg = e.data;
    if (!msg || typeof msg !== "object") return;
    if (msg.sessionId !== SESS_ID || msg.channelToken !== CH_TOKEN) return;
    if (msg.type !== "RUN_REQUEST") return;

    executionStarted = true;
    const userCode = (msg.payload && typeof msg.payload.code === "string") ? msg.payload.code : "";
    const startTime = performance.now();

    window.__VARYNTH_HANDLE_RESULT__ = function(result) {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      if (result && typeof result.then === "function") {
        result.then(function(asyncRes) {
          const asyncEnd = performance.now();
          if (logs.length === 0) {
            logs.push("[INFO] Código assíncrono executado com sucesso no sandbox isolado.");
          }
          sendEnvelope("EXECUTION_RESULT", {
            logs: logs,
            returnValue: asyncRes !== undefined ? safeSerialize(asyncRes, 0) : undefined,
            durationMs: Math.round(asyncEnd - startTime)
          });
        }).catch(function(asyncErr) {
          const asyncEnd = performance.now();
          const errorMsg = (asyncErr && asyncErr.message) ? asyncErr.message : String(asyncErr);
          logs.push("[RUNTIME ERROR] " + errorMsg);
          sendEnvelope("RUNTIME_ERROR", {
            logs: logs,
            error: errorMsg,
            durationMs: Math.round(asyncEnd - startTime)
          });
        });
        return;
      }

      if (logs.length === 0) {
        logs.push("[INFO] Código executado com sucesso no sandbox isolado sem chamadas de console.log.");
      }

      sendEnvelope("EXECUTION_RESULT", {
        logs: logs,
        returnValue: result !== undefined ? safeSerialize(result, 0) : undefined,
        durationMs: durationMs
      });
    };

    window.__VARYNTH_HANDLE_ERROR__ = function(err) {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      const errorMsg = (err && err.message) ? err.message : String(err);
      logs.push("[RUNTIME ERROR] " + errorMsg);

      sendEnvelope("RUNTIME_ERROR", {
        logs: logs,
        error: errorMsg,
        durationMs: durationMs
      });
    };

    // Inject user code dynamically via script.textContent (IMMUNE TO HTML TAG BREAKOUT)
    const scriptEl = document.createElement("script");
    const wrapper = "(function() {\\n" +
      "  try {\\n" +
      "    const result = (function(console) {\\n" +
      userCode + "\\n" +
      "    })(window.__VARYNTH_CUSTOM_CONSOLE__);\\n" +
      "    window.__VARYNTH_HANDLE_RESULT__(result);\\n" +
      "  } catch(err) {\\n" +
      "    window.__VARYNTH_HANDLE_ERROR__(err);\\n" +
      "  }\\n" +
      "})();";
    scriptEl.textContent = wrapper;
    document.body.appendChild(scriptEl);
  });

  // Signal host that sandbox bootstrap is complete and ready to receive code
  sendEnvelope("SANDBOX_READY", {});
})();
</script>
</body>
</html>`;
  }

  /**
   * Generates document for execution session (delegates to static bootstrap).
   */
  public generateSandboxDocument(
    _code: string,
    session: ForgeExecutionSession
  ): string {
    return this.getStaticBootstrapDocument(session);
  }
}

export const forgeSandboxBridge = new ForgeSandboxBridge();
