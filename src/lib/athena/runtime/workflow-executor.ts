import { AthenaWorkflow, WorkflowStep } from "../domain/workflow";
import { AthenaTask } from "../domain/task";
import { AthenaContext } from "../domain/context";
import { athenaToolManager } from "../tools/tool-manager";
import { agentRegistry } from "../agents/registry";
import { AgentResult } from "../domain/result";
import { athenaEventBus } from "../events/event-bus";
import { AthenaEngineContext } from "@/lib/athena/engine";
import { athenaCapabilitySelector } from "../kernel/capability-selector";

export interface WorkflowExecutionResult {
  workflowId: string;
  success: boolean;
  stepResults: Record<string, unknown>;
  agentResults: AgentResult[];
  toolOutputs: Record<string, unknown>;
  error?: string;
}

export class WorkflowExecutor {
  async execute(
    workflow: AthenaWorkflow,
    task: AthenaTask,
    context: AthenaContext,
    storeCtx: AthenaEngineContext
  ): Promise<WorkflowExecutionResult> {
    athenaEventBus.emit("WORKFLOW_STARTED", { workflowId: workflow.id }, task.id);

    const stepResults: Record<string, unknown> = {};
    const agentResults: AgentResult[] = [];
    const toolOutputs: Record<string, unknown> = {};

    workflow.status = "RUNNING";

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      step.status = "RUNNING";
      step.startedAt = new Date().toISOString();

      try {
        // 1. Tool execution if defined
        if (step.toolCall) {
          const selection = athenaCapabilitySelector.select({
            kind: "TOOL",
            actionType: step.toolCall.toolName as import("../domain/action").ActionType,
          });
          if (selection.status !== "SELECTED" || !selection.selected) {
            throw new Error(`[CAPABILITY_${selection.status}] ${selection.reason}`);
          }
          const res = await athenaToolManager.executeTool(
            step.toolCall.toolName as any,
            step.toolCall.params,
            storeCtx,
            task.id
          );
          toolOutputs[step.id] = res;
          step.result = res;
        }

        // 2. Agent execution if assigned
        if (step.assignedAgentId) {
          const selection = athenaCapabilitySelector.select({
            kind: "AGENT",
            task,
            context,
            preferredCapabilityId: step.assignedAgentId,
          });
          if (selection.status !== "SELECTED" || !selection.selected) {
            throw new Error(`[CAPABILITY_${selection.status}] ${selection.reason}`);
          }
          const agent = agentRegistry.getAgent(selection.selected.id);
          if (agent) {
            const agentRes = await agent.execute(task, context);
            agentResults.push(agentRes);
            step.result = agentRes;
            athenaEventBus.emit("AGENT_CONTRIBUTION", { agentId: agent.manifest.id, result: agentRes }, task.id);
          }
        }

        step.status = "COMPLETED";
        step.completedAt = new Date().toISOString();
        stepResults[step.id] = step.result;
        athenaEventBus.emit("STEP_EXECUTED", { stepId: step.id, status: "COMPLETED" }, task.id);
      } catch (err: any) {
        step.status = "FAILED";
        step.error = err?.message || String(err);
        workflow.status = "FAILED";
        athenaEventBus.emit("ERROR_OCCURRED", { stepId: step.id, error: step.error }, task.id);

        return {
          workflowId: workflow.id,
          success: false,
          stepResults,
          agentResults,
          toolOutputs,
          error: step.error,
        };
      }
    }

    workflow.status = "COMPLETED";
    workflow.completedAt = new Date().toISOString();

    return {
      workflowId: workflow.id,
      success: true,
      stepResults,
      agentResults,
      toolOutputs,
    };
  }
}

export const athenaWorkflowExecutor = new WorkflowExecutor();
