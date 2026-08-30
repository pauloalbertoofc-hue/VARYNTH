import { PlannedArtifact, PlannedDependency, CreativeExecutionStep, CreativePlan } from "./types";

export class DAGEngine {
  /**
   * Validates DAG topology, missing nodes and checks for cycles.
   * Throws Error("PLAN_CYCLE_DETECTED: ...") if circular dependency is found.
   */
  public static validateDAG(
    artifacts: PlannedArtifact[],
    dependencies: PlannedDependency[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const idSet = new Set<string>();

    // 1. Duplicate tempId check
    for (const art of artifacts) {
      if (idSet.has(art.tempId)) {
        errors.push(`Identificador temporário duplicado: '${art.tempId}'.`);
      }
      idSet.add(art.tempId);
    }

    // 2. Missing target/source nodes
    for (const dep of dependencies) {
      if (!idSet.has(dep.sourceTempId)) {
        errors.push(`Dependência faz referência a sourceTempId inexistente: '${dep.sourceTempId}'.`);
      }
      if (!idSet.has(dep.targetTempId)) {
        errors.push(`Dependência faz referência a targetTempId inexistente: '${dep.targetTempId}'.`);
      }
    }

    // 3. Cycle Detection via DFS
    const adjacency = new Map<string, string[]>();
    artifacts.forEach((a) => adjacency.set(a.tempId, []));
    dependencies.forEach((d) => {
      if (adjacency.has(d.sourceTempId)) {
        adjacency.get(d.sourceTempId)!.push(d.targetTempId);
      }
    });

    const visited = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
    artifacts.forEach((a) => visited.set(a.tempId, 0));

    const detectCycle = (node: string, path: string[]): boolean => {
      visited.set(node, 1);
      path.push(node);

      const neighbors = adjacency.get(node) || [];
      for (const next of neighbors) {
        if (visited.get(next) === 1) {
          const cyclePath = [...path, next].join(" -> ");
          errors.push(`PLAN_CYCLE_DETECTED: Ciclo de dependência causal detectado no plano criativo: [${cyclePath}].`);
          return true;
        }
        if (visited.get(next) === 0) {
          if (detectCycle(next, path)) return true;
        }
      }

      visited.set(node, 2);
      path.pop();
      return false;
    };

    for (const art of artifacts) {
      if (visited.get(art.tempId) === 0) {
        if (detectCycle(art.tempId, [])) {
          break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Topological sort into parallel execution tiers.
   */
  public static computeExecutionTiers(
    artifacts: PlannedArtifact[],
    dependencies: PlannedDependency[]
  ): string[][] {
    const inDegree = new Map<string, number>();
    const dependentsMap = new Map<string, string[]>();

    artifacts.forEach((a) => {
      inDegree.set(a.tempId, 0);
      dependentsMap.set(a.tempId, []);
    });

    // In a creative DAG, if A depends on B (A -> B), B must execute first.
    // So B has out-edge to A.
    dependencies.forEach((d) => {
      // d.sourceTempId depends on d.targetTempId
      inDegree.set(d.sourceTempId, (inDegree.get(d.sourceTempId) || 0) + 1);
      if (dependentsMap.has(d.targetTempId)) {
        dependentsMap.get(d.targetTempId)!.push(d.sourceTempId);
      }
    });

    const tiers: string[][] = [];
    const currentInDegree = new Map(inDegree);

    while (true) {
      const currentTier: string[] = [];
      currentInDegree.forEach((deg, id) => {
        if (deg === 0) {
          currentTier.push(id);
        }
      });

      if (currentTier.length === 0) break;

      currentTier.forEach((id) => {
        currentInDegree.delete(id);
        const children = dependentsMap.get(id) || [];
        children.forEach((child) => {
          const current = currentInDegree.get(child);
          if (current !== undefined) {
            currentInDegree.set(child, current - 1);
          }
        });
      });

      tiers.push(currentTier);
    }

    return tiers;
  }

  /**
   * Converts a validated CreativePlan into governed CreativeExecutionStep array.
   */
  public static buildExecutionSteps(plan: CreativePlan): CreativeExecutionStep[] {
    const steps: CreativeExecutionStep[] = [];
    let stepCounter = 1;

    // Track step IDs created for each artifact
    const artifactStepMap = new Map<string, string>();

    // Sort planned artifacts in dependency order
    const tiers = this.computeExecutionTiers(plan.plannedArtifacts, plan.dependencies);

    tiers.forEach((tier) => {
      tier.forEach((tempId) => {
        const art = plan.plannedArtifacts.find((a) => a.tempId === tempId);
        if (!art) return;

        // Find dependent steps that must finish first
        const directDeps = plan.dependencies.filter((d) => d.sourceTempId === tempId);
        const depStepIds = directDeps
          .map((d) => artifactStepMap.get(d.targetTempId))
          .filter((id): id is string => Boolean(id));

        const stepId = `step-${stepCounter}-${art.artifactType.toLowerCase()}-${tempId}`;
        artifactStepMap.set(tempId, stepId);

        const step: CreativeExecutionStep = {
          id: stepId,
          stepNumber: stepCounter++,
          type: `CREATE_${art.artifactType}`,
          title: `Criar ${art.artifactType} — ${art.title}`,
          dependsOn: depStepIds,
          action: "artifacts.create",
          targetTempId: tempId,
          writeTargets: [`temp-${tempId}`],
          parameters: {
            artifactType: art.artifactType,
            name: art.title,
            description: art.description,
            metadata: art.metadata || {},
          },
          frozenInputVersions: {},
          permissionMode: "ALLOW",
          failurePolicy: art.required ? "STOP_DEPENDENTS" : "CONTINUE",
          status: depStepIds.length === 0 ? "READY" : "PENDING",
          attemptId: 1,
          retryCount: 0,
          maxRetries: 2,
        };

        steps.push(step);
      });
    });

    return steps;
  }
}
