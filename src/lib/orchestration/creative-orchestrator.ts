import {
  CreativeIntent,
  CreativePlan,
  CreativeExecutionPlan,
  PlanDiff,
  PlanDiffItem,
  ApprovalScope,
  ResourceClass,
} from "./types";
import { CreativeCapabilityDiscovery } from "./capability-discovery";
import { DAGEngine } from "./dag-engine";
import { athenaEventBus } from "../athena/events/event-bus";
import { creativeGraph } from "../artifacts/creative-graph";
import { artifactStore } from "../artifacts/artifact-store";

const PLANS_STORAGE_KEY = "varynth_creative_plans_v4";

export class CreativeOrchestrator {
  private static plans: Map<string, CreativePlan> = new Map();
  private static planHistory: Map<string, CreativePlan[]> = new Map(); // planId -> historical revisions
  private static isInitialized = false;
  private static fallbackStorage: string | null = null;

  private static init(): void {
    if (this.isInitialized) return;
    let stored: string | null = this.fallbackStorage;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        stored = localStorage.getItem(PLANS_STORAGE_KEY) || stored;
      } catch (err) {
        console.warn("[CreativeOrchestrator] Erro ao carregar planos do localStorage:", err);
      }
    }
    if (stored) {
      try {
        const list: CreativePlan[] = JSON.parse(stored);
        list.forEach((p) => this.plans.set(p.id, p));
      } catch (err) {
        console.warn("[CreativeOrchestrator] Erro ao fazer parse dos planos:", err);
      }
    }
    this.isInitialized = true;
  }

  private static saveToStorage(): void {
    const list = Array.from(this.plans.values());
    const serialized = JSON.stringify(list);
    this.fallbackStorage = serialized;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(PLANS_STORAGE_KEY, serialized);
      } catch (err) {
        console.error("[CreativeOrchestrator] Erro ao salvar planos no storage:", err);
      }
    }
  }

  public static listPlans(): CreativePlan[] {
    this.init();
    return Array.from(this.plans.values());
  }

  public static reloadFromStorage(): void {
    this.isInitialized = false;
    this.plans.clear();
    this.init();
  }

  /**
   * Generates a deterministic canonical hash of semantic plan fields (ignores non-semantic volatile fields).
   */
  public static calculatePlanHash(plan: CreativePlan): string {
    const sortObjectKeys = (obj: any): any => {
      if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return obj;
      return Object.keys(obj)
        .sort()
        .reduce((acc: Record<string, any>, key: string) => {
          acc[key] = sortObjectKeys(obj[key]);
          return acc;
        }, {});
    };

    const semanticPayload = {
      intentId: plan.intentId,
      revision: plan.revision,
      sourceArtifactIds: [...plan.sourceArtifactIds].sort(),
      plannedArtifacts: plan.plannedArtifacts.map((a) => ({
        tempId: a.tempId,
        type: a.artifactType,
        title: a.title,
        required: a.required,
        basedOn: a.basedOn ? [...a.basedOn].sort() : [],
        metadata: sortObjectKeys(a.metadata || {}),
      })),
      dependencies: plan.dependencies.map((d) => ({
        source: d.sourceTempId,
        target: d.targetTempId,
        type: d.type,
        required: d.required,
        slot: d.usageSlot || "",
      })),
      resourceClass: plan.resourceClass,
    };

    const raw = JSON.stringify(semanticPayload);
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `plan-hash-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Transforms a user CreativeIntent into a structured, inspectable CreativePlan.
   */
  public static planIntent(intent: CreativeIntent): CreativePlan {
    this.init();

    const planId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // 1. Discover capabilities from engines
    const capResult = CreativeCapabilityDiscovery.discoverCapabilities(intent.requestedOutputs);

    // 2. Map requested outputs to planned artifacts
    const plannedArtifacts = intent.requestedOutputs.map((req, idx) => {
      const tempId = `${req.artifactType.toLowerCase()}-${idx + 1}`;
      return {
        tempId,
        artifactType: req.artifactType,
        title: req.description || `${req.artifactType} Gerado`,
        required: req.required !== false,
        basedOn: intent.sourceArtifactIds || [],
        metadata: req.metadata || {},
      };
    });

    // 3. Construct default logical dependencies
    const dependencies: any[] = [];
    const hasImage = plannedArtifacts.find((a) => a.artifactType === "IMAGE");
    const hasAudio = plannedArtifacts.find((a) => a.artifactType === "AUDIO");
    const hasVideo = plannedArtifacts.find((a) => a.artifactType === "VIDEO");
    const hasGame = plannedArtifacts.find((a) => a.artifactType === "GAME");

    if (hasVideo && hasImage) {
      dependencies.push({
        sourceTempId: hasVideo.tempId,
        targetTempId: hasImage.tempId,
        type: "USES",
        semanticRole: "VISUAL_ASSET",
        usageSlot: "cover-image",
        required: false,
      });
    }

    if (hasVideo && hasAudio) {
      dependencies.push({
        sourceTempId: hasVideo.tempId,
        targetTempId: hasAudio.tempId,
        type: "DEPENDS_ON",
        semanticRole: "NARRATION_TRACK",
        usageSlot: "primary-audio",
        required: true,
      });
    }

    if (hasGame && hasVideo) {
      dependencies.push({
        sourceTempId: hasGame.tempId,
        targetTempId: hasVideo.tempId,
        type: "REFERENCES",
        semanticRole: "INTRO_CUTSCENE",
        usageSlot: "cutscene",
        required: false,
      });
    }

    // 4. Validate DAG
    const dagValidation = DAGEngine.validateDAG(plannedArtifacts, dependencies);
    const blockers = [...capResult.blockers];

    if (!dagValidation.valid) {
      dagValidation.errors.forEach((err) => {
        blockers.push({
          id: `blocker-dag-${Date.now()}`,
          message: err,
          affectedArtifactTempIds: plannedArtifacts.map((a) => a.tempId),
          severity: "CRITICAL",
        });
      });
    }

    // 5. Estimate resource class
    let resourceClass: ResourceClass = "LIGHT";
    if (plannedArtifacts.some((a) => a.artifactType === "VIDEO" || a.artifactType === "GAME")) {
      resourceClass = "HEAVY";
    } else if (plannedArtifacts.some((a) => a.artifactType === "AUDIO" || a.artifactType === "WEBSITE")) {
      resourceClass = "MODERATE";
    }

    const plan: CreativePlan = {
      id: planId,
      intentId: intent.id,
      title: `Plano Criativo: ${intent.userGoal}`,
      summary: `Orquestração de ${plannedArtifacts.length} saídas criativas (${plannedArtifacts.map((a) => a.artifactType).join(", ")})`,
      sourceArtifactIds: intent.sourceArtifactIds || [],
      plannedArtifacts,
      dependencies,
      requiredCapabilities: capResult.capabilities,
      confirmations: [],
      blockers,
      resourceClass,
      estimatedSteps: plannedArtifacts.length,
      revision: 1,
      planHash: "",
      status: blockers.some((b) => b.severity === "CRITICAL") ? "BLOCKED" : "READY",
      createdAt: now,
      updatedAt: now,
    };

    plan.planHash = this.calculatePlanHash(plan);

    this.plans.set(planId, plan);
    this.planHistory.set(planId, [JSON.parse(JSON.stringify(plan))]);
    this.saveToStorage();

    athenaEventBus.emit("CREATIVE_PLAN_CREATED" as any, { planId, title: plan.title, revision: 1 });

    return JSON.parse(JSON.stringify(plan));
  }

  public static getPlan(planId: string): CreativePlan | undefined {
    this.init();
    const p = this.plans.get(planId);
    return p ? JSON.parse(JSON.stringify(p)) : undefined;
  }

  public static getAllPlans(): CreativePlan[] {
    this.init();
    return JSON.parse(JSON.stringify(Array.from(this.plans.values())));
  }

  public static getPlanHistory(planId: string): CreativePlan[] {
    this.init();
    return JSON.parse(JSON.stringify(this.planHistory.get(planId) || []));
  }

  /**
   * Replans an existing plan with semantic modifications, preserving previous revision in history (Alex Principle).
   */
  public static replan(planId: string, modifications: Partial<CreativePlan>): { newPlan: CreativePlan; diff: PlanDiff } {
    this.init();
    const existing = this.plans.get(planId);
    if (!existing) throw new Error(`Plano '${planId}' não encontrado.`);

    const prevRevision = existing.revision;
    const newRevision = prevRevision + 1;

    const diffItems: PlanDiffItem[] = [];

    // Check outputs diff
    if (modifications.plannedArtifacts) {
      const oldTempIds = new Set(existing.plannedArtifacts.map((a) => a.tempId));
      const newTempIds = new Set(modifications.plannedArtifacts.map((a) => a.tempId));

      modifications.plannedArtifacts.forEach((a) => {
        if (!oldTempIds.has(a.tempId)) {
          diffItems.push({ category: "OUTPUT_ADDED", description: `Adicionada saída: ${a.artifactType} (${a.title})` });
        }
      });

      existing.plannedArtifacts.forEach((a) => {
        if (!newTempIds.has(a.tempId)) {
          diffItems.push({ category: "OUTPUT_REMOVED", description: `Removida saída: ${a.artifactType} (${a.title})` });
        }
      });
    }

    if (modifications.dependencies && modifications.dependencies.length !== existing.dependencies.length) {
      diffItems.push({ category: "DEPENDENCY_CHANGED", description: "Estrutura de dependências do grafo alterada." });
    }

    if (modifications.resourceClass && modifications.resourceClass !== existing.resourceClass) {
      diffItems.push({ category: "RESOURCE_CLASS_CHANGED", description: `Classe de recursos alterada de ${existing.resourceClass} para ${modifications.resourceClass}.` });
    }

    // Create updated plan
    const updatedPlan: CreativePlan = {
      ...existing,
      ...modifications,
      revision: newRevision,
      approvalScope: undefined, // Invalidate prior approval
      status: "READY",
      updatedAt: new Date().toISOString(),
    };

    updatedPlan.planHash = this.calculatePlanHash(updatedPlan);

    // Validate DAG for new revision
    const dagValidation = DAGEngine.validateDAG(updatedPlan.plannedArtifacts, updatedPlan.dependencies);
    if (!dagValidation.valid) {
      updatedPlan.status = "BLOCKED";
      updatedPlan.blockers.push({
        id: `blocker-dag-${Date.now()}`,
        message: dagValidation.errors.join("; "),
        affectedArtifactTempIds: updatedPlan.plannedArtifacts.map((a) => a.tempId),
        severity: "CRITICAL",
      });
    }

    // Save to history & map
    const history = this.planHistory.get(planId) || [];
    history.push(JSON.parse(JSON.stringify(updatedPlan)));
    this.planHistory.set(planId, history);

    this.plans.set(planId, updatedPlan);
    this.saveToStorage();

    const diff: PlanDiff = {
      previousRevision: prevRevision,
      newRevision,
      items: diffItems,
      invalidatedPriorApproval: existing.status === "APPROVED",
    };

    athenaEventBus.emit("CREATIVE_PLAN_REVISED" as any, { planId, newRevision, diff });

    return {
      newPlan: JSON.parse(JSON.stringify(updatedPlan)),
      diff,
    };
  }

  /**
   * Approves a plan and derives an immutable CreativeExecutionPlan.
   */
  public static approvePlan(
    planId: string,
    confirmationToken?: string
  ): { success: boolean; executionPlan?: CreativeExecutionPlan; error?: string } {
    this.init();
    const plan = this.plans.get(planId);
    if (!plan) return { success: false, error: "Plano não encontrado." };

    if (plan.status === "BLOCKED") {
      return { success: false, error: "Plano bloqueado por falhas de DAG ou capacidades críticas ausentes." };
    }

    // Build Execution Steps
    const steps = DAGEngine.buildExecutionSteps(plan);

    // Calculate execution plan hash
    const execRaw = JSON.stringify({ planId: plan.id, planRevision: plan.revision, planHash: plan.planHash, stepsCount: steps.length });
    let hash = 0;
    for (let i = 0; i < execRaw.length; i++) {
      hash = (hash << 5) - hash + execRaw.charCodeAt(i);
      hash |= 0;
    }
    const executionPlanHash = `exec-hash-${Math.abs(hash).toString(16)}`;

    const approvalScope: ApprovalScope = {
      planId: plan.id,
      planRevision: plan.revision,
      planHash: plan.planHash,
      executionPlanHash,
      allowedActions: ["CREATE", "MODIFY", "LINK", "EXECUTE"],
      allowedArtifactTypes: plan.plannedArtifacts.map((a) => a.artifactType),
      resourceClass: plan.resourceClass,
      grantedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      confirmationToken,
    };

    plan.approvalScope = approvalScope;
    plan.status = "APPROVED";
    plan.updatedAt = new Date().toISOString();

    const executionPlan: CreativeExecutionPlan = {
      id: `exec-${plan.id}-rev${plan.revision}`,
      planId: plan.id,
      planRevision: plan.revision,
      planHash: plan.planHash,
      executionPlanHash,
      derivedFromPlanRevision: plan.revision,
      steps,
      artifactResolutionMap: {},
      status: "READY",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.plans.set(planId, plan);
    this.saveToStorage();

    athenaEventBus.emit("CREATIVE_PLAN_APPROVED" as any, { planId, revision: plan.revision, executionPlanId: executionPlan.id });

    return {
      success: true,
      executionPlan,
    };
  }

  public static cancelPlan(planId: string): { success: boolean; plan?: CreativePlan } {
    const plan = this.getPlan(planId);
    if (!plan) return { success: false };
    plan.status = "CANCELLED";
    plan.updatedAt = new Date().toISOString();
    this.saveToStorage();
    athenaEventBus.emit("EXECUTION_CANCELLED" as any, { planId });
    return { success: true, plan };
  }

  /**
   * Produces an explicit Rebuild CreativePlan when an upstream source changes.
   */
  public static rebuildAffectedOutputs(sourceArtifactId: string): CreativePlan {
    const dependents = creativeGraph.getDependents(sourceArtifactId);
    const sourceArt = artifactStore.getById(sourceArtifactId);

    const outputs: any[] = dependents.map((dep) => {
      const art = artifactStore.getById(dep.consumerArtifactId);
      return {
        artifactType: art?.type || "DOCUMENT",
        description: `Reconstrução de ${art?.name || dep.consumerArtifactId} após atualização do artefato fonte '${sourceArt?.name || sourceArtifactId}'`,
        required: true,
      };
    });

    const intent: CreativeIntent = {
      id: `intent-rebuild-${Date.now()}`,
      userGoal: `Atualizar outputs afetados pela evolução de '${sourceArt?.name || sourceArtifactId}'`,
      sourceArtifactIds: [sourceArtifactId],
      requestedOutputs: outputs.length > 0 ? outputs : [{ artifactType: "DOCUMENT", description: "Verificação de integridade" }],
      createdAt: new Date().toISOString(),
    };

    return this.planIntent(intent);
  }

  public static explainPlan(planId: string): string {
    const plan = this.getPlan(planId);
    if (!plan) return "Plano criativo não encontrado.";

    const lines: string[] = [];
    lines.push(`## ${plan.title}`);
    lines.push(`**Status:** ${plan.status} | **Revisão:** v${plan.revision} | **Carga Estimada:** ${plan.resourceClass}`);
    lines.push(`\n### Saídas Previstas (${plan.plannedArtifacts.length}):`);
    plan.plannedArtifacts.forEach((a) => {
      lines.push(`- **${a.artifactType}**: ${a.title} (${a.required ? "Obrigatório" : "Opcional"})`);
    });

    if (plan.dependencies.length > 0) {
      lines.push(`\n### Grafo de Dependências:`);
      plan.dependencies.forEach((d) => {
        lines.push(`- ${d.sourceTempId} $\\rightarrow$ ${d.targetTempId} [${d.type}]`);
      });
    }

    if (plan.blockers.length > 0) {
      lines.push(`\n### ⚠️ Bloqueios Detectados:`);
      plan.blockers.forEach((b) => {
        lines.push(`- **[${b.severity}]** ${b.message}`);
      });
    }

    return lines.join("\n");
  }

  public static explainBlocker(planId: string, blockerId: string): string {
    const plan = this.getPlan(planId);
    if (!plan) return "Plano não encontrado.";

    const blocker = plan.blockers.find((b) => b.id === blockerId);
    if (!blocker) return `Bloqueio '${blockerId}' não encontrado no plano.`;

    return `O bloqueio **[${blocker.severity}]** '${blocker.message}' ocorre porque os requisitos necessários não foram atendidos no ambiente local ou há incompatibilidade no grafo de execução.`;
  }
}
