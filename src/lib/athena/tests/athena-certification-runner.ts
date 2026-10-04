import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION, CURRENT_INTERACTION_CONTRACT_VERSION, CURRENT_TOOL_CONTRACT_VERSION } from "../domain/contract-versions";

const root = process.cwd();
const tsxCli = resolve(root, "node_modules/tsx/dist/cli.mjs");
const checks = [
  "src/lib/athena/tests/interaction-contract.test.ts",
  "src/lib/athena/tests/interaction-contract-e2e.test.ts",
  "src/lib/athena/tests/capability-selection.test.ts",
  "src/lib/athena/agents/council/agent-persona-grounding.test.ts",
  "src/lib/athena/agents/base-agent-conversation.test.ts",
  "src/lib/athena/conversation/specialist-correction.test.ts",
  "src/lib/athena/tests/capability-plan.test.ts",
  "src/lib/athena/tests/capability-plan-governance.test.ts",
  "src/lib/athena/tests/capability-plan-recovery.test.ts",
  "src/lib/athena/tests/operational-core-certification.test.ts",
  "src/lib/athena/tests/contract-versioning-certification.test.ts",
  "src/lib/athena/tests/athena-observability.test.ts",
  "src/lib/athena/tests/athena-communication-regression.test.ts",
  "src/lib/athena/tests/athena-conversation-outcome.test.ts",
  "src/lib/athena/tests/athena-conversation-store.test.ts",
  "src/lib/athena/tests/athena-conversation-sync.test.ts",
  "src/lib/athena/tests/athena-studio-generation.test.ts",
  "src/lib/permissions/permission-regression.test.ts",
];

const startedAt = new Date().toISOString();
const results = checks.map((file) => {
  const execution = spawnSync(process.execPath, [tsxCli, resolve(root, file)], { cwd: root, encoding: "utf8" });
  const passed = execution.status === 0;
  process.stdout.write(`${passed ? "✓" : "✗"} ${file}\n`);
  if (!passed) process.stderr.write(execution.stderr || execution.stdout || "Falha sem saída.\n");
  return { file, passed, exitCode: execution.status ?? 1 };
});

const report = {
  schemaVersion: 1,
  startedAt,
  finishedAt: new Date().toISOString(),
  passed: results.every((result) => result.passed),
  summary: { total: results.length, passed: results.filter((result) => result.passed).length, failed: results.filter((result) => !result.passed).length },
  contractVersions: {
    capabilityPlanSchema: CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION,
    interaction: CURRENT_INTERACTION_CONTRACT_VERSION,
    tool: CURRENT_TOOL_CONTRACT_VERSION,
  },
  defaultAdjustableGuardrails: { serializePlanOperations: true, rejectDuplicateConfirmations: true },
  requiredGuardrails: ["permissions", "tool-manager-boundary", "session-project-isolation", "contract-version-rejection"],
  results,
};

const reportDirectory = resolve(root, ".varynth-data/diagnostics");
mkdirSync(reportDirectory, { recursive: true });
writeFileSync(resolve(reportDirectory, "athena-certification-latest.json"), JSON.stringify(report, null, 2), "utf8");
console.log(`\nCertificação Athena: ${report.summary.passed}/${report.summary.total} verificações aprovadas.`);
console.log("Relatório local: .varynth-data/diagnostics/athena-certification-latest.json");
if (!report.passed) process.exitCode = 1;
