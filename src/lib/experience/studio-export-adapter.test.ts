import assert from "node:assert/strict";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import { recordStudioExport } from "./studio-export-adapter";
import { extractSignal } from "./signals";

async function run() {
  await experienceEventRepository.clear();
  const event = await recordStudioExport({ moduleId: "audio", artifactId: "audio-export-1", projectId: "project-1", format: "wav", sizeBytes: 4096, durationMs: 1200 });
  assert.equal(event.actionType, "EXPORT_CREATED");
  assert.equal(event.metadata.format, "WAV");
  assert.equal(event.metadata.sizeBytes, 4096);
  assert.equal(extractSignal(event)?.eligible, true);
  assert.equal(extractSignal(event)?.strength, "LOW", "an export is weak evidence, not a preference or quality verdict");
  assert.equal(JSON.stringify(event).includes("private title"), false);
  const agent = await recordStudioExport({ moduleId: "document", artifactId: "agent-export", format: "pdf", actor: "ATHENA" });
  assert.equal(agent.actor, "AGENT");
  assert.equal(agent.learningEligible, false);
  assert.equal(extractSignal(agent)?.eligible, false);
  console.log("Studio export Experience signal preserves minimal provenance and low evidence strength.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
