import { experienceEventRepository, experienceRepository } from "@/lib/persistence/repositories";
import { buildProjectRetrospective } from "./retrospective-service";

async function run() {
  await Promise.all([experienceEventRepository.clear(), experienceRepository.clear()]);
  await experienceEventRepository.save({ id: "created", timestamp: new Date().toISOString(), actor: "USER", actionType: "PROJECT_CREATED", projectId: "p1", metadata: { approach: "prototype" }, source: "test", privacyScope: "PROJECT_SHARED", learningEligible: true, schemaVersion: 1 });
  await experienceEventRepository.save({ id: "accepted", timestamp: new Date().toISOString(), actor: "USER", actionType: "PROPOSAL_ACCEPTED", projectId: "p1", metadata: {}, source: "test", privacyScope: "PROJECT_SHARED", learningEligible: true, schemaVersion: 1 });
  const result = await buildProjectRetrospective("p1");
  if (result.initialApproach[0] !== "prototype" || result.importantDecisions[0] !== "accepted" || result.evidence.length !== 2) throw new Error("retrospective assembly failed");
  console.log("Project retrospective validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
