import { Artifact, ArtifactActor, ArtifactType } from "../../artifacts/types";

export type DocumentClassification =
  | "ARTICLE"
  | "REPORT"
  | "RESEARCH"
  | "ESSAY"
  | "SCRIPT"
  | "MANUAL"
  | "LEGAL_DOCUMENT"
  | "NOTEBOOK"
  | "PRESENTATION_SCRIPT"
  | "GENERIC";

export type EditorialStatus = "WRITING" | "REVIEW" | "FINAL";

export type DocumentSaveState =
  | "SAVED"
  | "SAVING"
  | "UNSAVED"
  | "SAVE_FAILED"
  | "STORAGE_PROTECTED";

export interface DocumentHeading {
  id: string;
  level: number;
  text: string;
  slug: string;
}

export interface DocumentReference {
  id: string;
  sourceType: "VAULT" | "RESEARCH" | "CODEX" | "ARTIFACT" | "URL" | "MANUAL";
  sourceId?: string;
  label: string;
  url?: string;
  citationKey?: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentSection {
  id: string;
  title: string;
  order: number;
  content: string;
  notes?: string;
}

export interface DocumentMetadata {
  documentType: DocumentClassification;
  editorialStatus: EditorialStatus;
  subtitle?: string;
  language?: string;
  wordCount?: number;
  templateId?: string;
  authorIds?: string[];
  outline?: DocumentHeading[];
  references?: DocumentReference[];
  customSections?: DocumentSection[];
  [key: string]: unknown;
}

export interface DocumentContent {
  artifactId: string;
  format: "MARKDOWN" | "RICH_TEXT" | "PLAIN_TEXT";
  content: string;
  updatedAt: string;
}

export interface DocumentSuggestion {
  id: string;
  artifactId: string;
  sectionId?: string;
  originalText: string;
  proposedText: string;
  rationale?: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdBy: ArtifactActor;
  createdAt: string;
  resolvedAt?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  type: DocumentClassification;
  description: string;
  initialContent: string;
  outline: string[];
}

export interface StudioContext {
  studioId: string;
  artifactId: string;
  artifactType: ArtifactType;
  versionId?: string;
  projectId?: string;
  selectedAssetIds?: string[];
  selectedText?: string;
}

export interface DocumentExportOptions {
  format: "MARKDOWN" | "HTML" | "PDF";
  profile: "STANDARD" | "PUBLIC_SAFE";
  includeMetadata?: boolean;
  includeTableOfContents?: boolean;
}

export interface DocumentItem {
  artifact: Artifact;
  metadata: DocumentMetadata;
  content: string;
}

