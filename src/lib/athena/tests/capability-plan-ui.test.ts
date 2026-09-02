import fs from "node:fs";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const panel = fs.readFileSync(path.join(root, "src/components/athena/AthenaCapabilityPlanPanel.tsx"), "utf8");
const hub = fs.readFileSync(path.join(root, "src/app/modules/athena/page.tsx"), "utf8");
const sidecar = fs.readFileSync(path.join(root, "src/components/athena/AthenaSidecar.tsx"), "utf8");

assert(panel.startsWith('"use client"'), "Plan panel must be a narrow Client Component boundary");
assert(panel.includes("capabilityPlanStore.list()"), "Panel must read the local plan store directly");
assert(panel.includes("varynth_capability_plans_updated"), "Panel must react to local storage events");
assert(!panel.includes("fetch("), "Panel must not call HTTP endpoints");
assert(!panel.includes("/api/"), "Panel must not depend on API routes");
assert(panel.includes('role="progressbar"') && panel.includes("aria-valuenow"), "Progress must be accessible");
assert(panel.includes("min-h-11"), "Interactive controls must retain touch-sized targets");
assert(panel.includes("Grafo de dependências") && panel.includes("Depende de:"), "DAG dependencies must be visible");
assert(panel.includes("Journal, checkpoints e métricas"), "Journal and checkpoints must be inspectable");
assert(panel.includes("capabilityPlanRuntime.pause") && panel.includes("capabilityPlanRuntime.resume"), "Pause and resume controls must use the runtime");
assert(panel.includes("capabilityPlanRuntime.cancel") && panel.includes("capabilityPlanRuntime.retryStep"), "Cancel and retry controls must use the runtime");
assert(panel.includes("Reverter indisponível com segurança"), "Unsafe undo must be visibly unavailable rather than simulated");
assert(hub.includes("<AthenaCapabilityPlanPanel store={store} />"), "Full panel must be integrated into Athena Hub");
assert(sidecar.includes("<AthenaCapabilityPlanPanel store={store} compact />"), "Compact plan status must be integrated into Sidecar");

console.log("✓ Plan UI integration, accessibility, mobile controls and local-only boundary verified");

