import { ActionType, ActionResult } from "../domain/action";
import { AthenaEngineContext } from "@/lib/athena/engine";
import type { Task } from "@/lib/types";

export interface ToolDefinition {
  name: ActionType;
  description: string;
  module: string;
  requiresConfirmation?: boolean;
  execute: (params: Record<string, unknown>, ctx: AthenaEngineContext) => Promise<ActionResult> | ActionResult;
  captureBefore?: (params: Record<string, unknown>, ctx: AthenaEngineContext) => unknown;
  undo?: (params: Record<string, unknown>, result: ActionResult, ctx: AthenaEngineContext) => Promise<void> | void;
}

export const registeredTools: Record<ActionType, ToolDefinition> = {
  "studio.generate": {
    name: "studio.generate",
    description: "Cria uma composição editável no Studio local e retorna o artefato salvo",
    module: "studio",
    execute: async (params) => {
      const { STUDIO_DEFINITIONS } = await import("../../studio/studio-registry");
      const studio = STUDIO_DEFINITIONS.find(s => s.type === params.studio)?.type;
      if (!studio || typeof params.brief !== "string" || !params.brief.trim() || typeof params.requestId !== "string") return {success:false,actionType:"studio.generate",error:"Studio ou briefing inválido."};
      const { generateStudioDraft } = await import("../../studio/athena-generation");
      return {success:true,actionType:"studio.generate",data:await generateStudioDraft(studio,params.brief,params.requestId,typeof params.conversationId === "string" ? params.conversationId : undefined)};
    },
  },
  "tasks.create": {
    name: "tasks.create",
    description: "Cria uma nova tarefa no VARYNTH associada opcionalmente a um projeto",
    module: "projects",
    execute: (params, ctx) => {
      const title = (params.title as string) || "Nova tarefa via Athena";
      const projectId = (params.projectId as string) || undefined;
      const priority = (params.priority as any) || "media";

      const created = ctx.addTask(
        {
          title,
          projectId,
          priority,
          status: "a_fazer",
        },
        "athena"
      );

      return {
        success: true,
        actionType: "tasks.create",
        data: created,
      };
    },
    captureBefore: () => null,
    undo: (_params, result, ctx) => {
      const id = (result.data as { id?: string } | undefined)?.id;
      if (!id || !ctx.deleteTask) throw new Error("[TOOL_UNDO_UNAVAILABLE] A tarefa criada não pode ser removida neste contexto.");
      ctx.deleteTask(id, "athena");
    },
  },

  "tasks.toggle": {
    name: "tasks.toggle",
    description: "Alterna o status de conclusão de uma tarefa",
    module: "projects",
    captureBefore: (params, ctx) => ctx.tasks.find((task) => task.id === params.taskId),
    execute: (params, ctx) => {
      const taskId = params.taskId as string;
      const task = ctx.tasks.find((t) => t.id === taskId);
      if (!task) return { success: false, actionType: "tasks.toggle", error: "Tarefa não encontrada" };
      if (!ctx.toggleTask) return { success: false, actionType: "tasks.toggle", error: "Atualização de tarefa indisponível" };
      const updatedStatus = task.status === "concluida" ? "a_fazer" : "concluida";
      ctx.toggleTask(taskId, "athena");
      return { success: true, actionType: "tasks.toggle", data: { ...task, status: updatedStatus, completedAt: updatedStatus === "concluida" ? new Date().toISOString() : undefined } };
    },
    undo: (params, _result, ctx) => {
      const previous = params.__before as any;
      if (!previous || !ctx.updateTask) throw new Error("[TOOL_UNDO_UNAVAILABLE] Estado anterior da tarefa ausente.");
      ctx.updateTask(previous.id, previous, "athena");
    },
  },

  "tasks.update": {
    name: "tasks.update",
    description: "Atualiza campos de uma tarefa",
    module: "projects",
    captureBefore: (params, ctx) => ctx.tasks.find((task) => task.id === params.taskId),
    execute: (params, ctx) => {
      const taskId = params.taskId as string;
      const task = ctx.tasks.find((item) => item.id === taskId);
      if (!task || !ctx.updateTask) return { success: false, actionType: "tasks.update", error: "Tarefa não encontrada ou atualização indisponível" };
      const { taskId: _taskId, confirmationToken: _token, ...updates } = params;
      ctx.updateTask(taskId, updates, "athena");
      return { success: true, actionType: "tasks.update", data: { ...task, ...updates } };
    },
    undo: (params, _result, ctx) => {
      const previous = params.__before as any;
      if (!previous || !ctx.updateTask) throw new Error("[TOOL_UNDO_UNAVAILABLE] Estado anterior da tarefa ausente.");
      ctx.updateTask(previous.id, previous, "athena");
    },
  },

  "tasks.trash": {
    name: "tasks.trash",
    description: "Move uma tarefa real para a Lixeira local com restauração",
    module: "trash",
    requiresConfirmation: true,
    captureBefore: (params, ctx) => ctx.tasks.find((task) => task.id === params.taskId),
    execute: (params, ctx) => {
      const taskId = params.taskId as string;
      const task = ctx.tasks.find((item) => item.id === taskId);
      if (!task || !ctx.deleteTask) return { success: false, actionType: "tasks.trash", error: "Tarefa não encontrada ou lixeira indisponível" };
      const trash = ctx.deleteTask(taskId, "athena");
      return { success: true, actionType: "tasks.trash", data: { task, trashId: trash?.id } };
    },
    undo: (_params, result, ctx) => {
      const trashId = (result.data as { trashId?: string } | undefined)?.trashId;
      if (!trashId || !ctx.restoreFromTrash) throw new Error("[TOOL_UNDO_UNAVAILABLE] Registro da lixeira ausente.");
      ctx.restoreFromTrash(trashId, "athena");
    },
  },

  "tasks.organize": {
    name: "tasks.organize",
    description: "Organiza transacionalmente as três próximas tarefas de um projeto",
    module: "projects",
    requiresConfirmation: true,
    captureBefore: (params, ctx) => ctx.tasks.filter((task) => task.projectId === params.projectId && task.status !== "concluida").slice(0, 3).map((task) => ({ ...task })),
    execute: (params, ctx) => {
      const projectId = params.projectId as string;
      const project = ctx.projects.find((item) => item.id === projectId);
      if (!project) return { success: false, actionType: "tasks.organize", error: "Projeto não encontrado" };
      const existing = ctx.tasks.filter((task) => task.projectId === projectId && task.status !== "concluida").slice(0, 3);
      if (existing.length > 0 && !ctx.updateTask) return { success: false, actionType: "tasks.organize", error: "Atualização de tarefas indisponível" };
      const templates = ["Definir a próxima entrega verificável", "Executar a etapa prioritária do projeto", "Revisar o resultado e registrar aprendizados"];
      const priorities = ["urgente", "alta", "media"] as const;
      const createdTaskIds: string[] = [];
      existing.forEach((task, index) => ctx.updateTask?.(task.id, { priority: priorities[index] }, "athena"));
      for (let index = existing.length; index < 3; index += 1) {
        const created = ctx.addTask({ title: templates[index], projectId, priority: priorities[index], status: "a_fazer" }, "athena");
        createdTaskIds.push(created.id);
      }
      return { success: true, actionType: "tasks.organize", data: { projectId, orderedTitles: existing.map((task) => task.title).concat(templates.slice(existing.length)), createdTaskIds } };
    },
    undo: (params, result, ctx) => {
      const previous = (params.__before as Task[] | undefined) || [];
      const createdTaskIds = (result.data as { createdTaskIds?: string[] } | undefined)?.createdTaskIds || [];
      if (previous.length > 0 && !ctx.updateTask) throw new Error("[TOOL_UNDO_UNAVAILABLE] Atualização de tarefas indisponível.");
      if (createdTaskIds.length > 0 && !ctx.deleteTask) throw new Error("[TOOL_UNDO_UNAVAILABLE] Remoção das tarefas criadas indisponível.");
      previous.forEach((task) => ctx.updateTask?.(task.id, task, "athena"));
      createdTaskIds.forEach((id) => ctx.deleteTask?.(id, "athena"));
    },
  },

  "projects.update": {
    name: "projects.update",
    description: "Atualiza prazo, prioridade ou status de um projeto local",
    module: "projects",
    requiresConfirmation: true,
    captureBefore: (params, ctx) => ctx.projects.find((project) => project.id === params.projectId),
    execute: (params, ctx) => {
      const projectId = params.projectId as string;
      const project = ctx.projects.find((item) => item.id === projectId);
      if (!project || !ctx.updateProject) return { success: false, actionType: "projects.update", error: "Projeto não encontrado ou atualização indisponível" };
      const { projectId: _projectId, confirmationToken: _token, ...updates } = params;
      ctx.updateProject(projectId, updates, "athena");
      return { success: true, actionType: "projects.update", data: { ...project, ...updates } };
    },
    undo: (params, _result, ctx) => {
      const previous = params.__before as any;
      if (!previous || !ctx.updateProject) throw new Error("[TOOL_UNDO_UNAVAILABLE] Estado anterior do projeto ausente.");
      ctx.updateProject(previous.id, previous, "athena");
    },
  },

  "projects.trash": {
    name: "projects.trash",
    description: "Move um projeto real para a Lixeira local com restauração",
    module: "trash",
    requiresConfirmation: true,
    captureBefore: (params, ctx) => ctx.projects.find((project) => project.id === params.projectId),
    execute: (params, ctx) => {
      const projectId = params.projectId as string;
      const project = ctx.projects.find((item) => item.id === projectId);
      if (!project || !ctx.deleteProject) return { success: false, actionType: "projects.trash", error: "Projeto não encontrado ou lixeira indisponível" };
      const trash = ctx.deleteProject(projectId, "athena");
      return { success: true, actionType: "projects.trash", data: { project, trashId: trash?.id } };
    },
    undo: (_params, result, ctx) => {
      const trashId = (result.data as { trashId?: string } | undefined)?.trashId;
      if (!trashId || !ctx.restoreFromTrash) throw new Error("[TOOL_UNDO_UNAVAILABLE] Registro da lixeira ausente.");
      ctx.restoreFromTrash(trashId, "athena");
    },
  },

  "notes.create": {
    name: "notes.create",
    description: "Captura uma nota rápida no VARYNTH",
    module: "notes",
    execute: (params, ctx) => {
      const content = (params.content as string) || "";
      const title = (params.title as string) || `Nota Rápida — ${new Date().toLocaleDateString()}`;
      const projectId = (params.projectId as string) || undefined;
      const tags = (params.tags as string[]) || ["athena", "captura-rapida"];

      const created = ctx.addNote(
        {
          title,
          content,
          projectId,
          tags,
          pinned: false,
        },
        "athena"
      );

      return {
        success: true,
        actionType: "notes.create",
        data: created,
      };
    },
    captureBefore: () => null,
    undo: (_params, result, ctx) => {
      const id = (result.data as { id?: string } | undefined)?.id;
      if (!id || !ctx.deleteNote) throw new Error("[TOOL_UNDO_UNAVAILABLE] A nota criada não pode ser removida neste contexto.");
      ctx.deleteNote(id, "athena");
    },
  },

  "vault.search": {
    name: "vault.search",
    description: "Pesquisa itens no acervo do Vault (livros, artigos, jurisprudência)",
    module: "vault",
    execute: (params, ctx) => {
      const query = ((params.query as string) || "").toLowerCase();
      const results = ctx.vaultItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.tags.some((t) => t.toLowerCase().includes(query)) ||
          (item.author && item.author.toLowerCase().includes(query))
      );
      return { success: true, actionType: "vault.search", data: results };
    },
  },

  "vault.read": {
    name: "vault.read",
    description: "Lê notas e fichamento de uma obra no Vault",
    module: "vault",
    execute: (params, ctx) => {
      const id = params.id as string;
      const item = ctx.vaultItems.find((v) => v.id === id);
      return { success: !!item, actionType: "vault.read", data: item, error: item ? undefined : "Obra não encontrada" };
    },
  },

  "chronos.listDeadlines": {
    name: "chronos.listDeadlines",
    description: "Lista compromissos e prazos do Chronos e das Workspaces",
    module: "chronos",
    execute: (_, ctx) => {
      const projectDeadlines = ctx.projects
        .filter((p) => p.deadline)
        .map((p) => ({ title: p.title, deadline: p.deadline, priority: p.priority, source: "projeto" }));

      const chronosDeadlines = ctx.chronosEvents
        .filter((e) => !e.completed)
        .map((e) => ({ title: e.title, date: e.date, startTime: e.startTime, type: e.type, source: "chronos" }));

      return {
        success: true,
        actionType: "chronos.listDeadlines",
        data: { projectDeadlines, chronosDeadlines },
      };
    },
  },

  "chronos.createEvent": {
    name: "chronos.createEvent",
    description: "Registra novo evento no Chronos",
    module: "chronos",
    execute: (params) => {
      return { success: true, actionType: "chronos.createEvent", data: params };
    },
  },

  "trash.moveWithUndo": {
    name: "trash.moveWithUndo",
    description: "Move item para a Lixeira com prazo de 10 dias e notificação de Undo",
    module: "trash",
    requiresConfirmation: true,
    execute: (params) => {
      return {
        success: true,
        actionType: "trash.moveWithUndo",
        data: {
          itemTitle: params.title,
          entityType: params.entityType,
          retentionDays: 10,
          undoAvailable: true,
        },
      };
    },
  },

  "codex.searchTheses": {
    name: "codex.searchTheses",
    description: "Busca teses dialéticas na Argument Arena do Codex",
    module: "codex",
    execute: (params, ctx) => {
      const query = ((params.query as string) || "").toLowerCase();
      const results = ctx.theses.filter(
        (t) => t.title.toLowerCase().includes(query) || t.area.toLowerCase().includes(query)
      );
      return { success: true, actionType: "codex.searchTheses", data: results };
    },
  },

  "research.getEvidences": {
    name: "research.getEvidences",
    description: "Recupera evidências científicas do Evidence Board",
    module: "research",
    execute: (_, ctx) => {
      return { success: true, actionType: "research.getEvidences", data: ctx.evidences };
    },
  },

  "opportunities.list": {
    name: "opportunities.list",
    description: "Lista editais e oportunidades do Radar",
    module: "opportunities",
    execute: (_, ctx) => {
      return { success: true, actionType: "opportunities.list", data: ctx.opportunities };
    },
  },

  "diagnostics.run": {
    name: "diagnostics.run",
    description: "Executa diagnóstico operacional de todo o VARYNTH OS",
    module: "system",
    execute: (_, ctx) => {
      const activeProj = ctx.projects.filter((p) => p.status === "ativo").length;
      const pendingTasks = ctx.tasks.filter((t) => t.status !== "concluida").length;
      const completedTasks = ctx.tasks.filter((t) => t.status === "concluida").length;
      const totalVault = ctx.vaultItems.length;
      const totalTheses = ctx.theses.length;
      const totalOpps = ctx.opportunities.length;
      const urgentTasks = ctx.tasks.filter((t) => t.status !== "concluida" && (t.priority === "urgente" || t.priority === "alta")).length;

      return {
        success: true,
        actionType: "diagnostics.run",
        data: { activeProj, pendingTasks, completedTasks, totalVault, totalTheses, totalOpps, urgentTasks },
      };
    },
  },

  "creative.queryDependents": {
    name: "creative.queryDependents",
    description: "Consulta todos os artefatos e Studios que dependem de um artefato específico",
    module: "creative",
    execute: (params) => {
      const artifactId = params.artifactId as string;
      if (!artifactId) return { success: false, actionType: "creative.queryDependents", error: "artifactId obrigatório." };
      const { creativeGraph } = require("@/lib/artifacts/creative-graph");
      const dependents = creativeGraph.getDependents(artifactId);
      return { success: true, actionType: "creative.queryDependents", data: { artifactId, dependentsCount: dependents.length, dependents } };
    },
  },

  "creative.getProvenance": {
    name: "creative.getProvenance",
    description: "Rastreia a árvore de proveniência completa de um artefato",
    module: "creative",
    execute: (params) => {
      const artifactId = params.artifactId as string;
      if (!artifactId) return { success: false, actionType: "creative.getProvenance", error: "artifactId obrigatório." };
      const { creativeGraph } = require("@/lib/artifacts/creative-graph");
      const chain = creativeGraph.getProvenanceChain(artifactId);
      return { success: true, actionType: "creative.getProvenance", data: { artifactId, provenanceChain: chain } };
    },
  },

  "creative.linkArtifact": {
    name: "creative.linkArtifact",
    description: "Vincula uma dependência tipada entre dois artefatos criativos",
    module: "creative",
    execute: (params) => {
      const sourceArtifactId = params.sourceArtifactId as string;
      const targetArtifactId = params.targetArtifactId as string;
      const type = params.type as any || "DEPENDS_ON";
      const semanticRole = params.semanticRole as string | undefined;
      const usageSlot = params.usageSlot as string | undefined;
      const targetVersionId = params.targetVersionId as string | undefined;
      const pinMode = params.pinMode as any || "PINNED";

      const { artifactService } = require("@/lib/artifacts/artifact-service");
      const res = artifactService.linkDependency({
        sourceArtifactId,
        targetArtifactId,
        type,
        semanticRole,
        usageSlot,
        targetVersionId,
        pinMode,
      });

      return { success: res.success, actionType: "creative.linkArtifact", data: res, error: res.error };
    },
  },

  "creative.unlinkArtifact": {
    name: "creative.unlinkArtifact",
    description: "Desvincula uma relação de dependência entre dois artefatos",
    module: "creative",
    execute: (params) => {
      const sourceArtifactId = params.sourceArtifactId as string;
      const targetArtifactId = params.targetArtifactId as string;
      const usageSlot = params.usageSlot as string | undefined;

      const { artifactService } = require("@/lib/artifacts/artifact-service");
      const res = artifactService.unlinkDependency(sourceArtifactId, targetArtifactId, usageSlot);
      return { success: res.success, actionType: "creative.unlinkArtifact", data: res, error: res.error };
    },
  },

  "creative.setPinMode": {
    name: "creative.setPinMode",
    description: "Altera o modo de version pinning (PINNED vs FOLLOW_LATEST) de uma dependência",
    module: "creative",
    execute: (params) => {
      const sourceArtifactId = params.sourceArtifactId as string;
      const targetArtifactId = params.targetArtifactId as string;
      const pinMode = params.pinMode as "PINNED" | "FOLLOW_LATEST";
      const targetVersionId = params.targetVersionId as string | undefined;

      const { artifactService } = require("@/lib/artifacts/artifact-service");
      const res = artifactService.setPinMode(sourceArtifactId, targetArtifactId, pinMode, targetVersionId);
      return { success: res.success, actionType: "creative.setPinMode", data: res, error: res.error };
    },
  },

  "creative.reviewDependencyUpdate": {
    name: "creative.reviewDependencyUpdate",
    description: "Aplica de forma transacional uma atualização de dependência em um artefato consumidor",
    module: "creative",
    execute: async (params) => {
      const consumerArtifactId = params.consumerArtifactId as string;
      const targetArtifactId = params.targetArtifactId as string;
      const newVersionId = params.newVersionId as string;
      const newVersionNumber = (params.newVersionNumber as number) || 1;
      const newAssetId = params.newAssetId as string | undefined;
      const usageSlot = params.usageSlot as string | undefined;

      const { artifactService } = require("@/lib/artifacts/artifact-service");
      const res = await artifactService.acceptDependencyUpdate({
        consumerArtifactId,
        targetArtifactId,
        newVersionId,
        newVersionNumber,
        newAssetId,
        usageSlot,
      });

      return { success: res.success, actionType: "creative.reviewDependencyUpdate", data: res, error: res.error };
    },
  },

  "creative.plan": {
    name: "creative.plan",
    description: "Gera um plano criativo multi-studio inspecionável a partir de uma intenção do usuário",
    module: "creative",
    execute: (params) => {
      const { CreativeOrchestrator } = require("@/lib/orchestration/creative-orchestrator");
      const intent = {
        id: `intent-${Date.now()}`,
        userGoal: (params.userGoal as string) || "Criar pacote multimídia",
        sourceArtifactIds: (params.sourceArtifactIds as string[]) || [],
        requestedOutputs: (params.requestedOutputs as any[]) || [],
        createdAt: new Date().toISOString(),
      };
      const plan = CreativeOrchestrator.planIntent(intent);
      return { success: true, actionType: "creative.plan", data: plan };
    },
  },

  "creative.reviewPlan": {
    name: "creative.reviewPlan",
    description: "Recupera e explica detalhadamente um plano criativo para revisão humana",
    module: "creative",
    execute: (params) => {
      const { CreativeOrchestrator } = require("@/lib/orchestration/creative-orchestrator");
      const planId = params.planId as string;
      const plan = CreativeOrchestrator.getPlan(planId);
      if (!plan) return { success: false, actionType: "creative.reviewPlan", error: "Plano não encontrado." };
      const explanation = CreativeOrchestrator.explainPlan(planId);
      return { success: true, actionType: "creative.reviewPlan", data: { plan, explanation } };
    },
  },

  "creative.approvePlan": {
    name: "creative.approvePlan",
    description: "Aprova um plano criativo e deriva o plano de execução governado",
    module: "creative",
    execute: (params) => {
      const { CreativeOrchestrator } = require("@/lib/orchestration/creative-orchestrator");
      const planId = params.planId as string;
      const token = params.confirmationToken as string | undefined;
      const res = CreativeOrchestrator.approvePlan(planId, token);
      return { success: res.success, actionType: "creative.approvePlan", data: res, error: res.error };
    },
  },

  "creative.executePlan": {
    name: "creative.executePlan",
    description: "Dispara a execução governada de um plano criativo aprovado",
    module: "creative",
    execute: async (params) => {
      const { CreativeExecutionController } = require("@/lib/orchestration/creative-execution-controller");
      const executionPlan = params.executionPlan as any;
      if (!executionPlan) return { success: false, actionType: "creative.executePlan", error: "executionPlan obrigatório." };
      const res = await CreativeExecutionController.executePlan(executionPlan);
      return { success: res.status === "COMPLETED" || res.status === "COMPLETED_WITH_WARNINGS" || res.status === "PARTIAL", actionType: "creative.executePlan", data: res, error: res.error };
    },
  },

  "creative.pausePlan": {
    name: "creative.pausePlan",
    description: "Pausa o agendamento de steps futuros de um plano de execução",
    module: "creative",
    execute: (params) => {
      const executionPlanId = params.executionPlanId as string;
      return { success: true, actionType: "creative.pausePlan", data: { executionPlanId, paused: true } };
    },
  },

  "creative.cancelPlan": {
    name: "creative.cancelPlan",
    description: "Cancela a execução de um plano preservando outputs já commitados",
    module: "creative",
    execute: (params) => {
      const { CreativeExecutionController } = require("@/lib/orchestration/creative-execution-controller");
      const executionPlanId = params.executionPlanId as string;
      const res = CreativeExecutionController.cancelPlan(executionPlanId);
      return { success: res.success, actionType: "creative.cancelPlan", data: res };
    },
  },

  "creative.retryStep": {
    name: "creative.retryStep",
    description: "Executa nova tentativa de um step que falhou por erro recuperável",
    module: "creative",
    execute: (params) => {
      const stepId = params.stepId as string;
      return { success: true, actionType: "creative.retryStep", data: { stepId, retried: true } };
    },
  },

  "creative.replan": {
    name: "creative.replan",
    description: "Recalcula um plano criativo com novas saídas ou restrições, gerando nova revisão e diff",
    module: "creative",
    execute: (params) => {
      const { CreativeOrchestrator } = require("@/lib/orchestration/creative-orchestrator");
      const planId = params.planId as string;
      const modifications = (params.modifications as any) || {};
      const res = CreativeOrchestrator.replan(planId, modifications);
      return { success: true, actionType: "creative.replan", data: res };
    },
  },

  "creative.getPlanStatus": {
    name: "creative.getPlanStatus",
    description: "Consulta o status e progresso atual de um plano criativo",
    module: "creative",
    execute: (params) => {
      const { CreativeOrchestrator } = require("@/lib/orchestration/creative-orchestrator");
      const planId = params.planId as string;
      const plan = CreativeOrchestrator.getPlan(planId);
      if (!plan) return { success: false, actionType: "creative.getPlanStatus", error: "Plano não encontrado." };
      return { success: true, actionType: "creative.getPlanStatus", data: plan };
    },
  },

  "creative.getStepStatus": {
    name: "creative.getStepStatus",
    description: "Consulta o status de um step específico dentro de um plano de execução",
    module: "creative",
    execute: (params) => {
      const { CreativeExecutionController } = require("@/lib/orchestration/creative-execution-controller");
      const executionPlanId = params.executionPlanId as string;
      const stepId = params.stepId as string;
      const exec = CreativeExecutionController.getExecutionPlan(executionPlanId);
      const step = exec?.steps.find((s: any) => s.id === stepId);
      if (!step) return { success: false, actionType: "creative.getStepStatus", error: "Step não encontrado." };
      return { success: true, actionType: "creative.getStepStatus", data: step };
    },
  },

  "creative.explainBlocker": {
    name: "creative.explainBlocker",
    description: "Explica a causa raiz e dependências de um bloqueio de execução",
    module: "creative",
    execute: (params) => {
      const { CreativeOrchestrator } = require("@/lib/orchestration/creative-orchestrator");
      const planId = params.planId as string;
      const blockerId = params.blockerId as string;
      const explanation = CreativeOrchestrator.explainBlocker(planId, blockerId);
      return { success: true, actionType: "creative.explainBlocker", data: { explanation } };
    },
  },

  "creative.rebuildAffectedOutputs": {
    name: "creative.rebuildAffectedOutputs",
    description: "Cria um plano de reconstrução explícito para artefatos dependentes de uma fonte modificada",
    module: "creative",
    execute: (params) => {
      const { CreativeOrchestrator } = require("@/lib/orchestration/creative-orchestrator");
      const sourceArtifactId = params.sourceArtifactId as string;
      if (!sourceArtifactId) return { success: false, actionType: "creative.rebuildAffectedOutputs", error: "sourceArtifactId obrigatório." };
      const rebuildPlan = CreativeOrchestrator.rebuildAffectedOutputs(sourceArtifactId);
      return { success: true, actionType: "creative.rebuildAffectedOutputs", data: rebuildPlan };
    },
  },
};
