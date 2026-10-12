import assert from "node:assert/strict";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import type { Artifact } from "@/lib/artifacts/types";
import { versionManager } from "@/lib/artifacts/version-manager";
import { recordArtifactVersionCreated } from "./artifact-learning-adapter";
import { extractSignal } from "./signals";

const artifact = (overrides: Partial<Artifact> = {}): Artifact => ({
  id: "experience-version-artifact", type: "DOCUMENT", name: "Private title must not be recorded", projectId: "experience-version-project", status: "DRAFT",
  createdBy: "USER", createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(), currentVersionNumber: 0, versions: [],
  relationships: [], provenance: { creator: "USER" }, assetFileIds: [], metadata: {}, tags: [], ...overrides,
});

async function run() {
  await experienceEventRepository.clear();
  const result = versionManager.createSnapshot(artifact(), "A potentially sensitive change summary", "USER");
  await new Promise((resolve) => setTimeout(resolve, 0));
  const events = await experienceEventRepository.getAll((event) => event.actionType === "VERSION_CREATED");
  assert.equal(events.length, 1, "the central VersionManager producer reaches Experience");
  const event = events[0];
  assert.equal(event.artifactId, "experience-version-artifact");
  assert.equal(event.projectId, "experience-version-project");
  assert.equal(event.targetId, result.versionId);
  assert.equal(event.metadata.versionNumber, 1);
  assert.equal(extractSignal(event)?.eligible, true);
  assert.equal(JSON.stringify(event).includes("Private title must not be recorded"), false);
  assert.equal(JSON.stringify(event).includes("potentially sensitive change summary"), false);

  const agentEvent = await recordArtifactVersionCreated({ artifactId: "agent-created-artifact", artifactType: "GAME", versionId: "version-agent-1", versionNumber: 1, actor: "ATHENA" });
  assert.equal(agentEvent.actor, "AGENT");
  assert.equal(agentEvent.learningEligible, false);
  assert.equal(extractSignal(agentEvent)?.eligible, false, "agent-generated snapshots must never become primary user evidence");
  console.log("Artifact version Experience integration validates real snapshots, minimal provenance, and agent exclusion.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
