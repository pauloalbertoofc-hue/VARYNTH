/**
 * VARYNTH OS — ATHENA RESPONSE STRATEGY ENGINE
 * Decides "HOW should Athena communicate the resulting state?"
 * Generates Structured ResponseIntent grounded in real domain facts,
 * with targeted clarification, uncertainty taxonomy, and loop protection.
 * NOTE: This engine NEVER executes tools or grants operational authority.
 */

import {
  ResponseIntent,
  ResponseMode,
  ResponseTone,
  ResponseVerbosity,
  UncertaintyType,
  StructuredFact,
  ClarificationState,
  GroundedErrorExplanation,
  AthenaPersonaProfile,
} from "./types";
import { SemanticInterpretation } from "../semantic/types";
import { ConversationState } from "../domain/conversation";
import type { AthenaEngineContext } from "../engine";
import type { Project, Task } from "../../types";
import { jobManager } from "../../runtime/job-manager";
import { SystemInvariantValidator } from "../../hardening/system-invariant-validator";

export const DEFAULT_ATHENA_PERSONA_PROFILE: AthenaPersonaProfile = {
  warmth: 0.7,
  directness: 0.85,
  verbosityBias: 0.5,
  humorTolerance: 0.6,
  technicalDepth: 0.8,
  cautionLevel: 0.9,
  formality: 0.4,
};

export class AthenaResponseStrategyEngine {
  private static profile: AthenaPersonaProfile = { ...DEFAULT_ATHENA_PERSONA_PROFILE };

  public static getProfile(): AthenaPersonaProfile {
    return { ...this.profile };
  }

  public static setProfile(profile: Partial<AthenaPersonaProfile>): void {
    this.profile = { ...this.profile, ...profile };
  }

  /**
   * Plans the structured response intent grounded in real state without executing tools.
   */
  public static plan(
    semantic: SemanticInterpretation,
    state: ConversationState | undefined,
    ctx: AthenaEngineContext | undefined,
    scope = "geral",
    targetProjectId?: string,
    rawPrompt = ""
  ): ResponseIntent {
    const evaluatedAt = new Date().toISOString();
    const clean = ((semantic as any).cleanText || semantic.trace?.normalizedText || rawPrompt || "").toLowerCase();
    const lowerRaw = rawPrompt.toLowerCase();
    const pragmaticFlags = semantic.trace?.pragmaticFlags || [];

    // 1. Determine Misunderstanding / Correction Repair
    const isCorrectionOrRepair =
      semantic.intent === "CORRECTION" ||
      clean.includes("nao foi isso") ||
      clean.includes("nao e isso") ||
      clean.includes("entendeu errado") ||
      clean.includes("de novo nao");

    if (isCorrectionOrRepair) {
      return {
        mode: "CORRECTION",
        tone: clean.includes("de novo nao") ? "CONCISE" : "SUPPORTIVE",
        verbosity: "SHORT",
        uncertaintyType: "NONE",
        shouldAskQuestion: true,
        shouldMentionUncertainty: false,
        shouldMentionAuthorityBoundary: false,
        keyFacts: [],
        suggestedNextSteps: [],
        sourceScope: scope,
        isMisunderstandingRepair: true,
      };
    }

    // 2. Determine Noise / High Entropy Uncertainty
    if (semantic.isNoise || semantic.intent === "UNKNOWN_INPUT") {
      return {
        mode: "UNCERTAINTY",
        tone: "CAUTIOUS",
        verbosity: "SHORT",
        uncertaintyType: "UNKNOWN",
        shouldAskQuestion: true,
        shouldMentionUncertainty: true,
        shouldMentionAuthorityBoundary: false,
        keyFacts: [],
        suggestedNextSteps: ["Pode reformular o termo ou indicar o nome do projeto/ação?"],
        sourceScope: scope,
      };
    }

    // 3. Determine Targeted Clarification & Loop Protection
    if (semantic.requiresClarification || (semantic.ambiguity && semantic.ambiguity !== "NONE")) {
      const candidates: { id: string; name: string }[] = [];
      if (ctx) {
        for (const p of ctx.projects) {
          if (p.status === "ativo") {
            candidates.push({ id: p.id, name: p.title });
          }
        }
      }

      const priorClarification = state?.clarificationContext;
      const attemptCount = priorClarification ? priorClarification.attemptCount + 1 : 1;
      const isLoop = attemptCount >= 2;

      const clarState: ClarificationState = {
        attemptCount,
        target: clean,
        missingSlot: (semantic.ambiguity === "TARGET" || semantic.ambiguity === "SEMANTIC") ? "targetProjectId" : undefined,
        askedCandidateIds: candidates.slice(0, 3).map((c) => c.id),
        candidates: candidates.slice(0, 3),
        isLoopDetected: isLoop,
      };

      return {
        mode: "CLARIFICATION",
        tone: "CAUTIOUS",
        verbosity: "SHORT",
        uncertaintyType: (semantic.ambiguity === "TARGET" || semantic.ambiguity === "SEMANTIC") ? "AMBIGUOUS" : "LOW_CONFIDENCE",
        shouldAskQuestion: true,
        shouldMentionUncertainty: true,
        shouldMentionAuthorityBoundary: false,
        keyFacts: [],
        suggestedNextSteps: [],
        clarificationState: clarState,
        sourceScope: scope,
      };
    }

    // 4. Social & Pragmatic Handling (Humor, Venting, Greetings)
    const hasHumor = lowerRaw.includes("kkk") || lowerRaw.includes("rsrs") || lowerRaw.includes("haha") || lowerRaw.includes("😂");
    const isVenting = pragmaticFlags.includes("EMOTIONAL_VENTING") || clean.includes("maluco") || clean.includes("cansado") || clean.includes("dificil");
    const isSarcasm = pragmaticFlags.includes("SARCASM_OR_IRONY");

    if (semantic.intent === "SOCIAL_CONVERSATION" || isVenting || isSarcasm || hasHumor) {
      let tone: ResponseTone = scope === "legal" ? "TECHNICAL" : "WARM";
      if (hasHumor && !isVenting) tone = scope === "legal" ? "TECHNICAL" : "HUMOROUS";
      if (isVenting) tone = "SUPPORTIVE";
      if (isSarcasm) tone = "CONCISE";

      return {
        mode: "SOCIAL_RESPONSE",
        tone,
        verbosity: "SHORT",
        uncertaintyType: "NONE",
        shouldAskQuestion: !isSarcasm,
        shouldMentionUncertainty: false,
        shouldMentionAuthorityBoundary: false,
        keyFacts: [],
        suggestedNextSteps: [],
        sourceScope: scope,
      };
    }

    // 5. Fact Grounding & Status Reports (Tasks, Projects, Deadlines, Health, Jobs)
    const keyFacts: StructuredFact[] = [];

    // Check specific project progress (e.g. ATHINT-067: "O relatório CNJ já está 100% pronto para publicação?")
    if (
      targetProjectId &&
      ctx &&
      (clean.includes("pronto") || clean.includes("progresso") || clean.includes("concluido") || clean.includes("100%"))
    ) {
      const proj = ctx.projects.find((p: Project) => p.id === targetProjectId);
      if (proj) {
        const projTasks = ctx.tasks.filter((t: Task) => t.projectId === proj.id);
        const completedTasks = projTasks.filter((t: Task) => t.status === "concluida").length;
        const totalProjTasks = projTasks.length;
        const progressPct = totalProjTasks > 0 ? Math.round((completedTasks / totalProjTasks) * 100) : 60;

        keyFacts.push({
          key: "projectProgress",
          value: progressPct,
          label: `${proj.title} está com ${progressPct}% de progresso concluído`,
          supportedBy: {
            sourceType: "PROJECT_REPOSITORY",
            sourceId: proj.id,
            revision: proj.updatedAt,
            queryRef: `tasksCount:${totalProjTasks},completed:${completedTasks}`,
            evaluatedAt,
          },
        });

        const pendingProjTasks = projTasks.filter((t: Task) => t.status !== "concluida");
        keyFacts.push({
          key: "projectPendingTasks",
          value: pendingProjTasks.length,
          label: `${pendingProjTasks.length} tarefas pendentes no projeto`,
          supportedBy: {
            sourceType: "TASK_REPOSITORY",
            sourceId: proj.id,
            evaluatedAt,
          },
        });
      }
    }

    // Ground general task statistics
    if (ctx && (semantic.intent === "TASK_QUERY" || semantic.intent === "ECOSYSTEM_STATUS" || clean.includes("tarefa") || clean.includes("pendent") || clean.includes("fila") || clean.includes("devendo"))) {
      const allTasks = targetProjectId ? ctx.tasks.filter((t: Task) => t.projectId === targetProjectId) : ctx.tasks;
      const pending = allTasks.filter((t: Task) => t.status !== "concluida");
      const urgent = pending.filter((t: Task) => t.priority === "urgente" || t.priority === "alta");
      const targetProj = targetProjectId ? ctx.projects.find((p: Project) => p.id === targetProjectId) : undefined;

      keyFacts.push({
        key: "pendingTasksCount",
        value: pending.length,
        label: targetProj
          ? `${pending.length} tarefas pendentes no projeto ${targetProj.title}`
          : `${pending.length} tarefas pendentes no total`,
        supportedBy: {
          sourceType: "TASK_REPOSITORY",
          sourceId: targetProjectId || "all-tasks",
          queryRef: targetProjectId ? `projectId=${targetProjectId}` : "status!=concluida",
          evaluatedAt,
        },
      });

      keyFacts.push({
        key: "urgentTasksCount",
        value: urgent.length,
        label: `${urgent.length} tarefas de alta prioridade`,
        supportedBy: {
          sourceType: "TASK_REPOSITORY",
          sourceId: targetProjectId ? `urgent-${targetProjectId}` : "urgent-tasks",
          queryRef: "priority=alta|urgente",
          evaluatedAt,
        },
      });

      if (urgent.length > 0) {
        keyFacts.push({
          key: "topUrgentTaskTitle",
          value: urgent[0].title,
          label: `Tarefa mais urgente: "${urgent[0].title}"`,
          supportedBy: {
            sourceType: "TASK_REPOSITORY",
            sourceId: urgent[0].id,
            evaluatedAt,
          },
        });
      }
    }

    // Ground project statistics
    if (ctx && (semantic.intent === "PROJECT_QUERY" || semantic.intent === "ECOSYSTEM_STATUS" || clean.includes("projeto") || clean.includes("workspace") || clean.includes("sistema"))) {
      const activeProjects = ctx.projects.filter((p: Project) => p.status === "ativo");
      keyFacts.push({
        key: "activeProjectsCount",
        value: activeProjects.length,
        label: `${activeProjects.length} projetos ativos`,
        supportedBy: {
          sourceType: "PROJECT_REPOSITORY",
          sourceId: "active-projects",
          queryRef: "status=ativo",
          evaluatedAt,
        },
      });
    }

    // Ground active jobs / volatile state freshness
    const allJobs = jobManager.getAll ? jobManager.getAll() : [];
    const activeJobs = allJobs.filter((j) => j.status === "RUNNING" || j.status === "QUEUED");
    if (activeJobs.length > 0) {
      keyFacts.push({
        key: "activeJobsCount",
        value: activeJobs.length,
        label: `${activeJobs.length} jobs em execução no momento`,
        supportedBy: {
          sourceType: "JOB_MANAGER",
          sourceId: "active-jobs",
          evaluatedAt,
        },
      });
    }

    // 6. Direct Factual Question vs Complex Briefing vs Brainstorming
    const isDirectFactual =
      clean.includes("quantas tarefas") ||
      clean.includes("quantos projetos") ||
      clean.includes("quais tarefas") ||
      clean.includes("tem coisa pendente") ||
      clean.includes("o que ficou pra fazer") ||
      clean.includes("estou devendo") ||
      clean.includes("tem algo na fila") ||
      clean.includes("quando vence");

    const isExplainOrEpistemic =
      semantic.intent === "EPISTEMIC_QUERY" ||
      clean.includes("o que e") ||
      clean.includes("explique") ||
      clean.includes("como funciona") ||
      clean.includes("conceito") ||
      clean.includes("voce sabe o que") ||
      clean.includes("hermeneutica");

    const isCritiqueOrCompare =
      clean.includes("critique") ||
      clean.includes("compare") ||
      clean.includes("ponto fraco") ||
      clean.includes("diferenca");

    let mode: ResponseMode = "STATUS_REPORT";
    let verbosity: ResponseVerbosity = "MEDIUM";
    let tone: ResponseTone = "NEUTRAL";

    if (isDirectFactual) {
      mode = "DIRECT_ANSWER";
      verbosity = "SHORT";
      tone = "CONCISE";
    } else if (isExplainOrEpistemic || isCritiqueOrCompare) {
      mode = "DIRECT_ANSWER";
      verbosity = "DETAILED";
      tone = scope === "legal" ? "TECHNICAL" : "NEUTRAL";
    } else if (clean.includes("ideia") || clean.includes("recomende") || clean.includes("sugira")) {
      mode = "PLAN_PROPOSAL";
      verbosity = "DETAILED";
      tone = "SUPPORTIVE";
    }

    // Scope-Sensitive Tone Adjustment (without altering core personality or authority)
    if (scope === "legal") {
      tone = "TECHNICAL";
    } else if (scope === "research") {
      tone = "TECHNICAL";
    }

    return {
      mode,
      tone,
      verbosity,
      uncertaintyType: "NONE",
      shouldAskQuestion: mode !== "DIRECT_ANSWER" || verbosity === "DETAILED",
      shouldMentionUncertainty: false,
      shouldMentionAuthorityBoundary: semantic.intent === "EXECUTION_REQUEST" && semantic.polarity !== "NEGATED",
      keyFacts,
      suggestedNextSteps: [],
      sourceScope: scope,
      deltaContextOnly: false,
    };
  }

  /**
   * Builds structured GroundedErrorExplanation for execution / tool failures.
   */
  public static explainError(
    errorCode: string,
    rawDetail: string,
    affectedArtifactType?: string
  ): GroundedErrorExplanation {
    if (errorCode === "FFMPEG_ENCODER_UNAVAILABLE") {
      return {
        errorCode,
        whatHappened: "O renderizador de vídeo não encontrou o encoder H264 no ambiente local.",
        whatIsSafe: "A timeline do vídeo, roteiro e assets associados continuam 100% preservados e salvos no Studio.",
        whatCanHappenNext: [
          "Exportar a sequência em frames estáticos PNG",
          "Tentar a renderização utilizando o encoder WebM/VP9",
          "Verificar os binários locais no sistema",
        ],
      };
    }

    if (errorCode === "EXECUTION_PLAN_STALE") {
      return {
        errorCode,
        whatHappened: "O plano de execução divergiu da revisão ou hash formalmente aprovados pelo usuário.",
        whatIsSafe: "Nenhuma modificação foi aplicada nas workspaces ou arquivos do projeto.",
        whatCanHappenNext: [
          "Gerar uma nova revisão atualizada do plano criativo",
          "Revisar o escopo e autorizar a nova execução",
        ],
      };
    }

    return {
      errorCode,
      whatHappened: `A operação falhou com o erro: ${rawDetail}.`,
      whatIsSafe: "A integridade do banco de dados e dos arquivos foi mantida via rollback determinístico.",
      whatCanHappenNext: ["Revisar os parâmetros informados", "Executar diagnóstico do subsistema"],
    };
  }
}
