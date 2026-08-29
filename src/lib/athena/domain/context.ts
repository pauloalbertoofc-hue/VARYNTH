import { Project, Task, VaultItem, ChronosEvent, ArgumentThesis, EvidenceItem, Opportunity } from "@/lib/types";

export type AthenaScope = "geral" | "juridico" | "pesquisa" | "produtividade";

export interface AthenaContext {
  scope: AthenaScope;
  targetProjectId?: string;
  activeProject?: Project;
  relevantProjects: Project[];
  relevantTasks: Task[];
  relevantVaultItems: VaultItem[];
  relevantChronosEvents: ChronosEvent[];
  relevantTheses: ArgumentThesis[];
  relevantEvidences: EvidenceItem[];
  relevantOpportunities: Opportunity[];
  systemTime: string;
}

