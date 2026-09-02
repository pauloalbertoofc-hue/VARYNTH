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
import { athenaConversationManager } from "../conversation/conversation-manager";
import { athenaPersonaEngine } from "../persona/persona-engine";
import { athenaInteractionContractRouter } from "./interaction-contract-router";
import { athenaInteractionContractGateway } from "../runtime/interaction-contract-gateway";

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

    // 1. Conversation Manager: evaluate intent & resolve anaphora references
    const convContext = athenaConversationManager.processMessage(
      sessionId,
      rawPrompt,
      storeCtx.projects,
      targetProjectId
    );
    const contractDecision = athenaInteractionContractRouter.route(convContext);

    const resolvedProjectId = convContext.resolvedEntities.targetProjectId || targetProjectId;

    // 2. Handle Ambiguous Reference if detected (Never guess silently)
    if (convContext.isAmbiguous && convContext.clarificationPrompt) {
      const response: AthenaResponse = {
        id: "ath-" + Date.now(),
        sender: "athena",
        text: convContext.clarificationPrompt,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scope,
        metadata: {
          intents: convContext.intents,
        },
      };

      athenaMemoryManager.appendMessage(sessionId, response);
      return response;
    }

    // 3. Handle Conversational, Cognitive & Brainstorm Messages (Non-Mutations)
    if (contractDecision.contract !== "USE_TOOL") {
      const activeProj = resolvedProjectId
        ? storeCtx.projects.find((p) => p.id === resolvedProjectId)
        : undefined;

      const result = athenaInteractionContractGateway.execute(
        contractDecision,
        () => athenaPersonaEngine.generateDialogueResponse(
          rawPrompt, convContext, activeProj?.title, storeCtx as any
        )
      );

      const response: AthenaResponse = {
        id: "ath-" + Date.now(),
        sender: "athena",
        text: result.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scope,
        metadata: {
          interactionType: convContext.interactionType,
          intents: convContext.intents,
          resolvedProjectId,
          interactionContract: contractDecision.contract,
        },
      };

      athenaMemoryManager.appendMessage(sessionId, response);
      athenaMemoryManager.recordEpisode(rawPrompt.slice(0, 60), scope);
      athenaEventBus.emit("RESPONSE_READY", response);
      return response;
    }

    athenaInteractionContractRouter.require(contractDecision, "USE_TOOL");

    // 4. Execution & Analysis Path: normalize prompt into a Task
    let task = athenaPerceptionEngine.perceive(rawPrompt, scope, resolvedProjectId);
    provenanceTracker.record("USER", task.title, task.id);

    // 5. Memory & Context: build surgical workspace context
    const context = athenaContextBuilder.buildContext(task, scope, storeCtx, resolvedProjectId);
    if (context.activeProject) {
      provenanceTracker.record("VAULT", `Projeto: ${context.activeProject.title}`, context.activeProject.id);
    }

    // 6. State Transition: PLANNED
    task = taskStateMachine.transition(task, "PLANNED");

    // 7. Build Workflow
    const workflow = athenaWorkflowBuilder.build(task);

    // 8. State Transition: RUNNING
    task = taskStateMachine.transition(task, "RUNNING");

    // 9. Execute Workflow with Checkpoints
    const workflowResult = await athenaInteractionContractGateway.executeAsync(
      contractDecision,
      () => athenaWorkflowExecutor.execute(workflow, task, context, storeCtx)
    );
    cognitiveCheckpointManager.saveCheckpoint(workflow, workflow.steps.length - 1, workflowResult.stepResults);

    // 10. Deliberation & Reflection (governed by Budget)
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

    // 11. Confidence Assessment
    const confidence = athenaConfidenceEngine.assess(
      task,
      context,
      workflowResult.agentResults,
      workflowResult.success
    );

    // 12. Build Response
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
      intents: convContext.intents,
      mode: convContext.mode,
      interactionContract: contractDecision.contract,
    };

    // 13. Memory Gate Evaluation before permanent storage
    const memoryCandidate = {
      title: task.title,
      content: response.text,
      scope,
      projectId: resolvedProjectId,
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
