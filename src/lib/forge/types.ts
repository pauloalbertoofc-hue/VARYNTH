/**
 * VARYNTH OS — Forge Isolated Sandbox Types & Protocol
 *
 * Defines the secure message envelope, message types, and session credentials
 * for untrusted scratchpad code execution.
 */

export const FORGE_SANDBOX_SCHEMA_VERSION = 1;
export const FORGE_MAX_PAYLOAD_BYTES = 64 * 1024; // 64 KB
export const FORGE_MAX_MESSAGES_PER_SECOND = 50;
export const FORGE_DEFAULT_TIMEOUT_MS = 4000; // 4 seconds

export type ForgeSandboxMessageType =
  | "SANDBOX_READY"
  | "RUN_REQUEST"
  | "STDOUT"
  | "STDERR"
  | "EXECUTION_RESULT"
  | "RUNTIME_ERROR"
  | "TIMEOUT";

export interface ForgeSandboxEnvelope {
  schemaVersion: number;
  sessionId: string;
  channelToken: string;
  type: ForgeSandboxMessageType;
  timestamp: string;
  payload: {
    code?: string;
    logs?: string[];
    returnValue?: string;
    durationMs?: number;
    error?: string;
    aborted?: boolean;
  };
}

export interface ForgeExecutionSession {
  sessionId: string;
  channelToken: string;
  createdAt: number;
  timeoutMs: number;
  isActive: boolean;
}

export interface ForgeValidationResult {
  valid: boolean;
  rejectedReason?: string;
  envelope?: ForgeSandboxEnvelope;
}
