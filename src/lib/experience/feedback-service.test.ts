import { experienceEventRepository } from "@/lib/persistence/repositories";
import { submitFeedback } from "./feedback-service";

async function run() {
  await experienceEventRepository.clear();
  const event = await submitFeedback({ type: "ACCEPT", targetType: "proposal", targetId: "proposal-1", moduleId: "audio", strength: "HIGH" });
  if (event.actionType !== "PROPOSAL_ACCEPTED" || event.metadata.feedbackType !== "ACCEPT") throw new Error("feedback mapping failed");
  let failed = false;
  try { await submitFeedback({ type: "LIKE", targetType: "", targetId: "x" }); } catch { failed = true; }
  if (!failed) throw new Error("invalid feedback accepted");
  console.log("Experience feedback validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
