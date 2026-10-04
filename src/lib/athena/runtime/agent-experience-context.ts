import type { AthenaContext } from "../domain/context";
import type { AthenaTask } from "../domain/task";
import { buildExperienceContext, type ExperienceContext } from "@/lib/experience/context-builder";
import { EXPERIENCE_AGENT_CATALOG } from "@/lib/experience/agent-catalog";

const agentDomains = new Map<string, string | undefined>(EXPERIENCE_AGENT_CATALOG.map((agent) => [agent.id, agent.domain]));
agentDomains.set("music-curator", "music");

export function experienceDomainForAgent(agentId: string, taskScope: string): string | undefined {
  return agentDomains.get(agentId) || (taskScope === "juridico" ? "legal" : taskScope === "pesquisa" ? "research" : taskScope === "produtividade" ? "productivity" : undefined);
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
