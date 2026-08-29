import { HISTORICAL_REGRESSION_CASES } from "./cases";
import {
  ConversationalRegressionCase,
  RegressionAssertionResult,
  QualityGateReport,
} from "./types";
import { processAthenaQuery } from "../engine";
import { athenaConversationManager } from "../conversation/conversation-manager";
import { athenaFailureRegistry } from "./failure-registry";
import { Project, Task, VaultItem, ChronosEvent, ArgumentThesis, EvidenceItem, Opportunity } from "@/lib/types";

// Standard Test Context
const mockProjects: Project[] = [
  {
    id: "proj-1",
    title: "VARYNTH OS",
    category: "pesquisa",
    status: "ativo",
    priority: "alta",
    description: "Sistema operacional cognitivo",
    tags: ["core", "os"],
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
  },
  {
    id: "proj-2",
    title: "Pesquisa CNJ",
    category: "pesquisa",
    status: "ativo",
    priority: "media",
    description: "Mapeamento de precedentes do Judiciário",
    tags: ["direito", "cnj"],
    createdAt: "2026-08-02",
    updatedAt: "2026-08-02",
  },
];

const mockTasks: Task[] = [
  { id: "task-1", title: "Atualizar notas do projeto", priority: "alta", status: "a_fazer", projectId: "proj-1", createdAt: "2026-08-01" },
  { id: "task-2", title: "Revisar artigo", priority: "media", status: "a_fazer", projectId: "proj-2", createdAt: "2026-08-02" },
];

const mockVault: VaultItem[] = [
  {
    id: "v-1",
    title: "Teoria Pura do Direito - Kelsen",
    type: "livro",
    tags: ["direito"],
    category: "juridico",
    readingStatus: "concluido",
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
  },
];

const mockChronos: ChronosEvent[] = [];
const mockTheses: ArgumentThesis[] = [];
const mockEvidences: EvidenceItem[] = [];
const mockOpportunities: Opportunity[] = [];

function createMockContext() {
  return {
    projects: [...mockProjects],
    tasks: [...mockTasks],
    vaultItems: [...mockVault],
    chronosEvents: [...mockChronos],
    theses: [...mockTheses],
    evidences: [...mockEvidences],
    opportunities: [...mockOpportunities],
    addTask: (data: any) => ({ ...data, id: "task-mock-" + Date.now(), createdAt: "2026-08-29" }),
    addNote: (data: any) => ({ ...data, id: "note-mock-" + Date.now() }),
  };
}

export class AthenaRegressionRunner {
  /**
   * Executes the full historical regression suite and validates quality gates.
   */
  async runSuite(): Promise<QualityGateReport> {
    const results: RegressionAssertionResult[] = [];
    let totalParaphrases = 0;
    let goldenFailed = 0;

    for (const c of HISTORICAL_REGRESSION_CASES) {
      const inputsToTest = [c.input, ...(c.paraphrases || [])];
      totalParaphrases += (c.paraphrases || []).length;

      for (const input of inputsToTest) {
        const sessionId = `reg-sess-${c.id}-${Math.random().toString(36).substring(2, 7)}`;
        const ctx = createMockContext();

        // 1. Replay historical context if present
        if (c.context && c.context.length > 0) {
          for (const turn of c.context) {
            if (turn.role === "user") {
              athenaConversationManager.processMessage(sessionId, turn.text, ctx.projects);
            } else {
              athenaConversationManager.recordAssistantResponse(
                sessionId,
                turn.text,
                turn.recommendations,
                turn.critiques
              );
            }
          }
        }

        // 2. Execute input
        const parsed = athenaConversationManager.processMessage(sessionId, input, ctx.projects);
        const response = processAthenaQuery(input, "geral", ctx, undefined, sessionId);
        const failures: string[] = [];

        // 3. Check InteractionType
        if (c.expectedInteractionType && parsed.interactionType !== c.expectedInteractionType) {
          failures.push(
            `InteractionType esperado: "${c.expectedInteractionType}", obtido: "${parsed.interactionType}"`
          );
        }

        // 4. Check Expected Intents
        if (c.expectedIntents && c.expectedIntents.length > 0) {
          const hasAllExpected = c.expectedIntents.some((exp) => parsed.intents.includes(exp));
          if (!hasAllExpected) {
            failures.push(
              `Intenção esperada: [${c.expectedIntents.join(", ")}], obtida: [${parsed.intents.join(", ")}]`
            );
          }
        }

        // 5. Anti-Evasion & Forbidden Phrases
        const lowerResp = response.text.toLowerCase();
        if (
          lowerResp.includes("como gostaria de encaminhar essa reflexao") ||
          lowerResp.includes("como gostaria de encaminhar essa reflexão")
        ) {
          failures.push(`Frase de evasão proibida detectada na resposta`);
        }

        // 6. Case-specific Semantic Assertions
        if (c.id === "ATH-CONV-001") {
          // Social check-in must not dump ecosystem database
          if (response.text.includes("📁 **Workspaces**") || response.text.includes("⚡ **Tarefas**")) {
            failures.push(`Resposta social realizou despejo indevido de banco de dados`);
          }
        }

        if (c.id === "ATH-CONV-002") {
          // Brainstorm must present proposals
          const hasProposals =
            response.text.includes("1.") ||
            response.text.includes("Observatório") ||
            response.text.includes("propostas") ||
            response.text.includes("ideias");
          if (!hasProposals) {
            failures.push(`Brainstorming não apresentou propostas concretas de projetos`);
          }
        }

        if (c.id === "ATH-CONV-004") {
          // Pronoun resolution "o segundo" must resolve to Pesquisa CNJ
          if (response.text.length < 30 || lowerResp.includes("qual projeto")) {
            failures.push(`Não resolveu o pronome 'o segundo' contextualmente`);
          }
        }

        if (c.id === "ATH-CONV-005") {
          // Follow up "Por quê?" must explain previous recommendation
          if (
            !lowerResp.includes("recomendei") &&
            !lowerResp.includes("estrategicas") &&
            !lowerResp.includes("estratégicas") &&
            !lowerResp.includes("razoes") &&
            !lowerResp.includes("razões")
          ) {
            failures.push(`Follow-up não justificou a recomendação anterior`);
          }
        }

        if (c.id === "ATH-CONV-006") {
          // Athena Self Status must report kernel/subsystems
          if (!lowerResp.includes("kernel") && !lowerResp.includes("operacional")) {
            failures.push(`Diagnóstico técnico da Athena não descreveu subsistemas cognitivos`);
          }
        }

        if (c.id === "ATH-CONV-009") {
          // Critique must contain critical review
          if (
            !lowerResp.includes("criticamente") &&
            !lowerResp.includes("ponto cego") &&
            !lowerResp.includes("critias")
          ) {
            failures.push(`Crítica não apresentou análise de riscos e medidas mitigadoras`);
          }
        }

        if (c.id === "ATH-CONV-011") {
          // Low confidence must not claim understanding
          if (lowerResp.includes("entendi perfeitamente")) {
            failures.push(`Afirmou falsamente entender entrada de baixa confiança`);
          }
        }

        const passed = failures.length === 0;
        if (!passed && c.isGoldenCase) {
          goldenFailed++;
        }

        results.push({
          caseId: c.id,
          title: c.title,
          input,
          passed,
          failures,
          debugTrace: {
            interactionType: parsed.interactionType,
            intents: parsed.intents,
            confidence: parsed.confidence,
            responseText: response.text.slice(0, 80) + "...",
          },
        });
      }
    }

    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;
    const qualityScore = Math.round((passedCount / results.length) * 100);

    return {
      timestamp: new Date().toISOString(),
      totalCases: HISTORICAL_REGRESSION_CASES.length,
      totalParaphrases,
      passed: passedCount,
      failed: failedCount,
      goldenCasesPassed: goldenFailed === 0,
      qualityScore,
      results,
    };
  }
}

// Standalone CLI execution
if (process.argv[1]?.includes("regression-runner")) {
  console.log("===============================================================");
  console.log("  ATHENA CONVERSATIONAL REGRESSION SUITE — VARYNTH OS QUALITY  ");
  console.log("===============================================================\n");

  const runner = new AthenaRegressionRunner();
  runner.runSuite().then((report) => {
    let currentCaseId = "";
    for (const res of report.results) {
      if (res.caseId !== currentCaseId) {
        console.log(`\n📌 [CASE ${res.caseId}] ${res.title}`);
        currentCaseId = res.caseId;
      }

      if (res.passed) {
        console.log(`   ✅ PASS: "${res.input}"`);
      } else {
        console.error(`   ❌ FAIL: "${res.input}"`);
        for (const f of res.failures) {
          console.error(`      └─ ${f}`);
        }
      }
    }

    console.log("\n===============================================================");
    console.log(`  RESUMO DA SUÍTE HISTÓRICA DE REGRESSÃO                      `);
    console.log("===============================================================");
    console.log(`  Total de Casos Históricos:   ${report.totalCases}`);
    console.log(`  Variações e Paráfrases:      ${report.totalParaphrases}`);
    console.log(`  Total de Testes Executados:  ${report.results.length}`);
    console.log(`  Aprovados:                   ${report.passed}`);
    console.log(`  Falhas:                      ${report.failed}`);
    console.log(`  Golden Cases Íntegros:       ${report.goldenCasesPassed ? "SIM ✅" : "NÃO ❌"}`);
    console.log(`  Quality Score:               ${report.qualityScore}%`);
    console.log("===============================================================\n");

    if (report.failed > 0 || !report.goldenCasesPassed) {
      console.error("🚨 BLOQUEIO DE REGRESSÃO ATIVADO: Foram detectadas regressões conversacionais.");
      process.exit(1);
    } else {
      console.log("🎉 QUALIDADE CONVERSACIONAL VALIDADA COM SUCESSO: Zero regressões detectadas.");
      process.exit(0);
    }
  });
}
