import { AthenaTask } from "../domain/task";
import { AthenaContext } from "../domain/context";
import { AgentResult, DeliberationResult, DeliberationContribution } from "../domain/result";
import { critiasAgent } from "../agents/council/critias";
import { athenaEventBus } from "../events/event-bus";

export class DeliberationEngine {
  async deliberate(
    task: AthenaTask,
    context: AthenaContext,
    agentResults: AgentResult[]
  ): Promise<DeliberationResult> {
    const participatingAgents = agentResults.map((r) => r.agentId);

    const contributions: DeliberationContribution[] = agentResults.map((r) => ({
      agentId: r.agentId,
      specialty: r.role,
      analysis: r.content,
      pointsOfAgreement: r.recommendations,
      pointsOfDissent: r.criticism,
    }));

    // 1. Submit results to Critias for review
    let identifiedFlaws: string[] = [];
    let counterArguments: string[] = [];

    for (const result of agentResults) {
      if (critiasAgent.review) {
        const reviewed = await critiasAgent.review(result, context);
        if (reviewed.criticism) {
          identifiedFlaws.push(...reviewed.criticism);
        }
      }
    }

    // 2. Synthesize consensus
    let consensusSummary = agentResults.map((r) => r.content).join("\n\n---\n\n");

    const deliberationResult: DeliberationResult = {
      topic: task.title,
      participatingAgents,
      contributions,
      critique: {
        reviewerAgentId: critiasAgent.manifest.id,
        identifiedFlaws: Array.from(new Set(identifiedFlaws)),
        counterArguments,
      },
      consensusSummary,
      recommendedAction: agentResults[0]?.recommendations?.[0],
    };

    athenaEventBus.emit("DELIBERATION_COMPLETED", deliberationResult, task.id);
    return deliberationResult;
  }
}

export const athenaDeliberationEngine = new DeliberationEngine();

