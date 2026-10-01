import { Project, Task, VaultItem, ChronosEvent, ArgumentThesis, EvidenceItem, Opportunity } from "@/lib/types";
import type { ExperienceContext } from "@/lib/experience/context-builder";

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
  /** Bounded turns from the active session, supplied only for conversational reference resolution. */
  recentConversation?: Array<{ role: "user" | "athena"; text: string }>;
  /** Account-owned, bounded learning context; independently resolved per agent. */
  experienceContext?: ExperienceContext;
  systemTime: string;
}

