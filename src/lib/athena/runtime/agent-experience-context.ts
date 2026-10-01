import type { AthenaContext } from "../domain/context";
import type { AthenaTask } from "../domain/task";
import { buildExperienceContext, type ExperienceContext } from "@/lib/experience/context-builder";

const agentDomains: Record<string, string> = {
  justitia: "legal",
  logos: "research",
  "curador-pesquisa": "research",
  euterpe: "music",
  "music-curator": "music",
  strategos: "productivity",
  sophia: "communication",
  musa: "creativity",
  critias: "critical-review",
  mnemosyne: "memory",
  archivist: "archival-research",
  bibliotecario: "knowledge-management",
};

export function experienceDomainForAgent(agentId: string, taskScope: string): string | undefined {
  return agentDomains[agentId] || (taskScope === "juridico" ? "legal" : taskScope === "pesquisa" ? "research" : taskScope === "produtividade" ? "productivity" : undefined);
}

export async function prepareAgentExperienceContext(
  agentId: string,
  task: AthenaTask,
  context: AthenaContext,
  ownerId?: string,
): Promise<ExperienceContext | undefined> {
  try {
    return await buildExperienceContext({
      requester: `athena-agent:${agentId}`,
      ownerId,
      domain: experienceDomainForAgent(agentId, task.scope),
      agentId,
      moduleId: "athena",
      projectId: context.activeProject?.id || task.targetProjectId,
      sessionId: typeof task.metadata?.sessionId === "string" ? task.metadata.sessionId : undefined,
      currentInstruction: task.rawPrompt,
      budget: 8,
    });
  } catch {
    // Experience is optional personalization: absent identity or storage must
    // never prevent an otherwise valid, unpersonalized agent execution.
    return undefined;
  }
}
