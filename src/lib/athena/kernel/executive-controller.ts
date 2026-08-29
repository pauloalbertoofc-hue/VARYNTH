import { athenaPerceptionEngine } from "./perception";
import { athenaContextBuilder } from "../memory/context-builder";
import { athenaMemoryManager } from "../memory/memory-manager";
import { taskStateMachine } from "../runtime/state-machine";
import { athenaWorkflowBuilder } from "../runtime/workflow-builder";
import { athenaWorkflowExecutor } from "../runtime/workflow-executor";
import { athenaDeliberationEngine } from "../deliberation/deliberation-engine";
import { athenaReflectionEngine } from "./reflection";
import { athenaResponseBuilder } from "./response-builder";
import { AthenaScope } from "../domain/context";
import { AthenaResponse } from "../domain/response";
import { AthenaEngineContext } from "@/lib/athena/engine";
import { athenaEventBus } from "../events/event-bus";

export class ExecutiveController {
  async process(
    rawPrompt: string,
    scope: AthenaScope,
    storeCtx: AthenaEngineContext,
    targetProjectId?: string,
    sessionId = "default-session"
  ): Promise<AthenaResponse> {
    const startTime = Date.now();

    // 1. Perception: normalize prompt into a Task
    let task = athenaPerceptionEngine.perceive(rawPrompt, scope, targetProjectId);

    // 2. Memory & Context: build surgical workspace context
    const context = athenaContextBuilder.buildContext(task, scope, storeCtx, targetProjectId);

    // 3. State Transition: PLANNED
    task = taskStateMachine.transition(task, "PLANNED");

    // 4. Build Workflow
    const workflow = athenaWorkflowBuilder.build(task);

    // 5. State Transition: RUNNING
    task = taskStateMachine.transition(task, "RUNNING");

    // 6. Execute Workflow
    const workflowResult = await athenaWorkflowExecutor.execute(workflow, task, context, storeCtx);

    // 7. Deliberation & Reflection (if cognitive path with agents)
    let deliberationResult = undefined;
    if (workflowResult.agentResults && workflowResult.agentResults.length > 0) {
      task = taskStateMachine.transition(task, "REVIEWING");
      deliberationResult = await athenaDeliberationEngine.deliberate(
        task,
        context,
        workflowResult.agentResults
      );
      athenaReflectionEngine.reflect(task, context, deliberationResult.consensusSummary, "STANDARD");
    }

    // 8. Build Response
    task = taskStateMachine.transition(task, "FINISHED");
    const response = athenaResponseBuilder.buildResponse(
      task,
      context,
      workflowResult,
      deliberationResult
    );
    response.executionTimeMs = Date.now() - startTime;

    // 9. Memory Storage
    athenaMemoryManager.appendMessage(sessionId, response);
    athenaMemoryManager.recordEpisode(task.title, scope);

    athenaEventBus.emit("RESPONSE_READY", response, task.id);
    return response;
  }
}

export const athenaExecutiveController = new ExecutiveController();
export const athenaKernel = athenaExecutiveController;

