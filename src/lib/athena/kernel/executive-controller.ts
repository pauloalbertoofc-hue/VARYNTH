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
import { ExecutionBudgetTier, BUDGET_CONFIGS } from "../domain/budget";
import { athenaConfidenceEngine } from "./confidence-engine";
import { provenanceTracker } from "./provenance";
import { memoryGate } from "../memory/memory-gate";
import { cognitiveCheckpointManager } from "../runtime/checkpoint";

export class ExecutiveController {
  async process(
    rawPrompt: string,
    scope: AthenaScope,
    storeCtx: AthenaEngineContext,
    targetProjectId?: string,
    sessionId = "default-session",
    budgetTier: ExecutionBudgetTier = "STANDARD"
  ): Promise<AthenaResponse> {
    const startTime = Date.now();
    const budget = BUDGET_CONFIGS[budgetTier] || BUDGET_CONFIGS.STANDARD;

    // 1. Perception: normalize prompt into a Task
    let task = athenaPerceptionEngine.perceive(rawPrompt, scope, targetProjectId);
    provenanceTracker.record("USER", task.title, task.id);

    // 2. Memory & Context: build surgical workspace context
    const context = athenaContextBuilder.buildContext(task, scope, storeCtx, targetProjectId);
    if (context.activeProject) {
      provenanceTracker.record("VAULT", `Projeto: ${context.activeProject.title}`, context.activeProject.id);
    }

    // 3. State Transition: PLANNED
    task = taskStateMachine.transition(task, "PLANNED");

    // 4. Build Workflow
    const workflow = athenaWorkflowBuilder.build(task);

    // 5. State Transition: RUNNING
    task = taskStateMachine.transition(task, "RUNNING");

    // 6. Execute Workflow with Checkpoints
    const workflowResult = await athenaWorkflowExecutor.execute(workflow, task, context, storeCtx);
    cognitiveCheckpointManager.saveCheckpoint(workflow, workflow.steps.length - 1, workflowResult.stepResults);

    // 7. Deliberation & Reflection (governed by Budget)
    let deliberationResult = undefined;
    if (budget.allowCouncilDeliberation && workflowResult.agentResults && workflowResult.agentResults.length > 0) {
      task = taskStateMachine.transition(task, "REVIEWING");
      deliberationResult = await athenaDeliberationEngine.deliberate(
        task,
        context,
        workflowResult.agentResults
      );
      if (budget.maxReflectionRounds > 0) {
        athenaReflectionEngine.reflect(task, context, deliberationResult.consensusSummary, "STANDARD");
      }
    }

    // 8. Confidence Assessment
    const confidence = athenaConfidenceEngine.assess(
      task,
      context,
      workflowResult.agentResults,
      workflowResult.success
    );

    // 9. Build Response
    task = taskStateMachine.transition(task, "FINISHED");
    const response = athenaResponseBuilder.buildResponse(
      task,
      context,
      workflowResult,
      deliberationResult
    );
    response.executionTimeMs = Date.now() - startTime;
    response.metadata = {
      confidenceLevel: confidence.level,
      confidenceScore: confidence.score,
      budgetTier: budget.tier,
      provenanceCount: provenanceTracker.getRecentProvenance().length,
    };

    // 10. Memory Gate Evaluation before permanent storage
    const memoryCandidate = {
      title: task.title,
      content: response.text,
      scope,
      projectId: targetProjectId,
      confidence: confidence.level,
      sourceType: "MODEL_INFERENCE",
    };

    const gateDecision = memoryGate.evaluate(memoryCandidate);
    if (gateDecision.accepted) {
      athenaMemoryManager.appendMessage(sessionId, response);
      athenaMemoryManager.recordEpisode(task.title, scope);
    }

    athenaEventBus.emit("RESPONSE_READY", response, task.id);
    return response;
  }
}

export const athenaExecutiveController = new ExecutiveController();
export const athenaKernel = athenaExecutiveController;
