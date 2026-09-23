import type { ActionType } from "../domain/action";
import type {
  CapabilityAuthority,
  ExecutableCapabilityManifest,
} from "../domain/capability-selection";
import type { TaskType } from "../domain/task";
import { agentRegistry } from "../agents/registry";
import { registeredTools } from "../tools/registry";

const AGENT_TASK_TYPES: Record<string, TaskType[]> = {
  justitia: ["LEGAL_ANALYSIS"],
  logos: ["RESEARCH_SYNTHESIS"],
  strategos: ["PRODUCTIVITY_OPTIMIZATION"],
  sophia: ["WRITING_DRAFT"],
  bibliotecario: ["GENERAL_DELIBERATION", "ACTION_FAST"],
  "curador-pesquisa": ["RESEARCH_SYNTHESIS"],
  musa: ["CREATIVE_IDEATION"],
  critias: ["CRITICAL_REVIEW"],
  mnemosyne: ["GENERAL_DELIBERATION"],
  archivist: ["GENERAL_DELIBERATION"],
  "athena-generalist": ["GENERAL_DELIBERATION"],
  euterpe: ["GENERAL_DELIBERATION"],
};

const READ_ONLY_TOOLS = new Set<ActionType>([
  "vault.search", "vault.read", "chronos.listDeadlines", "research.getEvidences",
  "codex.searchTheses", "opportunities.list", "diagnostics.run", "creative.queryDependents",
  "creative.getProvenance", "creative.reviewPlan", "creative.getPlanStatus",
  "creative.getStepStatus", "creative.explainBlocker",
]);

const CONFIRMATION_TOOLS = new Set<ActionType>([
  "tasks.toggle", "tasks.update", "tasks.trash", "tasks.organize", "projects.update", "projects.trash", "trash.moveWithUndo",
  "creative.reviewDependencyUpdate", "creative.approvePlan", "creative.executePlan",
]);

const REQUIRED_INPUTS: Partial<Record<ActionType, string[]>> = {
  "tasks.create": ["title"],
  "tasks.toggle": ["taskId"],
  "tasks.update": ["taskId"],
  "tasks.trash": ["taskId"],
  "tasks.organize": ["projectId"],
  "projects.update": ["projectId"],
  "projects.trash": ["projectId"],
  "notes.create": ["content"],
  "vault.search": ["query"],
  "vault.read": ["id"],
  "trash.moveWithUndo": ["title", "entityType"],
  "creative.queryDependents": ["artifactId"],
  "creative.getProvenance": ["artifactId"],
  "creative.executePlan": ["executionPlan"],
};

function toolAuthority(actionType: ActionType): CapabilityAuthority {
  return READ_ONLY_TOOLS.has(actionType) ? "READ_ONLY" : "MUTATE_GOVERNED";
}

export class ExecutableCapabilityRegistry {
  list(): ExecutableCapabilityManifest[] {
    const agents = agentRegistry.listAgents().map<ExecutableCapabilityManifest>((agent) => ({
      id: agent.manifest.id,
      kind: "AGENT",
      name: agent.manifest.name,
      description: agent.manifest.description,
      enabled: agent.manifest.enabled,
      priority: agent.manifest.priority,
      cost: "MEDIUM",
      authority: "PROPOSE",
      domains: [agent.manifest.role],
      skills: [...agent.manifest.skills],
      taskTypes: AGENT_TASK_TYPES[agent.manifest.id] || [],
      mutatesData: false,
      requiresConfirmation: false,
      supportsUndo: false,
      requiredInputs: [],
    }));

    const tools = Object.values(registeredTools).map<ExecutableCapabilityManifest>((tool) => {
      const authority = toolAuthority(tool.name);
      return {
        id: tool.name,
        kind: "TOOL",
        name: tool.name,
        description: tool.description,
        enabled: true,
        priority: 100,
        cost: "LOW",
        authority,
        domains: [tool.module],
        skills: [tool.name, tool.module],
        taskTypes: ["ACTION_FAST"],
        actionType: tool.name,
        mutatesData: authority === "MUTATE_GOVERNED",
        requiresConfirmation: Boolean(tool.requiresConfirmation) || CONFIRMATION_TOOLS.has(tool.name),
        supportsUndo: Boolean(tool.undo),
        requiredInputs: REQUIRED_INPUTS[tool.name] || [],
      };
    });

    return [...agents, ...tools];
  }

  listAgents(): ExecutableCapabilityManifest[] {
    return this.list().filter((capability) => capability.kind === "AGENT" && capability.enabled);
  }

  listTools(): ExecutableCapabilityManifest[] {
    return this.list().filter((capability) => capability.kind === "TOOL" && capability.enabled);
  }

  get(id: string): ExecutableCapabilityManifest | undefined {
    return this.list().find((capability) => capability.id === id);
  }
}

export const executableCapabilityRegistry = new ExecutableCapabilityRegistry();
