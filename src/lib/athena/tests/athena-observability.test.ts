import fs from "node:fs";
import path from "node:path";
import { decisionForContract } from "../domain/interaction-contract";
import { athenaEventBus } from "../events/event-bus";
import { athenaObservabilityJournal } from "../observability/local-observability-journal";
import { athenaInteractionContractGateway } from "../runtime/interaction-contract-gateway";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

athenaObservabilityJournal.clear();
for (let index = 0; index < 350; index += 1) {
  athenaObservabilityJournal.record({ category: "SYSTEM", type: "RETENTION_TEST", status: "INFO", message: `Evento ${index}` });
}
assert(athenaObservabilityJournal.list().length === 300, "Journal must enforce the 300-entry retention limit");

athenaObservabilityJournal.clear();
athenaInteractionContractGateway.execute(decisionForContract("ANSWER_SELF", "Conversa direta sem ação"), () => "ok");
athenaEventBus.emit("AGENT_CONTRIBUTION", { agentId: "critias", result: { summary: "análise" } }, "task-agent");
athenaEventBus.emit("ACTION_CONFIRMATION_REQUIRED", { toolName: "tasks.update", confirmationToken: "token-super-secret" }, "task-tool");
athenaObservabilityJournal.record({
  category: "PLAN", type: "PLAN_BLOCKED", status: "BLOCKED", message: "Confirmação expirada token-private-value",
  contract: "USE_TOOL", sessionId: "session-1", projectId: "project-1", planId: "plan-1", stepId: "step-1",
  details: { password: "never-export", rawPrompt: "segredo do usuário", safeReason: "Confirmação expirada" },
});

const entries = athenaObservabilityJournal.list();
assert(entries.some((entry) => entry.contract === "ANSWER_SELF" && entry.type === "CONTRACT_COMPLETED"), "Contract completion must reach the unified journal");
assert(entries.some((entry) => entry.category === "AGENT" && entry.capabilityId === "critias"), "Agent contribution must be correlated");
assert(entries.some((entry) => entry.category === "SECURITY" && entry.status === "BLOCKED"), "Confirmation requirement must be diagnosed as blocked");
const blocked = entries.find((entry) => entry.type === "PLAN_BLOCKED");
assert(blocked && athenaObservabilityJournal.explain(blocked).includes("antes de ampliar autoridade"), "Blocked explanation must state the fail-closed boundary");

const exported = athenaObservabilityJournal.exportSanitized();
assert(!exported.includes("never-export") && !exported.includes("segredo do usuário") && !exported.includes("token-super-secret") && !exported.includes("token-private-value"), "Export must redact tokens and sensitive fields");
assert(exported.includes("[REDACTED_TOKEN]"), "Export must make token redaction explicit");

const diagnostic = athenaObservabilityJournal.diagnose();
assert(diagnostic.total === entries.length && diagnostic.blocked >= 2, "Diagnostic counters must derive from authoritative journal entries");

const root = process.cwd();
const panel = fs.readFileSync(path.resolve(root, "src/components/athena/AthenaObservabilityPanel.tsx"), "utf8");
const hub = fs.readFileSync(path.resolve(root, "src/app/modules/athena/page.tsx"), "utf8");
const sidecar = fs.readFileSync(path.resolve(root, "src/components/athena/AthenaSidecar.tsx"), "utf8");
assert(panel.startsWith('"use client"') && panel.includes("exportSanitized") && panel.includes("new Blob"), "Interactive panel must export a local sanitized file");
assert(!panel.includes("fetch(") && !panel.includes("/api/") && !panel.includes("executeTool") && !panel.includes("capabilityPlanRuntime"), "Observability UI must remain local and read-only");
assert(panel.includes("Filtrar por contrato") && panel.includes("Retenção máxima: 300"), "Panel must expose contract filters and retention policy");
assert(hub.includes("<AthenaObservabilityPanel />") && sidecar.includes("<AthenaObservabilityPanel compact />"), "Full and compact observability surfaces must be reachable");

console.log("✓ Local journal, correlation, explanations, retention, sanitization, read-only UI and export verified");
