import {
  CreativeExecutionPlan,
  CreativeExecutionStep,
  OrchestrationProvenanceManifest,
  PlanStatus,
} from "./types";
import { CreativeOrchestrator } from "./creative-orchestrator";
import { CreativeCapabilityDiscovery } from "./capability-discovery";
import { artifactService } from "../artifacts/artifact-service";
import { artifactStore } from "../artifacts/artifact-store";
import { creativeGraph } from "../artifacts/creative-graph";
import { SystemInvariantValidator } from "../hardening/system-invariant-validator";
import { athenaEventBus } from "../athena/events/event-bus";
import { athenaToolManager } from "../athena/tools/tool-manager";

export class CreativeExecutionController {
  private static activeExecutions: Map<string, CreativeExecutionPlan> = new Map();
  private static provenanceManifests: Map<string, OrchestrationProvenanceManifest[]> = new Map();

  /**
   * Executes a governed CreativeExecutionPlan.
   */
  public static async executePlan(executionPlan: CreativeExecutionPlan): Promise<{
    status: PlanStatus;
    executionPlan: CreativeExecutionPlan;
    error?: string;
  }> {
    if (!executionPlan || !executionPlan.planId) {
      return { status: "FAILED", executionPlan: executionPlan || ({} as any), error: "Plano de execução inválido ou ausente." };
    }

    const plan = CreativeOrchestrator.getPlan(executionPlan.planId);
    if (!plan) {
      return { status: "FAILED", executionPlan, error: "Plano original não encontrado." };
    }

    // 1. Validate Execution Plan vs Approved Plan Revision & Hash (Anti-TOCTOU)
    if (
      executionPlan.derivedFromPlanRevision !== plan.revision ||
      executionPlan.planHash !== plan.planHash ||
      (plan.approvalScope && executionPlan.executionPlanHash !== plan.approvalScope.executionPlanHash)
    ) {
      executionPlan.status = "FAILED";
      return {
        status: "FAILED",
        executionPlan,
        error: "EXECUTION_PLAN_STALE: O plano de execução diverge da revisão e hash aprovados pelo usuário.",
      };
    }

    // 2. Pre-flight health check
    const health = SystemInvariantValidator.runCritical();
    if (health.overallStatus === "CRITICAL") {
      executionPlan.status = "BLOCKED";
      return {
        status: "BLOCKED",
        executionPlan,
        error: "Execução bloqueada devido a falhas críticas no Kernel de Invariantes do Sistema.",
      };
    }

    executionPlan.status = "EXECUTING";
    executionPlan.startedAt = new Date().toISOString();
    this.activeExecutions.set(executionPlan.id, executionPlan);

    athenaEventBus.emit("EXECUTION_STARTED" as any, { executionPlanId: executionPlan.id, planId: plan.id });

    // 3. Step Execution Loop
    let hasPendingWork = true;
    while (hasPendingWork) {
      // Find all ready steps that haven't run
      const readySteps = executionPlan.steps.filter((s) => {
        if (s.status !== "PENDING" && s.status !== "READY") return false;
        // All dependent steps must be COMPLETED
        const depsCompleted = s.dependsOn.every((depId) => {
          const depStep = executionPlan.steps.find((st) => st.id === depId);
          return depStep && depStep.status === "COMPLETED";
        });
        return depsCompleted;
      });

      // Check if any dependent steps failed -> block downstream
      executionPlan.steps.forEach((s) => {
        if (s.status === "PENDING") {
          const hasFailedDep = s.dependsOn.some((depId) => {
            const depStep = executionPlan.steps.find((st) => st.id === depId);
            return depStep && (depStep.status === "FAILED" || depStep.status === "BLOCKED");
          });
          if (hasFailedDep) {
            s.status = "BLOCKED";
            s.error = "Bloqueado devido a falha ou bloqueio em dependência anterior.";
            athenaEventBus.emit("STEP_BLOCKED" as any, { stepId: s.id, reason: s.error });
          }
        }
      });

      if (readySteps.length === 0) {
        hasPendingWork = false;
        break;
      }

      // Check write collisions among ready parallel steps
      const writeTargetSet = new Set<string>();
      const parallelBatch: CreativeExecutionStep[] = [];

      for (const step of readySteps) {
        const targets = step.writeTargets || [];
        const hasCollision = targets.some((t) => writeTargetSet.has(t));
        if (!hasCollision) {
          targets.forEach((t) => writeTargetSet.add(t));
          parallelBatch.push(step);
        }
      }

      // Execute parallel batch
      await Promise.all(
        parallelBatch.map(async (step) => {
          await this.executeStep(step, executionPlan, plan);
        })
      );
    }

    // 4. Evaluate Final Plan Status
    const completedSteps = executionPlan.steps.filter((s) => s.status === "COMPLETED");
    const failedSteps = executionPlan.steps.filter((s) => s.status === "FAILED");
    const blockedSteps = executionPlan.steps.filter((s) => s.status === "BLOCKED");
    const totalSteps = executionPlan.steps.length;

    let finalStatus: PlanStatus = "COMPLETED";

    if (completedSteps.length === totalSteps) {
      finalStatus = "COMPLETED";
    } else if (completedSteps.length > 0 && (failedSteps.length > 0 || blockedSteps.length > 0)) {
      // Check if all failed steps were optional
      const allFailedAreOptional = failedSteps.every((fs) => fs.failurePolicy === "CONTINUE") && blockedSteps.length === 0;
      finalStatus = allFailedAreOptional ? "COMPLETED_WITH_WARNINGS" : "PARTIAL";
    } else if (failedSteps.length > 0 || blockedSteps.length > 0) {
      finalStatus = "FAILED";
    }

    executionPlan.status = finalStatus;
    executionPlan.completedAt = new Date().toISOString();
    executionPlan.updatedAt = new Date().toISOString();

    if (finalStatus === "PARTIAL") {
      athenaEventBus.emit("EXECUTION_PARTIAL" as any, { executionPlanId: executionPlan.id, completed: completedSteps.length, failed: failedSteps.length, blocked: blockedSteps.length });
    } else if (finalStatus === "COMPLETED" || finalStatus === "COMPLETED_WITH_WARNINGS") {
      athenaEventBus.emit("EXECUTION_COMPLETED" as any, { executionPlanId: executionPlan.id, status: finalStatus });
    }

    return {
      status: finalStatus,
      executionPlan,
    };
  }

  private static async executeStep(
    step: CreativeExecutionStep,
    executionPlan: CreativeExecutionPlan,
    plan: any
  ): Promise<void> {
    step.status = "RUNNING";
    step.startedAt = new Date().toISOString();
    athenaEventBus.emit("STEP_STARTED" as any, { stepId: step.id, action: step.action });

    // 1. Real-time Capability Revalidation
    const requiredCaps = plan.requiredCapabilities?.filter((c: any) => c.domain === step.parameters?.artifactType) || [];
    const unavailableCap = requiredCaps.find((c: any) => !CreativeCapabilityDiscovery.revalidateCapability(c.capabilityId));
    if (unavailableCap) {
      step.status = "BLOCKED";
      step.error = `CAPABILITY_CHANGED: Capacidade '${unavailableCap.capabilityId}' tornou-se indisponível no ambiente local.`;
      athenaEventBus.emit("STEP_BLOCKED" as any, { stepId: step.id, reason: step.error });
      return;
    }

    // 2. Frozen Input Versions
    const frozenInputs: Record<string, { versionId: string; versionNumber: number }> = {};
    step.dependsOn.forEach((depStepId) => {
      const depStep = executionPlan.steps.find((s) => s.id === depStepId);
      if (depStep && depStep.resolvedArtifactId) {
        const art = artifactStore.getById(depStep.resolvedArtifactId);
        if (art) {
          frozenInputs[art.id] = {
            versionId: art.currentVersionId || "v1",
            versionNumber: art.currentVersionNumber || 1,
          };
        }
      }
    });
    step.frozenInputVersions = frozenInputs;

    // 3. Idempotent check on retry/reload: if artifact already committed, reconcile
    if (step.targetTempId && executionPlan.artifactResolutionMap[step.targetTempId]) {
      const existingArtId = executionPlan.artifactResolutionMap[step.targetTempId];
      const existingArt = artifactStore.getById(existingArtId);
      if (existingArt) {
        step.resolvedArtifactId = existingArt.id;
        step.status = "COMPLETED";
        step.completedAt = new Date().toISOString();
        athenaEventBus.emit("STEP_COMPLETED" as any, { stepId: step.id, artifactId: existingArt.id });
        return;
      }
    }

    // 4. Governed Execution via ArtifactService / ToolManager
    try {
      step.status = "VALIDATING";
      const artType = (step.parameters.artifactType as any) || "DOCUMENT";
      const title = (step.parameters.name as string) || step.title;

      step.status = "PROMOTING";
      const createRes = await artifactService.create({
        type: artType,
        name: title,
        description: step.parameters.description as string,
        metadata: {
          ...((step.parameters.metadata as Record<string, unknown>) || {}),
          orchestratedBy: "ATHENA",
          intentId: plan.intentId,
          planId: plan.id,
          planRevision: plan.revision,
          executionPlanId: executionPlan.id,
          stepId: step.id,
        },
      });

      if (!createRes.success || !createRes.artifact) {
        throw new Error(createRes.error || "Falha ao criar artefato orquestrado.");
      }

      const createdArt = createRes.artifact;
      step.resolvedArtifactId = createdArt.id;
      if (step.targetTempId) {
        executionPlan.artifactResolutionMap[step.targetTempId] = createdArt.id;
      }

      // 5. Post-commit Creative Graph Links (INV-023: only committed outputs linked)
      const depRelations = plan.dependencies?.filter((d: any) => d.sourceTempId === step.targetTempId) || [];
      for (const rel of depRelations) {
        const targetRealId = executionPlan.artifactResolutionMap[rel.targetTempId];
        if (targetRealId) {
          artifactService.linkDependency({
            sourceArtifactId: createdArt.id,
            targetArtifactId: targetRealId,
            type: rel.type,
            semanticRole: rel.semanticRole,
            usageSlot: rel.usageSlot,
          });
        }
      }

      // 6. Record Provenance Manifest
      const manifest: OrchestrationProvenanceManifest = {
        intentId: plan.intentId,
        planId: plan.id,
        planRevision: plan.revision,
        executionPlanId: executionPlan.id,
        executionPlanHash: executionPlan.executionPlanHash,
        stepId: step.id,
        attemptId: step.attemptId,
        sourceArtifactVersions: Object.entries(frozenInputs).reduce((acc, [k, v]) => ({ ...acc, [k]: v.versionId }), {}),
        sourceAssetChecksums: {},
        parameters: step.parameters,
        outputArtifactId: createdArt.id,
        outputVersionId: createdArt.currentVersionId,
        generatedAt: new Date().toISOString(),
      };

      const manifests = this.provenanceManifests.get(executionPlan.id) || [];
      manifests.push(manifest);
      this.provenanceManifests.set(executionPlan.id, manifests);

      step.status = "COMPLETED";
      step.outputData = { artifactId: createdArt.id, versionId: createdArt.currentVersionId };
      step.completedAt = new Date().toISOString();

      athenaEventBus.emit("STEP_COMPLETED" as any, { stepId: step.id, artifactId: createdArt.id });
    } catch (err: any) {
      step.retryCount++;
      const failureRecord = {
        attemptId: step.attemptId,
        error: err.message || "Erro desconhecido na execução do step.",
        timestamp: new Date().toISOString(),
      };

      step.failureHistory = step.failureHistory || [];
      step.failureHistory.push(failureRecord);

      if (step.retryCount < step.maxRetries) {
        step.attemptId++;
        // Retry step
        return this.executeStep(step, executionPlan, plan);
      } else {
        step.status = "FAILED";
        step.error = failureRecord.error;
        athenaEventBus.emit("STEP_FAILED" as any, { stepId: step.id, error: step.error });
      }
    }
  }

  /**
   * Cancels a running execution plan cleanly.
   * Late cancellation preserves outputs already committed.
   */
  public static cancelPlan(executionPlanId: string): { success: boolean; cancelledSteps: number; preservedOutputs: number } {
    const exec = this.activeExecutions.get(executionPlanId);
    if (!exec) return { success: false, cancelledSteps: 0, preservedOutputs: 0 };

    let cancelledSteps = 0;
    let preservedOutputs = 0;

    exec.steps.forEach((s) => {
      if (s.status === "COMPLETED") {
        preservedOutputs++;
      } else if (s.status === "PENDING" || s.status === "READY" || s.status === "RUNNING") {
        s.status = "CANCELLED";
        cancelledSteps++;
      }
    });

    exec.status = "CANCELLED";
    exec.completedAt = new Date().toISOString();

    athenaEventBus.emit("EXECUTION_CANCELLED" as any, { executionPlanId, cancelledSteps, preservedOutputs });

    return {
      success: true,
      cancelledSteps,
      preservedOutputs,
    };
  }

  public static getProvenanceManifests(executionPlanId: string): OrchestrationProvenanceManifest[] {
    return JSON.parse(JSON.stringify(this.provenanceManifests.get(executionPlanId) || []));
  }

  public static getExecutionPlan(id: string): CreativeExecutionPlan | undefined {
    const p = this.activeExecutions.get(id);
    return p ? JSON.parse(JSON.stringify(p)) : undefined;
  }

  public static getExecutionPlanByCreativePlanId(planId: string): CreativeExecutionPlan | undefined {
    for (const exec of this.activeExecutions.values()) {
      if (exec.planId === planId) {
        return JSON.parse(JSON.stringify(exec));
      }
    }
    return undefined;
  }
}
