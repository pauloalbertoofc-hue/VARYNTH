export type ArtifactType =
  | "DOCUMENT"
  | "CODE"
  | "WEBSITE"
  | "IMAGE"
  | "AUDIO"
  | "VIDEO"
  | "GAME"
  | "DATASET"
  | "DIAGRAM"
  | "INTERACTIVE"
  | "OTHER";

export type ArtifactStatus = "DRAFT" | "ACTIVE" | "ARCHIVED" | "FAILED";
export type ArtifactActor = "USER" | "ATHENA" | "SYSTEM";

export type ArtifactRelationshipType =
  | "SOURCE_OF"
  | "ADAPTED_TO"
  | "PUBLISHED_IN"
  | "DEPENDS_ON"
  | "DERIVED_FROM"
  | "ASSET_OF";

export interface ArtifactRelationship {
  targetArtifactId: string;
  type: ArtifactRelationshipType;
  description?: string;
  createdAt: string;
}

export interface ArtifactProvenance {
  creator: ArtifactActor;
  creatorDetails?: string;
  requestedBy?: string;
  sourceContext?: string;
  derivedFromArtifactIds?: string[];
  generationPrompt?: string;
  engineUsed?: string;
  sandboxRunId?: string;
}

export interface ArtifactVersion {
  versionId: string;
  versionNumber: number;
  label?: string;
  createdAt: string;
  createdBy: ArtifactActor;
  changeSummary: string;
  snapshotData: Record<string, unknown>;
  fileAssetIds: string[];
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  name: string;
  description?: string;
  projectId?: string;
  status: ArtifactStatus;

  createdBy: ArtifactActor;
  createdAt: string;
  updatedAt: string;

  // Versioning
  currentVersionId?: string;
  currentVersionNumber: number;
  versions: ArtifactVersion[];

  // Relationships & Provenance
  relationships: ArtifactRelationship[];
  provenance: ArtifactProvenance;

  // Files & Assets vinculados (File != Artifact)
  assetFileIds: string[];

  // Metadados especializados por tipo
  metadata: Record<string, unknown>;
  tags: string[];
}

export type ArtifactFilter = "ALL" | ArtifactType | ArtifactStatus;

