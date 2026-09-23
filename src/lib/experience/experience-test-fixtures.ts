import { experienceEventRepository } from "@/lib/persistence/repositories";
import type { ExperienceEvent } from "./contracts";

export async function seedExperienceEvidence(ids: string[], ownerId = "local-owner"): Promise<void> {
  const timestamp = new Date().toISOString();
  for (const id of ids) {
    const event: ExperienceEvent = {
      id, ownerId, timestamp, actor: "USER", actionType: "USER_ACTION", metadata: {}, source: "experience-test",
      privacyScope: "USER_SHARED", learningEligible: true, schemaVersion: 1,
    };
    await experienceEventRepository.save(event);
  }
}
