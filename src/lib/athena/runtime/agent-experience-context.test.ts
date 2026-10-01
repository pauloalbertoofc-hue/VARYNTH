import assert from "node:assert/strict";
import { experiencePreferenceRepository, experienceRepository } from "@/lib/persistence/repositories";
import { preferenceService } from "@/lib/experience/preference-service";
import { prepareAgentExperienceContext } from "./agent-experience-context";

async function main() {
  await Promise.all([experiencePreferenceRepository.clear(), experienceRepository.clear()]);
  await preferenceService.declare({ domain: "communication", key: "verbosity", value: "concise", scope: "GLOBAL" }, "agent-context-owner");
  const task = { id: "task", title: "song", rawPrompt: "Explain this track", type: "GENERAL_DELIBERATION" as const, priority: "media" as const, status: "CREATED" as const, scope: "geral", metadata: { sessionId: "session-1" }, entities: {}, createdAt: "now", updatedAt: "now" };
  const context = { scope: "geral" as const, relevantProjects: [], relevantTasks: [], relevantVaultItems: [], relevantChronosEvents: [], relevantTheses: [], relevantEvidences: [], relevantOpportunities: [], systemTime: "now" };
  const euterpe = await prepareAgentExperienceContext("euterpe", task, context, "agent-context-owner");
  assert.equal(euterpe?.preferences[0]?.value, "concise");
  const justitia = await prepareAgentExperienceContext("justitia", task, context, "agent-context-owner");
  assert.equal(justitia?.preferences[0]?.value, "concise", "confirmed global communication preferences may cross specialist domains");
  const unscoped = await prepareAgentExperienceContext("euterpe", task, context, "another-account");
  assert.equal(unscoped?.preferences.length, 0, "another account has no access to this owner's experience");
  console.log("Athena per-agent Experience context tests passed");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
