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

export type ArtifactStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PUBLISHED"
  | "ARCHIVED"
  | "FAILED"
  | "TRASHED";

export type ArtifactActor = "USER" | "ATHENA" | "SYSTEM" | "AUTOMATION" | "COLLABORATOR";

export type ArtifactRelationshipType =
  | "SOURCE_OF"
  | "DERIVED_FROM"
  | "ADAPTED_TO"
  | "PUBLISHED_IN"
  | "DEPENDS_ON"
  | "ASSET_OF"
  | "REFERENCES"
  | "RELATED_TO";

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
  parentVersionId?: string;
}

export type StorageType = "OPFS" | "INDEXEDDB_BLOB" | "FILE_REFERENCE" | "MEMORY";

export interface AssetFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storageType: StorageType;
  storageKey: string;
  checksum?: string;
  createdAt: string;
  createdBy: ArtifactActor;
  artifactIds: string[];
  metadata?: Record<string, unknown>;
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

  // Files & Physical Assets (File != Artifact)
  assetFileIds: string[];

  // Specialized metadata per type
  metadata: Record<string, unknown>;
  tags: string[];
  activeJobId?: string;
}

export type ArtifactFilter = "ALL" | ArtifactType | ArtifactStatus;

export interface CreationRequest {
  artifactType: ArtifactType;
  name: string;
  description?: string;
  projectId?: string;
  prompt?: string;
  inputAssets?: string[];
  options?: Record<string, unknown>;
  actor: ArtifactActor;
}

export interface CreationResult {
  success: boolean;
  artifact?: Artifact;
  createdAssets?: AssetFile[];
  jobId?: string;
  error?: string;
  capabilityStatus?: "AVAILABLE" | "CAPABILITY_UNAVAILABLE";
}

export interface CreationEngine {
  engineId: string;
  name: string;
  supportedArtifactTypes: ArtifactType[];
  canExecute(request: CreationRequest): Promise<boolean>;
  create(request: CreationRequest): Promise<CreationResult>;
}
