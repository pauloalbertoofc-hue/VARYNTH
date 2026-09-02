import type { AthenaAgent } from "../agents/base-agent";
import { agentRegistry } from "../agents/registry";
import { athenaCapabilitySelector } from "../kernel/capability-selector";
import { executableCapabilityRegistry } from "../kernel/executable-capability-registry";
import type { AthenaContext } from "../domain/context";
import type { AthenaTask } from "../domain/task";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const context: AthenaContext = {
  scope: "juridico",
  relevantProjects: [],
  relevantTasks: [],
  relevantVaultItems: [],
  relevantChronosEvents: [],
  relevantTheses: [],
  relevantEvidences: [],
  relevantOpportunities: [],
  systemTime: new Date().toISOString(),
};

const task: AthenaTask = {
  id: "cap-task",
  title: "Analisar jurisprudência constitucional",
  rawPrompt: "Analise a jurisprudência constitucional do STF",
  type: "LEGAL_ANALYSIS",
  priority: "media",
  status: "CREATED",
  scope: "juridico",
  entities: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const manifests = executableCapabilityRegistry.list();
assert(manifests.some((item) => item.kind === "AGENT"), "Unified registry must project agents");
assert(manifests.some((item) => item.kind === "TOOL"), "Unified registry must project tools");

const tool = athenaCapabilitySelector.select({ kind: "TOOL", actionType: "tasks.create" });
assert(tool.status === "SELECTED" && tool.selected?.id === "tasks.create", "Tool selection must be exact");
assert(tool.selected.mutatesData, "Task creation must declare governed mutation");
assert(tool.selected.requiredInputs.includes("title"), "Task creation must declare title input");

const agent = athenaCapabilitySelector.select({ kind: "AGENT", task, context });
assert(agent.status === "SELECTED" && agent.selected?.id === "justitia", "Legal task must select Justitia");
assert(agent.candidates.some((item) => !item.eligible), "Diagnostics must include rejected candidates");

const missing = athenaCapabilitySelector.select({
  kind: "AGENT",
  task,
  context,
  preferredCapabilityId: "missing-agent",
});
assert(missing.status === "NO_MATCH", "Unavailable explicit capability must fail closed");

const tiedTask = { ...task, id: "tie-task", rawPrompt: "capability tie probe", type: "GENERAL_DELIBERATION" as const };
for (const id of ["tie-a", "tie-b"]) {
  const tiedAgent: AthenaAgent = {
    manifest: { id, name: id, role: "test", version: "1", description: "test", skills: [], priority: 99, enabled: true },
    canHandle: (candidate) => candidate.id === "tie-task",
    execute: async () => ({ agentId: id, agentName: id, role: "test", success: true, content: "test", confidence: 1 }),
  };
  agentRegistry.register(tiedAgent);
}
const ambiguous = athenaCapabilitySelector.select({ kind: "AGENT", task: tiedTask, context: { ...context, scope: "geral" } });
assert(ambiguous.status === "AMBIGUOUS", "Equal top competence scores must not be resolved silently");
assert(Boolean(ambiguous.clarificationPrompt), "Ambiguity must produce a clarification prompt");

console.log("✓ Unified capability registry, deterministic selection and fail-closed diagnostics verified");

