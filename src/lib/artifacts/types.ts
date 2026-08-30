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

export type CreativeEdgeType =
  | "DERIVED_FROM"
  | "DEPENDS_ON"
  | "USES"
  | "REFERENCES"
  | "GENERATED_FROM"
  | "DESCRIBES"
  | "IMPLEMENTS"
  | "CONTAINS"
  | "PRODUCES"
  | "SOURCE_OF"
  | "ADAPTED_TO"
  | "PUBLISHED_IN"
  | "ASSET_OF"
  | "RELATED_TO";

export type ArtifactRelationshipType = CreativeEdgeType;

export type VersionPinMode = "PINNED" | "FOLLOW_LATEST";

export type DependencyHealthStatus =
  | "VALID"
  | "UPDATE_AVAILABLE"
  | "SOURCE_TRASHED"
  | "SOURCE_MISSING"
  | "ASSET_MISSING"
  | "VERSION_MISMATCH"
  | "BROKEN_PROVENANCE"
  | "CORRUPTED_ASSET"
  | "UNUSED_DEPENDENCY";

export interface ArtifactRelationship {
  id?: string;
  targetArtifactId: string;
  targetVersionId?: string; // Authoritative immutable version ID (e.g. "ver-174000-abc")
  targetVersionNumber?: number; // Presentation representation (e.g. 2)
  type: CreativeEdgeType; // Canonical structural type
  semanticRole?: string; // e.g. "SCRIPT_FOR", "SPRITE_FOR", "BGM_FOR", "CUTSCENE_FOR"
  pinMode?: VersionPinMode; // Default: PINNED
  usageSlot?: string; // e.g. "timeline-track-1-clip-2", "entity-hero-sprite"
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AssetUsageRecord {
  id: string;
  assetId: string;
  consumerArtifactId: string;
  consumerVersionId: string; // Specific artifact version that uses this asset
  consumerVersionNumber?: number;
  usageSlot: string; // e.g. "timeline-track-1-clip-3", "entity-player-sprite"
  sourceArtifactId?: string; // Artifact that produced this asset (if derived)
  sourceVersionId?: string; // Specific version of producer artifact
  sourceVersionNumber?: number;
  createdAt: string;
}

export interface CreativeIntegrityIssue {
  code: DependencyHealthStatus;
  relationshipId?: string;
  sourceArtifactId: string;
  targetArtifactId?: string;
  targetVersionId?: string;
  assetId?: string;
  usageSlot?: string;
  message: string;
  severity: "ERROR" | "WARNING" | "INFO";
  suggestedAction?: string;
}

export interface CreativeIntegrityReport {
  artifactId: string;
  overallHealth: DependencyHealthStatus;
  valid: boolean;
  issues: CreativeIntegrityIssue[];
  evaluatedAt: string;
}

export interface ArtifactProvenance {
  creator: ArtifactActor;
  creatorDetails?: string;
  requestedBy?: string;
  sourceContext?: string;
  derivedFromArtifactIds?: string[];
  derivedFromArtifacts?: Array<{
    artifactId: string;
    versionId?: string;
    versionNumber?: number;
    relationshipType: CreativeEdgeType;
  }>;
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
  relationshipsSnapshot?: ArtifactRelationship[];
  assetUsageSnapshot?: AssetUsageRecord[];
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
