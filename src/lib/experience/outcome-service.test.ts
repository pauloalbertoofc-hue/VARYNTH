import { experienceRepository } from "@/lib/persistence/repositories";
import { retrieveExperiences, retainExperience } from "./outcome-service";

async function run() {
  await experienceRepository.clear();
  const saved = await retainExperience({ domain: "music", context: { style: "cinematic" }, situation: "dialogue-heavy scene", action: "reduce piano reverb", outcome: "kept in exported version", usefulness: 0.9, evidence: [{ eventId: "export-1", weight: "HIGH", reason: "resultado final" }], scope: "PROJECT", scopeId: "project-1" });
  if (saved.confidence !== 0.5 || (await retrieveExperiences("music", "project-1")).length !== 1) throw new Error("experience retention failed");
  let failed = false;
  try { await retainExperience({ domain: "music", context: {}, situation: "", action: "x", outcome: "y", evidence: [] }); } catch { failed = true; }
  if (!failed) throw new Error("invalid experience accepted");

  await experienceRepository.clear();
  const evidence = [{ eventId: "scope-event", weight: "HIGH" as const, reason: "scope test" }];
  const fixtures = [
    ["global", "GLOBAL", undefined], ["domain", "DOMAIN", "music"], ["project-a", "PROJECT", "project-a"],
    ["agent-a", "AGENT", "agent-a"], ["agent-b", "AGENT", "agent-b"], ["module-a", "MODULE", "module-a"],
    ["artifact-a", "ARTIFACT", "artifact-a"], ["session-a", "SESSION", "session-a"],
  ] as const;
  for (const [id, scope, scopeId] of fixtures) await retainExperience({ domain: "music", context: {}, situation: id, action: "a", outcome: "o", evidence, scope, scopeId });
  const scoped = await retrieveExperiences("music", "project-a", 50, { agentId: "agent-a", moduleId: "module-a", artifactId: "artifact-a", sessionId: "session-a" });
  const visible = new Set(scoped.map((record) => record.situation));
  if (["global", "domain", "project-a", "agent-a", "module-a", "artifact-a", "session-a"].some((id) => !visible.has(id))) throw new Error("matching scoped experience was hidden");
  if (["agent-b", "project-b", "module-b", "artifact-b", "session-b"].some((id) => visible.has(id))) throw new Error("experience crossed an agent or context scope");
  console.log("Experience outcome validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
