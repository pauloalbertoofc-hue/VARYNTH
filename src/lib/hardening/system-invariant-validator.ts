import {
  SystemInvariant,
  InvariantResult,
  InvariantCheckMode,
  SystemHealthLevel,
  SystemHealthReport,
  RepairPlan,
  RepairPlanStep,
  InvariantValidationContext,
} from "./types";
import { SYSTEM_INVARIANTS } from "./invariants";
import { TransactionJournal } from "./transaction-journal";
import { jobManager } from "../runtime/job-manager";
import { creativeGraph } from "../artifacts/creative-graph";
import { assetManager } from "../artifacts/asset-manager";
import { artifactStore } from "../artifacts/artifact-store";

export class SystemInvariantValidator {
  private static invariants: SystemInvariant[] = [...SYSTEM_INVARIANTS];

  public static getInvariants(): SystemInvariant[] {
    return [...this.invariants];
  }

  public static runCritical(mode: InvariantCheckMode = "POST_TRANSACTION"): SystemHealthReport {
    const ctx: InvariantValidationContext = { mode, timestamp: new Date().toISOString() };
    const criticalInvariants = this.invariants.filter((inv) => inv.severity === "CRITICAL");
    const results = criticalInvariants.map((inv) => inv.validate(ctx));
    return this.buildReport(results, mode);
  }

  public static runAll(mode: InvariantCheckMode = "ON_DEMAND"): SystemHealthReport {
    const ctx: InvariantValidationContext = { mode, timestamp: new Date().toISOString() };
    const results = this.invariants.map((inv) => inv.validate(ctx));
    return this.buildReport(results, mode);
  }

  private static buildReport(results: InvariantResult[], mode: InvariantCheckMode): SystemHealthReport {
    const total = results.length;
    let passed = 0;
    let failed = 0;
    let degraded = 0;
    const criticalFailures: string[] = [];
    const degradedSubsystems: string[] = [];

    for (const r of results) {
      if (r.status === "PASS") {
        passed++;
      } else if (r.status === "FAIL") {
        failed++;
        if (r.severity === "CRITICAL") {
          criticalFailures.push(`[${r.invariantId}] ${r.name}: ${r.details || "Falha crítica detectada."}`);
        } else {
          degradedSubsystems.push(`[${r.invariantId}] ${r.name}`);
        }
      } else if (r.status === "DEGRADED") {
        degraded++;
        degradedSubsystems.push(`[${r.invariantId}] ${r.name}`);
      }
    }

    // Health Level calculation: If any critical invariant fails, health is strictly CRITICAL (never HEALTHY)
    let overallStatus: SystemHealthLevel = "HEALTHY";
    if (criticalFailures.length > 0) {
      overallStatus = "CRITICAL";
    } else if (failed > 0 || degraded > 0) {
      overallStatus = "DEGRADED";
    }

    const report: SystemHealthReport = {
      overallStatus,
      checkMode: mode,
      timestamp: new Date().toISOString(),
      invariantsCount: { total, passed, failed, degraded },
      results,
      criticalFailures,
      degradedSubsystems,
    };

    if (overallStatus !== "HEALTHY") {
      report.repairPlan = this.generateRepairPlan(report);
    }

    return report;
  }

  /**
   * Lightweight startup recovery pass.
   * Recovers incomplete transactions, interrupted jobs, and runs critical invariants.
   */
  public static runStartupRecoveryPass(): {
    healthReport: SystemHealthReport;
    transactionsRecovered: number;
    jobsInterrupted: number;
    details: string[];
  } {
    const txRecovery = TransactionJournal.recoverPendingTransactions((tx) => {
      // If transaction has rollback snapshot with previous artifact JSON, restore it safely
      if (tx.rollbackSnapshot && tx.targetIds.length > 0) {
        const targetId = tx.targetIds[0];
        const snapshot = tx.rollbackSnapshot[targetId];
        if (snapshot) {
          artifactStore.save(snapshot as any);
        }
      }
    });

    const jobsInterrupted = jobManager.recoverInterruptedJobs();

    // Run critical invariants pass
    const healthReport = this.runCritical("STARTUP_RECOVERY");

    return {
      healthReport,
      transactionsRecovered: txRecovery.recoveredCount,
      jobsInterrupted,
      details: [...txRecovery.details],
    };
  }

  /**
   * Deep comprehensive integrity scan across all subsystems.
   */
  public static runDeepIntegrityScan(): SystemHealthReport {
    // 1. Rebuild and verify graph reverse index
    creativeGraph.rebuildIndex();

    // 2. Validate all 20 system invariants
    const report = this.runAll("ON_DEMAND");

    // 3. Generate repair plan if any degradation found
    if (report.overallStatus !== "HEALTHY") {
      report.repairPlan = this.generateRepairPlan(report);
    }

    return report;
  }

  /**
   * Generates declarative, inspectable RepairPlan without executing actions.
   * Gives no execution authority to Athena; must pass through PermissionPolicyEngine.
   */
  public static generateRepairPlan(report: SystemHealthReport): RepairPlan {
    const steps: RepairPlanStep[] = [];

    for (const r of report.results) {
      if (r.status === "FAIL" || r.status === "DEGRADED") {
        if (r.invariantId === "INV-005" && r.affectedIds) {
          r.affectedIds.forEach((id) => {
            steps.push({
              stepId: `step-quarantine-${id}`,
              title: `Colocar asset '${id}' em quarentena`,
              description: "Isola o arquivo de mídia corrompido sem apagar dados brutos.",
              targetDomain: "ASSET_MANAGER",
              targetId: id,
              action: "QUARANTINE_ASSET",
              riskLevel: "LOW",
              requiresConfirmation: false,
              parameters: { assetId: id, reason: r.details },
            });
          });
        } else if (r.invariantId === "INV-016") {
          steps.push({
            stepId: `step-rebuild-graph-index`,
            title: "Reconstruir índice reverso do Grafo Criativo",
            description: "Reconstrói o cache de dependentes reversos a partir dos relacionamentos autoritativos.",
            targetDomain: "CREATIVE_GRAPH",
            action: "REBUILD_INDEX",
            riskLevel: "LOW",
            requiresConfirmation: false,
          });
        } else if (r.invariantId === "INV-006" && r.affectedIds) {
          r.affectedIds.forEach((affected) => {
            steps.push({
              stepId: `step-relink-${affected}`,
              title: `Revisar relação órfã '${affected}'`,
              description: "Desvincular dependência para artefato inexistente ou restaurar da Lixeira.",
              targetDomain: "ARTIFACT_RELATIONSHIPS",
              action: "RELINK_DEPENDENCY",
              riskLevel: "HIGH",
              requiresConfirmation: true,
              parameters: { targetPair: affected },
            });
          });
        }
      }
    }

    const autoCount = steps.filter((s) => !s.requiresConfirmation).length;
    const manualCount = steps.filter((s) => s.requiresConfirmation).length;

    return {
      planId: `plan-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      issuesCount: report.criticalFailures.length + report.degradedSubsystems.length,
      steps,
      autoExecutableStepsCount: autoCount,
      manualConfirmationStepsCount: manualCount,
    };
  }
}

