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

    // 1. Identify active or targeted project
    let activeProject = targetProjectId
      ? storeCtx.projects.find((p) => p.id === targetProjectId)
      : undefined;

    if (!activeProject && task.entities.projectNames && task.entities.projectNames.length > 0) {
      activeProject = storeCtx.projects.find((p) =>
        task.entities.projectNames?.some((name) => p.title.toLowerCase().includes(name.toLowerCase()))
      );
    }

    // 2. Filter tasks: project tasks if project targeted, or urgent/active tasks
    const relevantTasks = activeProject
      ? storeCtx.tasks.filter((t) => t.projectId === activeProject!.id)
      : storeCtx.tasks.filter(
          (t) =>
            t.status !== "concluida" ||
            rawLower.includes(t.title.toLowerCase()) ||
            t.priority === "urgente"
        ).slice(0, 15);

    // 3. Filter Vault items: relevant to prompt or active project tags
    const relevantVaultItems = storeCtx.vaultItems.filter((item) => {
      const matchQuery =
        rawLower.includes(item.title.toLowerCase()) ||
        item.tags.some((t) => rawLower.includes(t.toLowerCase()));
      const matchProject =
        activeProject && item.relatedProjectIds?.includes(activeProject.id);
      return matchQuery || matchProject;
    }).slice(0, 10);

    // 4. Chronos Events: upcoming and active
    const relevantChronosEvents = storeCtx.chronosEvents
      .filter((e) => !e.completed)
      .slice(0, 10);

    // 5. Theses (Codex): relevant if scope is legal or matches query
    const relevantTheses =
      scope === "juridico" || rawLower.includes("tese") || rawLower.includes("direito")
        ? storeCtx.theses
        : storeCtx.theses.slice(0, 2);

    // 6. Evidences (Research): relevant if scope is research or matches query
    const relevantEvidences =
      scope === "pesquisa" || rawLower.includes("evidencia") || rawLower.includes("pesquisa")
        ? storeCtx.evidences
        : storeCtx.evidences.slice(0, 2);

    // 7. Opportunities: relevant if prompt touches grants/competitions
    const relevantOpportunities =
      rawLower.includes("edital") || rawLower.includes("bolsa") || rawLower.includes("premio")
        ? storeCtx.opportunities
        : storeCtx.opportunities.slice(0, 3);

    return {
      scope,
      targetProjectId: activeProject?.id || targetProjectId,
      activeProject,
      relevantProjects: activeProject ? [activeProject] : storeCtx.projects.slice(0, 10),
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

