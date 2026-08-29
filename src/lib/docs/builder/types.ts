export type ExportScope =
  | "COMPLETE_HANDBOOK"
  | "ATHENA_MANUAL"
  | "ARCHITECTURE_SPEC"
  | "MODULES_MANUAL"
  | "ADRS_COMPENDIUM"
  | "HISTORY_AND_LESSONS"
  | "CURRENT_COMPONENT";

export type ExportFormat = "PDF" | "MARKDOWN" | "HTML";

export type ExportProfile = "PUBLIC_SAFE" | "INTERNAL";

export interface PublicationMetadata {
  title: string;
  subtitle: string;
  version: string;
  generatedAt: string;
  source: string;
  profile: ExportProfile;
  healthScore: number;
  healthStatus: string;
  includedComponentsCount: number;
  totalPagesEstimated?: number;
  authors: string[];
}

export interface PublicationChapter {
  id: string;
  number: string;
  title: string;
  category?: string;
  status?: string;
  summary: string;
  content: string;
  subsections?: Array<{
    title: string;
    content: string;
  }>;
}

export interface PublicationDocument {
  id: string;
  metadata: PublicationMetadata;
  tableOfContents: Array<{
    number: string;
    title: string;
    anchor: string;
  }>;
  chapters: PublicationChapter[];
}
