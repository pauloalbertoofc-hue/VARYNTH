import type {
  CapabilityCandidateDiagnostic,
  CapabilitySelectionRequest,
  CapabilitySelectionResult,
} from "../domain/capability-selection";
import { agentRegistry } from "../agents/registry";
import { executableCapabilityRegistry } from "./executable-capability-registry";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export class CapabilitySelector {
  select(request: CapabilitySelectionRequest): CapabilitySelectionResult {
    return request.kind === "TOOL" ? this.selectTool(request.actionType) : this.selectAgent(request);
  }

  private selectTool(actionType: import("../domain/action").ActionType): CapabilitySelectionResult {
    const tools = executableCapabilityRegistry.listTools();
    const candidates: CapabilityCandidateDiagnostic[] = tools.map((tool) => ({
      capabilityId: tool.id,
      kind: "TOOL",
      score: tool.actionType === actionType ? 100 : 0,
      eligible: tool.actionType === actionType,
      reasons: tool.actionType === actionType ? ["Exact ActionType match"] : [],
      rejectionReason: tool.actionType === actionType ? undefined : "Different ActionType",
    }));
    const selected = tools.find((tool) => tool.actionType === actionType);
    return selected
      ? { status: "SELECTED", selected, candidates, reason: `Exact tool capability selected for ${actionType}.` }
      : { status: "NO_MATCH", candidates, reason: `No registered tool supports ${actionType}.` };
  }

  private selectAgent(request: Extract<CapabilitySelectionRequest, { kind: "AGENT" }>): CapabilitySelectionResult {
    const prompt = normalize(request.task.rawPrompt);
    const candidates = executableCapabilityRegistry.listAgents().map<CapabilityCandidateDiagnostic>((manifest) => {
      const agent = agentRegistry.getAgent(manifest.id);
      const eligible = Boolean(agent?.canHandle(request.task, request.context));
      const skillHits = manifest.skills.filter((skill) => prompt.includes(normalize(skill))).length;
      const score = eligible ? manifest.priority + skillHits * 10 : 0;
      return {
        capabilityId: manifest.id,
        kind: "AGENT",
        score,
        eligible,
        reasons: eligible ? [`canHandle=true`, `priority=${manifest.priority}`, `skillHits=${skillHits}`] : [],
        rejectionReason: eligible ? undefined : "Agent declared canHandle=false",
      };
    }).sort((a, b) => b.score - a.score || a.capabilityId.localeCompare(b.capabilityId));

    const eligible = candidates.filter((candidate) => candidate.eligible);
    if (request.preferredCapabilityId) {
      const preferred = candidates.find((candidate) => candidate.capabilityId === request.preferredCapabilityId);
      if (!preferred?.eligible) {
        return {
          status: "NO_MATCH",
          candidates,
          reason: `Assigned agent ${request.preferredCapabilityId} is unavailable or declared canHandle=false.`,
        };
      }
      return {
        status: "SELECTED",
        selected: executableCapabilityRegistry.get(preferred.capabilityId),
        candidates,
        reason: `${preferred.capabilityId} satisfied the explicit workflow assignment and competence check.`,
      };
    }

    if (eligible.length === 0) {
      return {
        status: "NO_MATCH",
        candidates,
        reason: "No enabled agent declared competence for this task.",
        clarificationPrompt: "Não encontrei um agente com competência declarada para este pedido. Você pode especificar o domínio ou o resultado esperado?",
      };
    }

    const top = eligible.filter((candidate) => candidate.score === eligible[0].score);
    if (top.length > 1) {
      return {
        status: "AMBIGUOUS",
        candidates,
        reason: `Tie between ${top.map((candidate) => candidate.capabilityId).join(", ")}.`,
        clarificationPrompt: `Há mais de um agente igualmente adequado (${top.map((candidate) => candidate.capabilityId).join(", ")}). Qual especialidade deve prevalecer?`,
      };
    }

    return {
      status: "SELECTED",
      selected: executableCapabilityRegistry.get(eligible[0].capabilityId),
      candidates,
      reason: `${eligible[0].capabilityId} has the highest deterministic competence score (${eligible[0].score}).`,
    };
  }
}

export const athenaCapabilitySelector = new CapabilitySelector();
