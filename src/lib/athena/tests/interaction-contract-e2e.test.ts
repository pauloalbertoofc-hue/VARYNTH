import fs from "node:fs";
import path from "node:path";
import type { Project, Task } from "@/lib/types";
import { processAthenaQuery, processAthenaQueryAsync, type AthenaEngineContext } from "../engine";
import { athenaConversationManager } from "../conversation/conversation-manager";
import { athenaInteractionContractGateway } from "../runtime/interaction-contract-gateway";
import { CapabilityPlanStore } from "../runtime/capability-plan-store";

function check(condition: unknown, id: string, description: string): asserts condition {
  if (!condition) throw new Error(`[${id}] ${description}`);
  console.log(`✓ [${id}] ${description}`);
}

function createContext(): AthenaEngineContext {
  const projects = [
    { id: "e2e-project-a", title: "Projeto Aurora", description: "Arquitetura local", category: "software", status: "ativo", priority: "alta", progress: 40, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z", tags: ["local"] },
    { id: "e2e-project-b", title: "Projeto Boreal", description: "Pesquisa jurídica", category: "pesquisa", status: "ativo", priority: "media", progress: 20, createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z", tags: ["jurídico"] },
  ] as Project[];
  const tasks = [
    { id: "e2e-task-a", title: "Revisar arquitetura", projectId: "e2e-project-a", priority: "alta", status: "a_fazer", createdAt: "2026-09-01T00:00:00.000Z" },
    { id: "e2e-task-b", title: "Revisar precedentes", projectId: "e2e-project-b", priority: "media", status: "a_fazer", createdAt: "2026-09-01T00:00:00.000Z" },
  ] as Task[];
  return {
    projects, tasks, vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [],
    addTask: (data) => {
      const created = { ...data, id: `e2e-created-${tasks.length}`, createdAt: new Date().toISOString() } as Task;
      tasks.push(created);
      return created;
    },
    deleteTask: (id) => {
      const index = tasks.findIndex((task) => task.id === id);
      if (index >= 0) tasks.splice(index, 1);
    },
    addNote: (data) => ({ ...data, id: "e2e-note", createdAt: new Date().toISOString() }),
  };
}

async function run(): Promise<void> {
  const context = createContext();
  athenaInteractionContractGateway.clearTelemetry();

  const initialTasks = context.tasks.length;
  const self = processAthenaQuery("Oi, Athena. Como você está?", "geral", context, undefined, "e2e-self");
  check(self.metadata?.interactionContract === "ANSWER_SELF", "E2E-001", "ANSWER_SELF atravessa roteador e gateway");
  check(context.tasks.length === initialTasks && self.text.length > 0, "E2E-002", "ANSWER_SELF responde sem mutação ou ferramenta");

  const agent = processAthenaQuery("Analise criticamente a arquitetura do Projeto Aurora", "geral", context, "e2e-project-a", "e2e-agent");
  check(agent.metadata?.interactionContract === "USE_AGENT", "E2E-003", "USE_AGENT seleciona o caminho cognitivo");
  check(Boolean(agent.metadata?.selectedCapability), "E2E-004", "USE_AGENT expõe a capacidade selecionada sem autoridade de mutação");
  check(context.tasks.length === initialTasks, "E2E-005", "USE_AGENT preserva o estado operacional");

  const tool = await processAthenaQueryAsync("Crie uma tarefa chamada Validar contrato ponta a ponta", "geral", context, "e2e-project-a", "e2e-tool");
  check(tool.metadata?.interactionContract === "USE_TOOL", "E2E-006", "USE_TOOL atravessa planejamento e executor persistente");
  check(tool.metadata?.capabilityPlanStatus === "COMPLETED" && context.tasks.length === initialTasks + 1, "E2E-007", "USE_TOOL apresenta somente a mutação realmente concluída");
  check(Boolean(tool.metadata?.capabilityPlanId && tool.metadata?.capabilityPlanHash), "E2E-008", "Resultado expõe identidade e hash auditáveis do plano");

  const sessionA = "e2e-isolation-a";
  const sessionB = "e2e-isolation-b";
  processAthenaQuery("Vamos focar no Projeto Aurora", "geral", context, undefined, sessionA);
  processAthenaQuery("Vamos focar no Projeto Boreal", "geral", context, undefined, sessionB);
  check(
    athenaConversationManager.getOrCreateSession(sessionA).currentProjectId === "e2e-project-a" &&
      athenaConversationManager.getOrCreateSession(sessionB).currentProjectId === "e2e-project-b",
    "E2E-009",
    "Projetos e conversas permanecem isolados entre sessões"
  );

  const firstStore = new CapabilityPlanStore();
  const persisted = firstStore.list().find((plan) => plan.id === tool.metadata?.capabilityPlanId);
  const reloadedStore = new CapabilityPlanStore();
  check(Boolean(persisted && reloadedStore.get(persisted.id)?.planHash === persisted.planHash), "E2E-010", "Plano permanece recuperável após reinstanciar o armazenamento local");

  const telemetry = athenaInteractionContractGateway.recentTelemetry();
  for (const contract of ["ANSWER_SELF", "USE_AGENT", "USE_TOOL"] as const) {
    check(telemetry.some((event) => event.contract === contract && event.status === "COMPLETED"), `E2E-011-${contract}`, `${contract} registra conclusão no diagnóstico local`);
  }

  const panel = fs.readFileSync(path.resolve(process.cwd(), "src/components/athena/AthenaCapabilityPlanPanel.tsx"), "utf8");
  check(panel.includes("Confirmar {step.name}") && panel.includes("Reverter alterações") && panel.includes("Reconciliar e retomar"), "E2E-012", "Interface expõe confirmação, retomada e reversão governadas");
  check(!panel.includes("fetch(") && !panel.includes("/api/"), "E2E-013", "Interface de planos permanece local e sem API de rede");

  console.log("\n✓ Fase 8: 15 evidências ponta a ponta aprovadas");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
