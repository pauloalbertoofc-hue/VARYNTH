import type { AthenaContext } from "../domain/context";
import type { AthenaTask } from "../domain/task";
import type { AthenaWorkflow } from "../domain/workflow";
import { CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION, CURRENT_INTERACTION_CONTRACT_VERSION, CURRENT_TOOL_CONTRACT_VERSION } from "../domain/contract-versions";
import { capabilityPlanBuilder } from "../runtime/capability-plan-builder";
import { CapabilityPlanRuntime } from "../runtime/capability-plan-runtime";
import { CapabilityPlanStore } from "../runtime/capability-plan-store";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = new Date().toISOString();
const task: AthenaTask = {
  id: "versioning-task", title: "Versioning", rawPrompt: "Atualizar tarefa", type: "ACTION_FAST",
  priority: "media", status: "CREATED", scope: "geral", entities: {}, createdAt: now, updatedAt: now,
};
const context: AthenaContext = {
  scope: "geral", relevantProjects: [], relevantTasks: [], relevantVaultItems: [], relevantChronosEvents: [],
  relevantTheses: [], relevantEvidences: [], relevantOpportunities: [], systemTime: now,
};
const workflow: AthenaWorkflow = {
  id: "versioning-workflow", taskId: task.id, name: "Versioning", plannerId: "test", status: "PENDING",
  currentStepIndex: 0, createdAt: now,
  steps: [{ id: "update", name: "Update", status: "PENDING", toolCall: { toolName: "tasks.update", params: { taskId: "task-versioned", title: "Atualizada" } } }],
};

function installLocalStorage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    },
    dispatchEvent: () => undefined,
  } });
  return values;
}

async function run(): Promise<void> {
  const previousWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  const built = capabilityPlanBuilder.approve(capabilityPlanBuilder.build(task, workflow, context), "HUMAN");
  const confirmationStore = new CapabilityPlanStore();
  confirmationStore.clear();
  const confirmationRuntime = new CapabilityPlanRuntime(confirmationStore);
  confirmationRuntime.register(built);
  const current = confirmationRuntime.confirmStep(built.id, built.steps[0].id);
  assert(current.schemaVersion === CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION, "New plans must declare the current storage schema");
  assert(current.interactionContractVersion === CURRENT_INTERACTION_CONTRACT_VERSION && current.toolContractVersions["tasks.update"] === CURRENT_TOOL_CONTRACT_VERSION, "New plans must pin interaction and tool contract versions");

  const legacy = { ...current } as Record<string, unknown>;
  delete legacy.schemaVersion;
  delete legacy.interactionContractVersion;
  delete legacy.toolContractVersions;
  const legacyHash = current.planHash;
  const legacyApproval = current.approvedHash;
  const values = installLocalStorage({ varynth_capability_plans_v1: JSON.stringify([legacy]) });
  const migratedStore = new CapabilityPlanStore();
  const migrated = migratedStore.get(current.id)!;
  assert(migrated.schemaVersion === CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION && migrated.migration?.fromVersion === 1, "Version 1 plans must migrate to the current schema");
  assert(migrated.planHash === legacyHash && migrated.approvedHash === legacyApproval && migrated.steps[0].confirmation?.token === current.steps[0].confirmation?.token && migrated.steps[0].supportsUndo, "A structural migration must preserve hash, approval, confirmation and undo contract");
  assert(migratedStore.getLoadHealth().migratedEntries === 1 && migratedStore.getLoadHealth().backupCreated, "Migration diagnostics must report conversion and local backup");
  assert(Boolean(values.get("varynth_capability_plans_pre_migration_backup_v1")) && !values.has("varynth_capability_plans_migration_in_progress_v1"), "Migration must retain its backup and clear the transaction marker only after commit");

  const interruptedValues = installLocalStorage({
    varynth_capability_plans_v1: "{partial-write",
    varynth_capability_plans_pre_migration_backup_v1: JSON.stringify([legacy]),
    varynth_capability_plans_migration_in_progress_v1: JSON.stringify({ fromVersion: 1, toVersion: 2 }),
  });
  const interruptedRecovery = new CapabilityPlanStore();
  assert(interruptedRecovery.get(current.id)?.schemaVersion === CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION, "Interrupted migration must resume from the local backup");
  assert(!interruptedValues.has("varynth_capability_plans_migration_in_progress_v1"), "Recovered migration must clear its transaction marker after commit");

  installLocalStorage({ varynth_capability_plans_v1: JSON.stringify([{ ...current, schemaVersion: CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION + 1 }]) });
  const futureStore = new CapabilityPlanStore();
  assert(futureStore.list().length === 0 && !futureStore.getLoadHealth().healthy && futureStore.getLoadHealth().rejectedEntries === 1, "Future schema versions must be rejected fail-closed");

  const writableStore = new CapabilityPlanStore();
  let downgradeRejected = false;
  try { writableStore.save({ ...current, schemaVersion: 1 }); } catch (error) { downgradeRejected = String(error).includes("CAPABILITY_PLAN_SCHEMA_WRITE_REJECTED"); }
  assert(downgradeRejected, "Writing an older schema must be rejected");

  const runtimeStore = new CapabilityPlanStore();
  runtimeStore.clear();
  const runtime = new CapabilityPlanRuntime(runtimeStore);
  assert(!runtime.reconcile({ ...current, interactionContractVersion: CURRENT_INTERACTION_CONTRACT_VERSION + 1 }).valid, "Future interaction contracts must not execute");
  assert(!runtime.reconcile({ ...current, toolContractVersions: { ...current.toolContractVersions, "tasks.update": CURRENT_TOOL_CONTRACT_VERSION + 1 } }).valid, "Future tool contracts must not execute");

  if (previousWindow === undefined) Reflect.deleteProperty(globalThis, "window");
  else Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: previousWindow });
  console.log("✓ Contract and plan versions, transactional backup, migration recovery, downgrade and future-version rejection verified");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
