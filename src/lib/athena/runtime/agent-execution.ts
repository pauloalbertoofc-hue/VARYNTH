import type { AthenaContext } from "../domain/context";
import type { AgentResult } from "../domain/result";
import type { AthenaTask } from "../domain/task";
import type { AthenaAgent } from "../agents/base-agent";
import { prepareAgentExperienceContext } from "./agent-experience-context";

export interface AgentExecution {
  result: AgentResult;
  context: AthenaContext;
}

/** One governed invocation path for direct chat and persisted workflow agents. */
export async function executeAgentWithExperience(
  agent: AthenaAgent,
  task: AthenaTask,
  context: AthenaContext,
  ownerId?: string,
): Promise<AgentExecution> {
  const agentContext: AthenaContext = {
    ...context,
    experienceContext: await prepareAgentExperienceContext(agent.manifest.id, task, context, ownerId),
  };
  const result = agent.converseWithFeedback
    ? await agent.converseWithFeedback(task, agentContext)
    : await agent.execute(task, agentContext);
  return { result, context: agentContext };
}
