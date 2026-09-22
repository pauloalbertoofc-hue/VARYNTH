import { experienceService } from "./experience-service";
import { experienceEventRepository } from "@/lib/persistence/repositories";

async function run() {
await experienceEventRepository.clear();
const first = await experienceService.record({
  actor: "USER", actionType: "MANUAL_EDIT", metadata: { field: "bpm" }, source: "audio-studio",
  privacyScope: "PROJECT_SHARED", learningEligible: true, projectId: "project-1",
});
const duplicate = await experienceService.record({
  id: first.id, actor: "USER", actionType: "MANUAL_EDIT", metadata: { field: "bpm" }, source: "audio-studio",
  privacyScope: "PROJECT_SHARED", learningEligible: true, projectId: "project-1",
});
if (duplicate.id !== first.id || (await experienceService.list()).length !== 1) throw new Error("event deduplication failed");
let failed = false;
try {
  await experienceService.record({ actor: "SYSTEM", actionType: "NOT_REAL" as never, metadata: {}, source: "test", privacyScope: "PROJECT_SHARED", learningEligible: true });
} catch { failed = true; }
if (!failed) throw new Error("invalid schema accepted");
if (!(await experienceService.forget(first.id)) || (await experienceService.list()).length !== 0) throw new Error("forget failed");
console.log("Experience service persistence validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
