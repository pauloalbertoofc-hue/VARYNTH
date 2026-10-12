import type { ArtifactActor, ArtifactType } from "@/lib/artifacts/types";
import type { ExperienceEvent } from "./contracts";
import { experienceService } from "./experience-service";

/** Record version creation without copying artifact names, contents, or summaries. */
export function recordArtifactVersionCreated(input: {
  artifactId: string;
  artifactType: ArtifactType;
  projectId?: string;
  versionId: string;
  versionNumber: number;
  actor: ArtifactActor;
}): Promise<ExperienceEvent> {
  const actor = input.actor === "USER" ? "USER" : input.actor === "ATHENA" ? "AGENT" : "SYSTEM";
  const learningEligible = actor === "USER";
  const versionNumber = Number.isSafeInteger(input.versionNumber) && input.versionNumber > 0 ? input.versionNumber : 0;
  return experienceService.record({
    id: `experience-artifact-version:${encodeURIComponent(input.artifactId)}:${encodeURIComponent(input.versionId)}`,
    actor,
    actionType: "VERSION_CREATED",
    domain: input.artifactType.toLowerCase(),
    moduleId: "artifacts",
    projectId: input.projectId,
    artifactId: input.artifactId,
    targetType: "ARTIFACT_VERSION",
    targetId: input.versionId,
    correlationId: input.artifactId,
    metadata: { artifactType: input.artifactType, versionNumber, createdBy: input.actor },
    source: "artifact-version-manager",
    privacyScope: input.projectId ? "PROJECT_SHARED" : "USER_SHARED",
    learningEligible,
  });
}
