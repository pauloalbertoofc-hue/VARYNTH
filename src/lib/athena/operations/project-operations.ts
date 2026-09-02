import type { AthenaEngineContext } from "../engine";
import { AthenaMessage, AthenaScope, PriorityLevel, ProjectStatus, Task } from "@/lib/types";

interface PendingOperation {
  description: string;
  execute: () => OperationOutcome;
}

interface UndoOperation {
  description: string;
  execute: () => void;
}

interface OperationOutcome {
  text: string;
  undo?: UndoOperation;
}

const pendingBySession = new Map<string, PendingOperation>();
const undoBySession = new Map<string, UndoOperation>();

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function message(text: string, scope: AthenaScope): AthenaMessage {
  return {
    id: `ath-op-${Date.now()}`,
    sender: "athena",
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    scope,
    metadata: { engine: "deterministic-operational-core" },
  };
}

function parseDate(prompt: string): string | undefined {
  const iso = prompt.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const br = prompt.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (!br) return undefined;
  return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
}

function parsePriority(clean: string): PriorityLevel | undefined {
  if (clean.includes("urgente")) return "urgente";
  if (clean.includes("prioridade alta") || clean.includes("prioridade para alta")) return "alta";
  if (clean.includes("prioridade baixa") || clean.includes("prioridade para baixa")) return "baixa";
  if (clean.includes("prioridade media") || clean.includes("prioridade para media")) return "media";
  return undefined;
}

function findTask(prompt: string, tasks: Task[], projectId?: string): Task | undefined {
  const clean = normalize(prompt);
  const candidates = projectId ? tasks.filter((task) => task.projectId === projectId) : tasks;
  const named = candidates.find((task) => clean.includes(normalize(task.title)));
  if (named) return named;
  return candidates.length === 1 ? candidates[0] : undefined;
}

function projectRequired(scope: AthenaScope): AthenaMessage {
  return message("Não consegui identificar um projeto seguro para essa alteração. Abra o workspace desejado ou informe o nome do projeto.", scope);
}

export class AthenaProjectOperations {
  tryHandle(
    rawPrompt: string,
    scope: AthenaScope,
    ctx: AthenaEngineContext,
    projectId: string | undefined,
    sessionId: string
  ): AthenaMessage | undefined {
    const clean = normalize(rawPrompt);

    if (/^(confirmo|confirmar|pode executar|pode fazer|sim,? execute|sim,? pode)/.test(clean)) {
      const pending = pendingBySession.get(sessionId);
      if (!pending) return message("Não há nenhuma alteração pendente de confirmação nesta conversa.", scope);
      pendingBySession.delete(sessionId);
      try {
        const outcome = pending.execute();
        if (outcome.undo) undoBySession.set(sessionId, outcome.undo);
        return message(outcome.text, scope);
      } catch (error) {
        return message(`Não consegui aplicar a alteração. Nenhum sucesso foi registrado. Motivo: ${error instanceof Error ? error.message : "falha desconhecida"}.`, scope);
      }
    }

    if (/^(cancelar|cancele|nao execute|nao,? cancela)/.test(clean)) {
      if (!pendingBySession.delete(sessionId)) return message("Não havia nenhuma alteração pendente para cancelar.", scope);
      return message("Alteração cancelada. Nenhum dado foi modificado.", scope);
    }

    if (/^(desfazer|desfaca|desfaz|undo)( a ultima acao| ultima acao)?/.test(clean)) {
      const undo = undoBySession.get(sessionId);
      if (!undo) return message("Não há uma ação reversível recente nesta conversa.", scope);
      try {
        undo.execute();
        undoBySession.delete(sessionId);
        return message(`Ação desfeita: **${undo.description}**.`, scope);
      } catch (error) {
        return message(`Não consegui desfazer a ação com segurança. Motivo: ${error instanceof Error ? error.message : "falha desconhecida"}.`, scope);
      }
    }

    const project = projectId ? ctx.projects.find((item) => item.id === projectId) : undefined;

    if (clean.includes("organize") && clean.includes("proxim") && clean.includes("taref")) {
      if (!project) return projectRequired(scope);
      const pendingTasks = ctx.tasks.filter((task) => task.projectId === project.id && task.status !== "concluida").slice(0, 3);
      const suggestions = [
        "Definir a próxima entrega verificável",
        "Executar a etapa prioritária do projeto",
        "Revisar o resultado e registrar aprendizados",
      ];
      const preview = Array.from({ length: 3 }, (_, index) => pendingTasks[index]?.title || suggestions[index]);
      pendingBySession.set(sessionId, {
        description: `Organizar as próximas três tarefas de ${project.title}`,
        execute: () => {
          const previous = pendingTasks.map((task) => ({ id: task.id, priority: task.priority }));
          const created: Task[] = [];
          const priorities: PriorityLevel[] = ["urgente", "alta", "media"];
          preview.forEach((title, index) => {
            const existing = pendingTasks[index];
            if (existing && ctx.updateTask) ctx.updateTask(existing.id, { priority: priorities[index] }, "athena");
            else created.push(ctx.addTask({ title, projectId: project.id, priority: priorities[index], status: "a_fazer" }, "athena"));
          });
          return {
            text: `Organização aplicada em **${project.title}**:\n${preview.map((title, index) => `${index + 1}. ${title} — ${priorities[index]}`).join("\n")}\n\nAs alterações foram registradas no histórico.`,
            undo: {
              description: "organização das próximas três tarefas",
              execute: () => {
                previous.forEach((item) => ctx.updateTask?.(item.id, { priority: item.priority }, "athena"));
                created.forEach((task) => ctx.deleteTask?.(task.id, "athena"));
              },
            },
          };
        },
      });
      return message(`Preparei esta proposta para **${project.title}**:\n${preview.map((title, index) => `${index + 1}. ${title} — ${["urgente", "alta", "média"][index]}`).join("\n")}\n\nIsso alterará prioridades e poderá criar tarefas ausentes. Responda **“confirmar”** para aplicar ou **“cancelar”** para abandonar.`, scope);
    }

    if (clean.includes("arquiv") && clean.includes("projeto")) {
      if (!project || !ctx.updateProject) return projectRequired(scope);
      const previousStatus = project.status;
      pendingBySession.set(sessionId, {
        description: `Arquivar o projeto ${project.title}`,
        execute: () => {
          ctx.updateProject?.(project.id, { status: "arquivado" }, "athena");
          return {
            text: `Projeto **${project.title}** arquivado com sucesso. A alteração foi registrada no histórico.`,
            undo: {
              description: `arquivamento de ${project.title}`,
              execute: () => ctx.updateProject?.(project.id, { status: previousStatus }, "athena"),
            },
          };
        },
      });
      return message(`Arquivar **${project.title}** remove o projeto das workspaces ativas, mas preserva todos os dados. Responda **“confirmar”** para arquivar ou **“cancelar”**.`, scope);
    }

    if ((clean.includes("lixeira") || /^(excluir|apagar|remover|deletar) (o )?projeto/.test(clean)) && clean.includes("projeto")) {
      if (!project || !ctx.deleteProject) return projectRequired(scope);
      pendingBySession.set(sessionId, {
        description: `Mover o projeto ${project.title} para a lixeira`,
        execute: () => {
          const trash = ctx.deleteProject?.(project.id, "athena");
          return {
            text: `Projeto **${project.title}** movido para a Lixeira com retenção de 10 dias. Você pode responder **“desfazer”** nesta conversa.`,
            undo: trash?.id && ctx.restoreFromTrash
              ? { description: `envio de ${project.title} à lixeira`, execute: () => ctx.restoreFromTrash?.(trash.id, "athena") }
              : undefined,
          };
        },
      });
      return message(`Mover **${project.title}** para a Lixeira retirará o workspace da área ativa. Ele ficará recuperável por 10 dias. Responda **“confirmar”** ou **“cancelar”**.`, scope);
    }

    const deadline = parseDate(rawPrompt);
    if (project && deadline && (clean.includes("prazo") || clean.includes("data"))) {
      if (!ctx.updateProject) return message("A atualização de projetos não está disponível nesta superfície.", scope);
      const previous = project.deadline;
      ctx.updateProject(project.id, { deadline }, "athena");
      undoBySession.set(sessionId, { description: `alteração do prazo de ${project.title}`, execute: () => ctx.updateProject?.(project.id, { deadline: previous }, "athena") });
      return message(`Prazo de **${project.title}** atualizado para **${deadline}**. A mudança foi registrada no histórico e pode ser desfeita respondendo **“desfazer”**.`, scope);
    }

    const priority = parsePriority(clean);
    if (project && priority && clean.includes("projeto")) {
      if (!ctx.updateProject) return message("A atualização de projetos não está disponível nesta superfície.", scope);
      const previous = project.priority;
      ctx.updateProject(project.id, { priority }, "athena");
      undoBySession.set(sessionId, { description: `alteração da prioridade de ${project.title}`, execute: () => ctx.updateProject?.(project.id, { priority: previous }, "athena") });
      return message(`Prioridade de **${project.title}** alterada para **${priority}**. Responda **“desfazer”** para restaurar **${previous}**.`, scope);
    }

    const requestedStatus: ProjectStatus | undefined =
      clean.includes("ative o projeto") || clean.includes("projeto como ativo") ? "ativo" :
      clean.includes("projeto em espera") ? "em_espera" :
      clean.includes("projeto como concluido") || clean.includes("conclua o projeto") ? "concluido" : undefined;
    if (project && requestedStatus) {
      if (!ctx.updateProject) return message("A atualização de projetos não está disponível nesta superfície.", scope);
      const previous = project.status;
      ctx.updateProject(project.id, { status: requestedStatus }, "athena");
      undoBySession.set(sessionId, { description: `alteração do status de ${project.title}`, execute: () => ctx.updateProject?.(project.id, { status: previous }, "athena") });
      return message(`Status de **${project.title}** alterado para **${requestedStatus.replaceAll("_", " ")}**. Responda **“desfazer”** para restaurar o estado anterior.`, scope);
    }

    if (/\b(conclua|concluir|marque como concluida|reabra|reabrir)\b/.test(clean) && clean.includes("tarefa")) {
      const task = findTask(rawPrompt, ctx.tasks, projectId);
      if (!task) return message("Não consegui identificar uma única tarefa. Informe o título da tarefa que deseja alterar.", scope);
      const shouldComplete = !clean.includes("reabr");
      const previousStatus = task.status;
      if (ctx.updateTask) ctx.updateTask(task.id, { status: shouldComplete ? "concluida" : "a_fazer", completedAt: shouldComplete ? new Date().toISOString() : undefined }, "athena");
      else if (ctx.toggleTask && ((task.status === "concluida") !== shouldComplete)) ctx.toggleTask(task.id, "athena");
      else return message("A atualização de tarefas não está disponível nesta superfície.", scope);
      undoBySession.set(sessionId, { description: `alteração da tarefa ${task.title}`, execute: () => ctx.updateTask?.(task.id, { status: previousStatus, completedAt: task.completedAt }, "athena") });
      return message(`Tarefa **${task.title}** ${shouldComplete ? "concluída" : "reaberta"} com sucesso. A alteração foi registrada e pode ser desfeita.`, scope);
    }

    if (/^(crie|criar|adicione|adicionar|nova) uma? tarefa\b/.test(clean) || /^(crie|criar|adicione|adicionar|nova) tarefa\b/.test(clean)) {
      let title = rawPrompt.replace(/^(crie|criar|adicione|adicionar|nova)\s+(uma\s+)?tarefa\s*[:\-]?\s*/i, "");
      title = title.replace(/\b(com )?prioridade\s+(baixa|media|média|alta|urgente)\b/gi, "").replace(/\bpara\s+\d{1,2}\/\d{1,2}\/20\d{2}\b/g, "").trim();
      if (!title) return message("Qual deve ser o título da nova tarefa?", scope);
      const created = ctx.addTask({ title, projectId, priority: priority || "media", dueDate: deadline, status: "a_fazer" }, "athena");
      if (ctx.deleteTask) undoBySession.set(sessionId, { description: `criação da tarefa ${created.title}`, execute: () => ctx.deleteTask?.(created.id, "athena") });
      return message(`Tarefa **${created.title}** criada${project ? ` em **${project.title}**` : " no escopo geral"} com prioridade **${created.priority}**${created.dueDate ? ` e prazo **${created.dueDate}**` : ""}.`, scope);
    }

    if (/^(crie|criar|adicione|adicionar) uma? nota\b/.test(clean) || /^(anote|anotar)\b/.test(clean)) {
      const content = rawPrompt.replace(/^(crie|criar|adicione|adicionar)\s+(uma\s+)?nota\s*[:\-]?\s*/i, "").replace(/^(anote|anotar)( isso)?\s*[:\-]?\s*/i, "").trim();
      if (!content) return message("O que você quer registrar na nota?", scope);
      const title = content.length > 60 ? `${content.slice(0, 57)}...` : content;
      ctx.addNote({ title, content, projectId, tags: ["athena"], pinned: false }, "athena");
      return message(`Nota **${title}** criada${project ? ` e vinculada a **${project.title}**` : ""}. A ação foi registrada no histórico.`, scope);
    }

    if (/^(excluir|apagar|remover|deletar) (a )?tarefa/.test(clean)) {
      const task = findTask(rawPrompt, ctx.tasks, projectId);
      if (!task || !ctx.deleteTask) return message("Não consegui identificar uma única tarefa segura para remover.", scope);
      pendingBySession.set(sessionId, {
        description: `Mover a tarefa ${task.title} para a lixeira`,
        execute: () => {
          ctx.deleteTask?.(task.id, "athena");
          return { text: `Tarefa **${task.title}** movida para a Lixeira com retenção de 10 dias.` };
        },
      });
      return message(`A tarefa **${task.title}** será movida para a Lixeira e ficará recuperável por 10 dias. Responda **“confirmar”** ou **“cancelar”**.`, scope);
    }

    return undefined;
  }
}

export const athenaProjectOperations = new AthenaProjectOperations();
