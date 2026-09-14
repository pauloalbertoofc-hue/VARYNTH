import { AthenaTask } from "../domain/task";
import { AthenaContext } from "../domain/context";
import { AthenaResponse, AthenaActionCard } from "../domain/response";
import { WorkflowExecutionResult } from "../runtime/workflow-executor";
import { DeliberationResult } from "../domain/result";

export class ResponseBuilder {
  buildResponse(
    task: AthenaTask,
    context: AthenaContext,
    workflowResult?: WorkflowExecutionResult,
    deliberationResult?: DeliberationResult
  ): AthenaResponse {
    let text = "";
    let actionCard: AthenaActionCard | undefined;

    const p = task.rawPrompt.toLowerCase();

    // 1. If tool output is present (Fast Path)
    if (workflowResult?.toolOutputs) {
      const step1 = workflowResult.toolOutputs["step-1"] as any;

      if (step1?.actionType === "tasks.create" && step1.data) {
        const created = step1.data;
        text = `Entendido! Criei a tarefa **"${created.title}"** com prioridade **${created.priority.toUpperCase()}**${context.activeProject ? ` vinculada ao projeto **${context.activeProject.title}**` : " no escopo geral"}.`;
        actionCard = {
          type: "tarefa_criada",
          title: created.title,
          subtitle: context.activeProject ? `Projeto: ${context.activeProject.title}` : "Tarefa Geral",
          link: context.activeProject ? `/projects/${context.activeProject.id}` : "/dashboard",
          linkLabel: "Ver no Projeto",
        };
      } else if (step1?.actionType === "notes.create" && step1.data) {
        const note = step1.data;
        text = `Anotação capturada e salva com sucesso nas Notas do seu VARYNTH OS.`;
        actionCard = {
          type: "nota_criada",
          title: "Nota salva nas notas globais",
          subtitle: `"${note.content?.slice(0, 60)}..."`,
          link: "/dashboard",
          linkLabel: "Abrir no Início",
        };
      } else if (step1?.actionType === "chronos.listDeadlines" && step1.data) {
        const { projectDeadlines, chronosDeadlines } = step1.data;
        const all = [
          ...projectDeadlines.map((p: any) => `• **${p.title}**: entrega prevista para **${p.deadline}** (Prioridade: ${p.priority})`),
          ...chronosDeadlines.map((c: any) => `• **[${c.type.toUpperCase()}] ${c.title}**: data **${c.date}**${c.startTime ? ` às ${c.startTime}` : ""}`),
        ];
        text =
          all.length > 0
            ? `Aqui estão os principais prazos mapeados no seu Chronos e nas workspaces:\n\n${all.join("\n")}\n\nRecomendo focar primeiro nas entregas com prioridade urgente.`
            : "Não encontrei prazos pendentes cadastrados no momento.";
        actionCard = {
          type: "prazos",
          title: "Prazos & Calendário Sincronizados",
          subtitle: `${all.length} compromissos ativos no Chronos`,
          link: "/modules/chronos",
          linkLabel: "Abrir Chronos",
        };
      } else if (step1?.actionType === "trash.moveWithUndo") {
        text = `🗑️ **Protocolo de Exclusão Segura (Retenção de 10 Dias):**\n\nNo VARYNTH OS, todas as exclusões exigem confirmação manual e são direcionadas para a **Lixeira Central** com prazo de **10 dias** antes da auto-destruição permanente.\n\nDurante esse período de 10 dias, você pode **restaurar** qualquer projeto, tarefa, nota ou código excluído com um único clique na Lixeira.`;
        actionCard = {
          type: "diagnostico",
          title: "Lixeira Central do VARYNTH OS",
          subtitle: "Gerenciar itens excluídos e retenção de 10 dias",
          link: "/modules/trash",
          linkLabel: "Abrir Lixeira",
        };
      } else if (step1?.actionType === "diagnostics.run" && step1.data) {
        const d = step1.data;
        text = `📊 **Diagnóstico Operacional do VARYNTH OS:**\n\n• **Projetos Ativos**: ${d.activeProj} workspaces em andamento\n• **Tarefas**: ${d.pendingTasks} pendentes / ${d.completedTasks} já concluídas\n• **Vault de Conhecimento**: ${d.totalVault} obras e jurisprudências fichadas\n• **Argument Arena**: ${d.totalTheses} teses dialéticas estruturadas\n• **Radar de Editais**: ${d.totalOpps} oportunidades e bolsas mapeadas\n\n💡 **Status Operacional**: ${d.urgentTasks > 0 ? `Você tem ${d.urgentTasks} tarefas prioritárias pendentes para avançar.` : "Tudo em dia no seu ecossistema!"}`;
        actionCard = {
          type: "diagnostico",
          title: "VARYNTH OS — Status Operacional 100%",
          subtitle: `${d.activeProj} Projetos · ${d.pendingTasks} Tarefas Pendentes`,
          link: "/dashboard",
          linkLabel: "Ir para o Cockpit",
        };
      }
    }

    // 2. If Cognitive Deliberation output is present
    if (!text && deliberationResult) {
      text = deliberationResult.consensusSummary;
      if (task.scope === "juridico") {
        actionCard = {
          type: "tese",
          title: "Análise Jurídica do Conselho",
          subtitle: "Codex & Argument Arena",
          link: "/modules/codex",
          linkLabel: "Abrir Codex",
        };
      } else if (task.scope === "pesquisa") {
        actionCard = {
          type: "evidencia",
          title: "Validação Metodológica do Conselho",
          subtitle: "Evidence Board",
          link: "/modules/research",
          linkLabel: "Abrir Research",
        };
      }
    }

    // 3. Fallback text if still empty
    if (!text) {
      text = `Não consegui concluir com segurança o pedido *"${task.rawPrompt}"*. Nenhuma ação foi aplicada. Informe o resultado esperado e, se houver, o item ou projeto envolvido.`;
    }

    return {
      id: "athena-" + Date.now(),
      sender: "athena",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scope: context.scope,
      actionCard,
      participatingAgents: deliberationResult?.participatingAgents,
    };
  }
}

export const athenaResponseBuilder = new ResponseBuilder();
