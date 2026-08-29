export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "PAUSED";

export type JobType =
  | "RENDER_VIDEO"
  | "BUILD_GAME"
  | "COMPILE_WASM"
  | "EXPORT_BACKUP"
  | "IMPORT_BACKUP"
  | "ATHENA_AUTONOMOUS_TASK"
  | "BATCH_INDEX_VECTOR"
  | "CODE_TEST_SUITE";

export type JobActor = "USER" | "ATHENA" | "SYSTEM";

export interface JobLogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
}

export interface Job {
  id: string;
  type: JobType;
  title: string;
  status: JobStatus;
  progress: number; // 0 to 100
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  logs: JobLogEntry[];
  result?: unknown;
  error?: string;
  retryCount: number;
  createdBy: JobActor;
  relatedArtifactId?: string;
  relatedProjectId?: string;
  metadata?: Record<string, unknown>;
}

export interface SandboxEnvironment {
  id: string;
  name: string;
  isolated: boolean;
  allowNetwork: boolean;
  allowHostIO: boolean;
  memoryLimitMb: number;
  timeoutMs: number;
}

export interface SandboxExecutionResult {
  executionId: string;
  status: "SUCCESS" | "ERROR" | "TIMEOUT";
  output?: string;
  logs: string[];
  durationMs: number;
  error?: string;
}

