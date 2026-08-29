import { AthenaAgent } from "./base-agent";
import { AthenaTask } from "../domain/task";
import { AthenaContext } from "../domain/context";
import { justitiaAgent } from "./council/justitia";
import { logosAgent } from "./council/logos";
import { sophiaAgent } from "./council/sophia";
import { musaAgent } from "./council/musa";
import { strategosAgent } from "./council/strategos";
import { mnemosyneAgent } from "./council/mnemosyne";
import { critiasAgent } from "./council/critias";
import { archivistAgent } from "./council/archivist";

export class AgentRegistry {
  private agents: Map<string, AthenaAgent> = new Map();

  constructor() {
    this.register(justitiaAgent);
    this.register(logosAgent);
    this.register(sophiaAgent);
    this.register(musaAgent);
    this.register(strategosAgent);
    this.register(mnemosyneAgent);
    this.register(critiasAgent);
    this.register(archivistAgent);
  }

  register(agent: AthenaAgent): void {
    this.agents.set(agent.manifest.id, agent);
  }

  getAgent(id: string): AthenaAgent | undefined {
    return this.agents.get(id);
  }

  listAgents(): AthenaAgent[] {
    return Array.from(this.agents.values()).filter((a) => a.manifest.enabled);
  }

  findCompetentAgents(task: AthenaTask, context: AthenaContext): AthenaAgent[] {
    const matched = this.listAgents().filter((agent) => agent.canHandle(task, context));
    if (matched.length === 0) {
      // Default fallback specialists
      return [sophiaAgent, critiasAgent];
    }
    return matched.sort((a, b) => b.manifest.priority - a.manifest.priority);
  }
}

export const agentRegistry = new AgentRegistry();

