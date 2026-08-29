import { ActionType, ActionResult } from "../domain/action";
import { registeredTools, ToolDefinition } from "./registry";
import { AthenaEngineContext } from "@/lib/athena/engine";
import { athenaEventBus } from "../events/event-bus";

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

  async executeTool(
    name: ActionType,
    params: Record<string, unknown>,
    ctx: AthenaEngineContext,
    taskId?: string
  ): Promise<ActionResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        actionType: name,
        error: `Ferramenta "${name}" não encontrada no ToolManager da Athena.`,
      };
    }

    athenaEventBus.emit("ACTION_INVOKED", { toolName: name, params }, taskId);

    try {
      const result = await tool.execute(params, ctx);
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

