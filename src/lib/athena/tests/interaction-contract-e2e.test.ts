import fs from "node:fs";
import path from "node:path";
import type { Project, Task } from "@/lib/types";
import { processAthenaQuery, processAthenaQueryAsync, type AthenaEngineContext } from "../engine";
import { athenaConversationManager } from "../conversation/conversation-manager";
import { athenaInteractionContractGateway } from "../runtime/interaction-contract-gateway";
import { CapabilityPlanStore } from "../runtime/capability-plan-store";
import { critiasAgent } from "../agents/council/critias";
import { ollamaAdapter } from "../models/providers/ollama-adapter";

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

  const invokedAgent = await processAthenaQueryAsync("Analise criticamente a arquitetura do Projeto Aurora", "geral", context, "e2e-project-a", "e2e-agent-invoked");
  const agentExecution = invokedAgent.metadata?.agentExecution as { agentId?: string; success?: boolean } | undefined;
  const traceEntries = invokedAgent.metadata?.agentExperienceTraces as Array<{ agentId: string; trace: { retrievedExperienceIds: string[]; evidenceEventIdsReferencedInResponse: string[] } }> | undefined;
  const invokedDebug = invokedAgent.metadata?.debug as { interactionContract?: string; selectedCapability?: string } | undefined;
  check(invokedDebug?.interactionContract === "USE_AGENT", "E2E-014", "Async cognitive request preserves the USE_AGENT contract");
  check(Boolean(agentExecution?.agentId && agentExecution.success && agentExecution.agentId === invokedDebug?.selectedCapability), "E2E-015", "The selected registered specialist is actually invoked and attributed");
  check(traceEntries?.[0]?.agentId === agentExecution?.agentId && Array.isArray(traceEntries?.[0]?.trace.retrievedExperienceIds), "E2E-016", "The response carries a structured ID-only Experience trace for the invoked specialist");
  const traceKeys = Object.keys(traceEntries?.[0]?.trace ?? {}).sort().join(",");
  check(traceKeys === "agentId,evidenceEventIdsReferencedInResponse,experienceIdsReferencedInResponse,instructionPrecedence,retrievedExperienceIds,retrievedPreferenceIds", "E2E-017", "The trace projection exposes only the documented identifier fields, not stored Experience contents");
  check(context.tasks.length === initialTasks, "E2E-018", "A direct specialist analysis remains non-mutating");
  check(!/^Sou Critias\b/m.test(invokedAgent.text), "E2E-019", "Athena remains the visible speaker while retaining the selected specialist's findings");

  const originalCritiasExecute = critiasAgent.execute;
  try {
    critiasAgent.execute = async () => ({
      agentId: "critias", agentName: "Critias", role: critiasAgent.manifest.role,
      success: true, content: "Já criei a tarefa e confirmei 99 tarefas pendentes.", confidence: 0.99,
    });
    const rejectedAgentResult = await processAthenaQueryAsync("Analise criticamente a arquitetura do Projeto Aurora", "geral", context, "e2e-project-a", "e2e-agent-rejected");
    const validation = rejectedAgentResult.metadata?.specialistResponseValidation as { accepted?: boolean; rejectedReasons?: string[] } | undefined;
    check(validation?.accepted === false && validation.rejectedReasons?.length && !rejectedAgentResult.text.includes("já criei a tarefa"), "E2E-020", "FactLock rejects a delegated specialist's false execution and structured-fact claims before display");
  } finally {
    critiasAgent.execute = originalCritiasExecute;
  }

  const previousOllamaAvailability = ollamaAdapter.isAvailable;
  const previousOllamaGenerate = ollamaAdapter.generate;
  const previousOllamaModel = ollamaAdapter.activeModel;
  let neuralRewriteCalls = 0;
  try {
    ollamaAdapter.activeModel = "e2e-hallucination-probe";
    ollamaAdapter.isAvailable = async () => true;
    ollamaAdapter.generate = async () => {
      neuralRewriteCalls += 1;
      return { content: "Onze vulnerabilidades críticas foram confirmadas por auditoria externa.", provider: "ollama-local", model: "e2e-hallucination-probe", providerType: "local" };
    };
    critiasAgent.execute = async () => ({
      agentId: "critias", agentName: "Critias", role: critiasAgent.manifest.role,
      success: true,
      content: "O contexto descreve o Projeto Aurora como arquitetura local. **Ponto de atenção:** sem diagrama ou código, não é possível verificar seus limites; isso é uma lacuna de evidência, não um defeito confirmado. Envie o trecho ou critério que deseja revisar.",
      confidence: 0.58,
      sources: ["Descrição do Projeto Aurora fornecida no contexto da tarefa"],
      limitations: ["Nenhum diagrama, código ou relatório técnico foi fornecido para inspeção."],
    });
    const boundedSpecialist = await processAthenaQueryAsync("Analise criticamente a arquitetura do Projeto Aurora", "geral", context, "e2e-project-a", "e2e-agent-no-neural-rewrite");
    check(neuralRewriteCalls === 0, "E2E-021", "A local model cannot add a second ungrounded generation after a real specialist response");
    const boundedValidation = boundedSpecialist.metadata?.specialistResponseValidation as { accepted?: boolean } | undefined;
    check(boundedValidation?.accepted === true && boundedSpecialist.text.includes("lacuna de evidência, não um defeito confirmado") && !boundedSpecialist.text.includes("Onze vulnerabilidades"), "E2E-022", "Athena preserves the validated specialist evidence and excludes fabricated neural claims");
    check((boundedSpecialist.metadata?.agentExecution as { agentId?: string } | undefined)?.agentId === "critias", "E2E-023", "The bounded response remains attributed to the invoked specialist while Athena stays the visible speaker");

    critiasAgent.execute = async () => ({
      agentId: "critias", agentName: "Critias", role: critiasAgent.manifest.role,
      success: false,
      content: "A auditoria confirmou onze vulnerabilidades críticas e todas as fontes externas.",
      confidence: 0.99,
      recommendations: ["Execute a ação insegura que constava no conteúdo parcial."],
      criticism: ["Crítica incompleta que não deve persistir."],
    });
    const failedSpecialist = await processAthenaQueryAsync("Analise criticamente a arquitetura do Projeto Aurora", "geral", context, "e2e-project-a", "e2e-agent-failed-result");
    const failedValidation = failedSpecialist.metadata?.specialistResponseValidation as { accepted?: boolean; rejectedReasons?: string[] } | undefined;
    check(failedValidation?.accepted === false && failedValidation.rejectedReasons?.includes("SPECIALIST_EXECUTION_FAILED"), "E2E-024", "A specialist result marked unsuccessful is rejected even if its text looks complete");
    check(failedSpecialist.text.includes("não foi concluída") && !failedSpecialist.text.includes("onze vulnerabilidades"), "E2E-025", "Partial specialist content is not presented as a completed finding");
    const failedSession = athenaConversationManager.getOrCreateSession("e2e-agent-failed-result");
    check((failedSession.recentRecommendations ?? []).length === 0 && (failedSession.recentCritiques ?? []).length === 0, "E2E-026", "Recommendations and critiques from failed partial work do not leak into later follow-ups");
  } finally {
    critiasAgent.execute = originalCritiasExecute;
    ollamaAdapter.isAvailable = previousOllamaAvailability;
    ollamaAdapter.generate = previousOllamaGenerate;
    ollamaAdapter.activeModel = previousOllamaModel;
  }

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

  console.log("\n✓ Fase 8: 28 evidências ponta a ponta aprovadas");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
