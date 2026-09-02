import { ActionType, ActionResult } from "../domain/action";
import { registeredTools, ToolDefinition } from "./registry";
import { AthenaEngineContext } from "@/lib/athena/engine";
import { athenaEventBus } from "../events/event-bus";
import { permissionPolicyEngine } from "@/lib/permissions/permission-policy";
import { VarynthAction, SecurityTargetDomain, ActorType } from "@/lib/permissions/types";

export class ToolManager {
  private tools: Map<ActionType, ToolDefinition> = new Map();

  constructor() {
    Object.entries(registeredTools).forEach(([key, def]) => {
      this.tools.set(key as ActionType, def);
    });
  }

  getTool(name: ActionType): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  prepareConfirmation(name: ActionType, params: Record<string, unknown>, expectedRevision: number) {
    const { action, targetDomain } = this.mapToolToPermission(name);
    const criticalParameters = this.withoutConfirmationToken(params);
    return permissionPolicyEngine.generateConfirmation(
      action,
      targetDomain,
      `Confirmar ${name} com os parâmetros exibidos no plano.`,
      ["A confirmação vale uma vez e será invalidada se o plano ou os parâmetros mudarem."],
      (params.id as string) || (params.taskId as string),
      { expectedRevision, criticalParameters }
    );
  }

  captureBefore(name: ActionType, params: Record<string, unknown>, ctx: AthenaEngineContext): unknown {
    return this.tools.get(name)?.captureBefore?.(params, ctx);
  }

  async undoTool(name: ActionType, params: Record<string, unknown>, result: ActionResult, ctx: AthenaEngineContext): Promise<void> {
    const undo = this.tools.get(name)?.undo;
    if (!undo) throw new Error(`[TOOL_UNDO_UNAVAILABLE] ${name}`);
    await undo(params, result, ctx);
  }

  private withoutConfirmationToken(params: Record<string, unknown>): Record<string, unknown> {
    const { confirmationToken: _token, ...criticalParameters } = params;
    return criticalParameters;
  }

  private mapToolToPermission(name: ActionType): { action: VarynthAction; targetDomain: SecurityTargetDomain } {
    switch (name) {
      case "tasks.create":
        return { action: "CREATE", targetDomain: "WORKSPACE_TASK" };
      case "tasks.update":
      case "tasks.toggle":
        return { action: "MODIFY", targetDomain: "WORKSPACE_TASK" };
      case "notes.create":
        return { action: "CREATE", targetDomain: "WORKSPACE_NOTE" };
      case "vault.read":
      case "vault.search":
        return { action: "READ", targetDomain: "VAULT" };
      case "chronos.listDeadlines":
        return { action: "READ", targetDomain: "CHRONOS" };
      case "chronos.createEvent":
        return { action: "CREATE", targetDomain: "CHRONOS" };
      case "trash.moveWithUndo":
        return { action: "DELETE_SOFT", targetDomain: "WORKSPACE_PROJECT" };
      case "codex.searchTheses":
        return { action: "READ", targetDomain: "CODEX_THESES" };
      case "research.getEvidences":
        return { action: "READ", targetDomain: "RESEARCH_EVIDENCES" };
      case "creative.queryDependents":
      case "creative.getProvenance":
        return { action: "READ", targetDomain: "ARTIFACT_ACTIVE" };
      case "creative.linkArtifact":
      case "creative.unlinkArtifact":
      case "creative.setPinMode":
        return { action: "MODIFY", targetDomain: "ARTIFACT_DRAFT" };
      case "creative.reviewDependencyUpdate":
        return { action: "MODIFY", targetDomain: "ARTIFACT_ACTIVE" };
      case "creative.approvePlan":
        return { action: "PUBLISH", targetDomain: "ARTIFACT_PUBLISHED" };
      case "creative.executePlan":
        return { action: "EXECUTE", targetDomain: "ARTIFACT_DRAFT" };
      default:
        return { action: "READ", targetDomain: "WORKSPACE_PROJECT" };
    }
  }

  async executeTool(
    name: ActionType,
    params: Record<string, unknown>,
    ctx: AthenaEngineContext,
    taskId?: string,
    actorType: ActorType = "ATHENA"
  ): Promise<ActionResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        actionType: name,
        error: `Ferramenta "${name}" não encontrada no ToolManager da Athena.`,
      };
    }

    // 1. Permission Policy Evaluation
    const { action, targetDomain } = this.mapToolToPermission(name);
    const decision = permissionPolicyEngine.evaluate({
      actor: { type: actorType },
      action,
      targetDomain,
      context: params,
    });

    if (!decision.allowed && decision.policy === "DENY") {
      athenaEventBus.emit(
        "ACTION_DENIED",
        { toolName: name, reason: decision.reason, suggestedAlternative: decision.suggestedAlternative },
        taskId
      );
      return {
        success: false,
        actionType: name,
        error: `[PERMISSÃO NEGADA] ${decision.reason}${decision.suggestedAlternative ? ` Alternativa: ${decision.suggestedAlternative}` : ""}`,
      };
    }

    if (decision.requiresConfirmation && decision.policy === "CONFIRM") {
      const token = params.confirmationToken as string | undefined;
      if (token) {
        const verified = permissionPolicyEngine.verifyAndConsumeToken(token, {
          currentParameters: this.withoutConfirmationToken(params),
        });
        if (verified.valid) {
          athenaEventBus.emit("ACTION_ALLOWED", { toolName: name, confirmationActionId: verified.confirmation?.actionId }, taskId);
        } else {
          return { success: false, actionType: name, error: `[CONFIRMAÇÃO INVÁLIDA] ${verified.error}` };
        }
      } else {
      const conf = permissionPolicyEngine.generateConfirmation(
        action,
        targetDomain,
        `Execução da ferramenta "${name}"`,
        ["Esta operação requer validação explícita do usuário."],
        (params.id as string) || (params.taskId as string)
      );

      athenaEventBus.emit("ACTION_CONFIRMATION_REQUIRED", { toolName: name, confirmation: conf }, taskId);

      return {
        success: false,
        actionType: name,
        error: `[CONFIRMAÇÃO NECESSÁRIA] ${decision.reason}`,
        data: {
          requiresConfirmation: true,
          confirmationToken: conf.token,
          summary: conf.summary,
        },
      };
      }
    }

    athenaEventBus.emit("ACTION_ALLOWED", { toolName: name, params }, taskId);
    athenaEventBus.emit("ACTION_INVOKED", { toolName: name, params }, taskId);

    try {
      const result = await tool.execute(params, ctx);
      athenaEventBus.emit("ACTION_EXECUTED", { toolName: name, success: result.success }, taskId);
      return result;
    } catch (err: any) {
      athenaEventBus.emit("ERROR_OCCURRED", { toolName: name, error: err?.message || String(err) }, taskId);
      return {
        success: false,
        actionType: name,
        error: err?.message || "Erro desconhecido durante execução da ferramenta.",
      };
    }
  }
}

export const athenaToolManager = new ToolManager();
