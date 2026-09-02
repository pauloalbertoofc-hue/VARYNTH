import { AthenaTask } from "../domain/task";
import { AthenaContext, AthenaScope } from "../domain/context";
import { AthenaEngineContext } from "@/lib/athena/engine";

export class ContextBuilder {
  buildContext(
    task: AthenaTask,
    scope: AthenaScope,
    storeCtx: AthenaEngineContext,
    targetProjectId?: string
  ): AthenaContext {
    const rawLower = task.rawPrompt.toLowerCase();
    // Callers outside the production store (tests, migrations and recovered
    // snapshots) may still provide older, partial contexts.
    const projects = storeCtx.projects ?? [];
    const tasks = storeCtx.tasks ?? [];
    const vaultItems = storeCtx.vaultItems ?? [];
    const chronosEvents = storeCtx.chronosEvents ?? [];
    const theses = storeCtx.theses ?? [];
    const evidences = storeCtx.evidences ?? [];
    const opportunities = storeCtx.opportunities ?? [];

    // 1. Identify active or targeted project
    let activeProject = targetProjectId
      ? projects.find((p) => p.id === targetProjectId)
      : undefined;

    if (!activeProject && task.entities.projectNames && task.entities.projectNames.length > 0) {
      activeProject = projects.find((p) =>
        task.entities.projectNames?.some((name) => p.title.toLowerCase().includes(name.toLowerCase()))
      );
    }

    // 2. Filter tasks: project tasks if project targeted, or urgent/active tasks
    const relevantTasks = activeProject
      ? tasks.filter((t) => t.projectId === activeProject!.id)
      : tasks.filter(
          (t) =>
            t.status !== "concluida" ||
            rawLower.includes(t.title.toLowerCase()) ||
            t.priority === "urgente"
        ).slice(0, 15);

    // 3. Filter Vault items: relevant to prompt or active project tags
    const relevantVaultItems = vaultItems.filter((item) => {
      const matchQuery =
        rawLower.includes(item.title.toLowerCase()) ||
        item.tags?.some((t) => rawLower.includes(t.toLowerCase())) === true;
      const matchProject =
        activeProject && item.relatedProjectIds?.includes(activeProject.id);
      return matchQuery || matchProject;
    }).slice(0, 10);

    // 4. Chronos Events: upcoming and active
    const relevantChronosEvents = chronosEvents
      .filter((e) => !e.completed)
      .slice(0, 10);

    // 5. Theses (Codex): relevant if scope is legal or matches query
    const relevantTheses =
      scope === "juridico" || rawLower.includes("tese") || rawLower.includes("direito")
        ? theses
        : theses.slice(0, 2);

    // 6. Evidences (Research): relevant if scope is research or matches query
    const relevantEvidences =
      scope === "pesquisa" || rawLower.includes("evidencia") || rawLower.includes("pesquisa")
        ? evidences
        : evidences.slice(0, 2);

    // 7. Opportunities: relevant if prompt touches grants/competitions
    const relevantOpportunities =
      rawLower.includes("edital") || rawLower.includes("bolsa") || rawLower.includes("premio")
        ? opportunities
        : opportunities.slice(0, 3);

    return {
      scope,
      targetProjectId: activeProject?.id || targetProjectId,
      activeProject,
      relevantProjects: activeProject ? [activeProject] : projects.slice(0, 10),
      relevantTasks,
      relevantVaultItems,
      relevantChronosEvents,
      relevantTheses,
      relevantEvidences,
      relevantOpportunities,
      systemTime: new Date().toISOString(),
    };
  }
}

export const athenaContextBuilder = new ContextBuilder();
