import {
  Project,
  Task,
  Note,
  VaultItem,
  ChronosEvent,
  Person,
  LabItem,
  ArgumentThesis,
  AcademicResearch,
  EvidenceItem,
  Opportunity,
  ForgeFile,
  TrashItem,
  ActivityLog,
  ProjectFile,
  ProjectReference,
  ProjectTimelineEvent,
  HistoricalMilestone,
  GraveyardItem,
} from "../types";
import { Artifact, AssetFile, AssetUsageRecord } from "../artifacts/types";
import { DocumentationReviewItem, DocumentationAuditRecord } from "../athena/guardian/types";
import { VarynthNotification } from "../notifications/types";

export interface VarynthBackupManifest {
  varynthVersion: string;
  schemaVersion: number;
  exportedAt: string;
  exportSource: string;
  entitiesCount: {
    projects: number;
    artifacts: number;
    tasks: number;
    notes: number;
    vaultItems: number;
    chronosEvents: number;
    people: number;
    labs: number;
    theses: number;
    researches: number;
    evidences: number;
    opportunities: number;
    forgeFiles: number;
    trash: number;
    activities: number;
    docReviews: number;
    docAuditLogs: number;
    notifications: number;
    assets?: number;
    assetUsages?: number;
    // Schema v2 extensions
    files?: number;
    references?: number;
    timelineEvents?: number;
    historicalMilestones?: number;
    graveyardItems?: number;
  };
}

export interface VarynthBackupPayload {
  manifest: VarynthBackupManifest;
  data: {
    projects: Project[];
    artifacts: Artifact[];
    tasks: Task[];
    notes: Note[];
    vault: VaultItem[];
    chronos: ChronosEvent[];
    people: Person[];
    labs: LabItem[];
    theses: ArgumentThesis[];
    researches: AcademicResearch[];
    evidences: EvidenceItem[];
    opportunities: Opportunity[];
    forgeFiles: ForgeFile[];
    trash: TrashItem[];
    activities: ActivityLog[];
    docReviews?: DocumentationReviewItem[];
    docAuditLogs?: DocumentationAuditRecord[];
    notifications?: VarynthNotification[];
    assets?: AssetFile[];
    assetUsages?: AssetUsageRecord[];
    assetBlobs?: Record<string, { base64Data: string; mimeType: string; checksum?: string }>;
    // Schema v2 extensions
    files?: ProjectFile[];
    references?: ProjectReference[];
    timelineEvents?: ProjectTimelineEvent[];
    historicalMilestones?: HistoricalMilestone[];
    graveyardItems?: GraveyardItem[];
  };
}

export type RestoreMode = "MERGE" | "REPLACE";

export interface BackupValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest?: VarynthBackupManifest;
}
