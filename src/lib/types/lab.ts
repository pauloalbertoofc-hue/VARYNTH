import { ProjectCategory } from "./project";

export type LabStage = "ideia" | "experimento" | "prototipo" | "promovido";

export interface LabItem {
  id: string;
  title: string;
  description: string;
  hypothesis?: string;
  stage: LabStage;
  category: ProjectCategory;
  tags: string[];
  notes?: string;
  promotedProjectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GraveyardItem {
  id: string;
  title: string;
  originalCategory: ProjectCategory;
  whyStarted: string;
  whyAbandoned: string;
  lessonsLearned: string;
  reusableAssets?: string;
  tags: string[];
  abandonedAt: string;
  createdAt: string;
}

