import { ActionType, ActionResult } from "../domain/action";
import { AthenaEngineContext } from "@/lib/athena/engine";

export interface ToolDefinition {
  name: ActionType;
  description: string;
  module: string;
  requiresConfirmation?: boolean;
  execute: (params: Record<string, unknown>, ctx: AthenaEngineContext) => Promise<ActionResult> | ActionResult;
}

export const registeredTools: Record<ActionType, ToolDefinition> = {
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
  },

  "tasks.toggle": {
    name: "tasks.toggle",
    description: "Alterna o status de conclusão de uma tarefa",
    module: "projects",
    execute: (params, ctx) => {
      const taskId = params.taskId as string;
      const task = ctx.tasks.find((t) => t.id === taskId);
      if (!task) return { success: false, actionType: "tasks.toggle", error: "Tarefa não encontrada" };
      return { success: true, actionType: "tasks.toggle", data: { taskId, updatedStatus: task.status === "concluida" ? "a_fazer" : "concluida" } };
    },
  },

  "tasks.update": {
    name: "tasks.update",
    description: "Atualiza campos de uma tarefa",
    module: "projects",
    execute: (params, ctx) => {
      const taskId = params.taskId as string;
      return { success: true, actionType: "tasks.update", data: { taskId, updates: params } };
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
};

