import { ArtifactType, ArtifactActor } from "../artifacts/types";

export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "INTERRUPTED";

export type JobPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type JobType =
  | "RENDER_VIDEO"
  | "BUILD_GAME"
  | "COMPILE_WASM"
  | "EXPORT_BACKUP"
  | "IMPORT_BACKUP"
  | "ATHENA_AUTONOMOUS_TASK"
  | "BATCH_INDEX_VECTOR"
  | "CODE_TEST_SUITE"
  | "DOCUMENT_EXPORT"
  | "SANDBOX_EXPERIMENT";

export type JobActor = ArtifactActor;

export interface JobLogEntry {
  id: string;
  timestamp: string;
  level: "DEBUG" | "INFO" | "WARNING" | "ERROR";
  message: string;
  metadata?: Record<string, unknown>;
}

export interface JobError {
  code: string;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

export interface JobCheckpoint {
  id: string;
  jobId: string;
  timestamp: string;
  stepName: string;
  progress: number;
  snapshotData: Record<string, unknown>;
}

export interface Job {
  id: string;
  type: JobType;
  title: string;
  description?: string;
  status: JobStatus;
  priority: JobPriority;
  progress: number; // 0 to 100
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  createdBy: JobActor;
  relatedArtifactId?: string;
  relatedProjectId?: string;
  creationEngineId?: string;
  logs: JobLogEntry[];
  result?: unknown;
  error?: JobError;
  retryCount: number;
  checkpoints: JobCheckpoint[];
  metadata?: Record<string, unknown>;
}

export interface SandboxCapabilities {
  filesystem: "NONE" | "TEMP" | "SCOPED";
  network: "DENY" | "LOCAL_ONLY" | "ALLOW";
  processExecution: boolean;
  maxMemoryMB?: number;
  maxExecutionTimeMs?: number;
}

export interface SandboxEnvironment {
  id: string;
  name: string;
  isolated: boolean;
  allowNetwork: boolean;
  allowHostIO: boolean;
  memoryLimitMb: number;
  timeoutMs: number;
  capabilities: SandboxCapabilities;
}

export interface SandboxRun {
  id: string;
  relatedJobId?: string;
  relatedArtifactId?: string;
  startedAt: string;
  completedAt?: string;
  status: "RUNNING" | "SUCCESS" | "ERROR" | "TIMEOUT" | "CANCELLED";
  logs: string[];
  outputAssets?: string[];
  outputData?: string;
  error?: string;
  capabilities: SandboxCapabilities;
}

export interface SandboxExecutionResult {
  executionId: string;
  status: "SUCCESS" | "ERROR" | "TIMEOUT" | "CANCELLED";
  output?: string;
  logs: string[];
  durationMs: number;
  error?: string;
}

export interface StudioDefinition {
  id: string;
  name: string;
  order: number;
  status: "PLANNED" | "IN_PROGRESS" | "READY";
  description: string;
  supportedArtifactTypes: ArtifactType[];
  availableCreationEngines: string[];
  capabilities: string[];
  supportsPreview: boolean;
  supportsBuild: boolean;
  supportsExport: boolean;
}

export interface StudioReadinessReport {
  studioId: string;
  name: string;
  order: number;
  readyForImplementation: boolean;
  components: {
    artifacts: boolean;
    assets: boolean;
    versions: boolean;
    jobs: boolean;
    sandbox: boolean;
    renderingEngine: boolean;
  };
  missingRequirements: string[];
}
