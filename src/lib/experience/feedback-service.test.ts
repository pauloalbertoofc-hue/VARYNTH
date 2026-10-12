import { experienceEventRepository } from "@/lib/persistence/repositories";
import { submitFeedback } from "./feedback-service";
import { extractSignal } from "./signals";

async function run() {
  await experienceEventRepository.clear();
  const event = await submitFeedback({ type: "ACCEPT", targetType: "proposal", targetId: "proposal-1", moduleId: "audio", strength: "HIGH" });
  if (event.actionType !== "PROPOSAL_ACCEPTED" || event.metadata.feedbackType !== "ACCEPT") throw new Error("feedback mapping failed");
  if (!event.ownerId || !extractSignal(event)?.eligible) throw new Error("authenticated explicit feedback must be owned and learning-eligible");
  const scoped = await submitFeedback({ ownerId: "feedback-owner", type: "LIKE", targetType: "response", targetId: "response-1", agentId: "euterpe", moduleId: "music" });
  if (scoped.ownerId !== "feedback-owner" || scoped.agentId !== "euterpe" || !extractSignal(scoped)?.eligible) throw new Error("explicit owner and specialist attribution must survive feedback recording");
  let failed = false;
  try { await submitFeedback({ type: "LIKE", targetType: "", targetId: "x" }); } catch { failed = true; }
  if (!failed) throw new Error("invalid feedback accepted");
  console.log("Experience feedback validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
