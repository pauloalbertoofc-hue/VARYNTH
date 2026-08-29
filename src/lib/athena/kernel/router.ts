import { AthenaTask } from "../domain/task";
import { AthenaContext } from "../domain/context";
import { AthenaAgent } from "../agents/base-agent";
import { agentRegistry } from "../agents/registry";

export class CognitiveRouter {
  route(task: AthenaTask, context: AthenaContext): AthenaAgent[] {
    return agentRegistry.findCompetentAgents(task, context);
  }
}

export const athenaRouter = new CognitiveRouter();

