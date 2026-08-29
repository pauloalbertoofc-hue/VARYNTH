import { Artifact, ArtifactActor } from "../../artifacts/types";

export type WebFramework =
  | "STATIC"
  | "VANILLA_JS"
  | "REACT"
  | "NEXTJS"
  | "OTHER";

export type WebFileLanguage =
  | "html"
  | "css"
  | "javascript"
  | "typescript"
  | "json"
  | "markdown"
  | "svg"
  | "text";

export interface WebFileItem {
  id: string;
  path: string; // e.g. "index.html", "src/styles.css", "public/logo.svg"
  name: string;
  content: string;
  language: WebFileLanguage;
  isEntry?: boolean;
  isReadonly?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WebBuildStatus =
  | "IDLE"
  | "QUEUED"
  | "BUILDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "INTERRUPTED";

export interface WebsiteMetadata {
  framework: WebFramework;
  entryFile: string;
  buildCommand?: string;
  outputDirectory: string;
  previewMode: "STATIC_HTML" | "SANDBOX_BUNDLE" | "DEV_SERVER";
  responsive?: boolean;
  publishedUrl?: string;
  lastBuildJobId?: string;
  lastBuildStatus?: WebBuildStatus;
  lastBuildTime?: string;
  lastSuccessfulBuildVersion?: number;
  environmentVariables?: Record<string, { value: string; isPublic: boolean }>;
}

export interface WebsiteItem {
  artifact: Artifact;
  metadata: WebsiteMetadata;
  files: WebFileItem[];
}

export interface WebBuildResult {
  success: boolean;
  jobId: string;
  status: WebBuildStatus;
  durationMs: number;
  outputAssets: string[]; // asset IDs generated in dist/
  bundleHtml?: string;
  logs: string[];
  errors: string[];
  sourceVersionNumber: number;
}

// Multi-file change proposals by Athena
export type WebFileChangeType = "ADDED" | "MODIFIED" | "DELETED";

export interface WebFileDiff {
  path: string;
  type: WebFileChangeType;
  oldContent?: string;
  newContent: string;
  explanation: string;
  accepted?: boolean;
}

export interface WebMultiFileChangeSet {
  id: string;
  websiteId: string;
  title: string;
  description: string;
  proposedBy: ArtifactActor;
  createdAt: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "PARTIALLY_ACCEPTED";
  changes: WebFileDiff[];
}

// Safe Web Preview Message Protocol (Authenticated Envelope)
export const SUPPORTED_PREVIEW_SCHEMA_VERSION = 1;

export type WebPreviewMessageType =
  | "PREVIEW_READY"
  | "CONSOLE_LOG"
  | "CONSOLE_WARN"
  | "CONSOLE_ERROR"
  | "RUNTIME_ERROR"
  | "VIEWPORT_EVENT"
  | "DOM_MUTATION"
  | "HEARTBEAT";

export interface WebPreviewEnvelope {
  schemaVersion: number;
  previewSessionId: string;
  channelToken: string;
  type: WebPreviewMessageType;
  timestamp: string;
  payload: unknown;
}

export interface PreviewSessionCredentials {
  previewSessionId: string;
  channelToken: string;
  allowedOrigins: string[];
  maxPayloadBytes: number;
  maxMessagesPerSecond: number;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface WebConsoleLogEntry {
  id: string;
  level: "log" | "warn" | "error" | "info";
  message: string;
  timestamp: string;
  stack?: string;
  sourceFile?: string;
  line?: number;
}

export interface WebExportPackage {
  websiteId: string;
  websiteName: string;
  version: number;
  exportedAt: string;
  packageType: "SOURCE_ZIP" | "DIST_BUNDLE" | "STANDALONE_HTML";
  files: { path: string; content: string }[];
  manifest: Record<string, unknown>;
}

