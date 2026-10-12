import type { ExperienceEvent } from "./contracts";
import type { ArtifactActor } from "@/lib/artifacts/types";
import { experienceService } from "./experience-service";

export type ExportableStudio = "audio" | "document" | "image" | "video" | "web";

/** A completed export is weak behavioral evidence, never a quality judgment. */
export function recordStudioExport(input: {
  moduleId: ExportableStudio;
  artifactId: string;
  projectId?: string;
  format: string;
  actor?: ArtifactActor;
  sizeBytes?: number;
  durationMs?: number;
}): Promise<ExperienceEvent> {
  const actor = input.actor === "ATHENA" ? "AGENT" : input.actor && input.actor !== "USER" ? "SYSTEM" : "USER";
  const format = /^[a-z0-9_-]{1,24}$/i.test(input.format) ? input.format.toUpperCase() : "UNKNOWN";
  const sizeBytes = Number.isSafeInteger(input.sizeBytes) && (input.sizeBytes ?? -1) >= 0 ? input.sizeBytes : undefined;
  const durationMs = Number.isSafeInteger(input.durationMs) && (input.durationMs ?? -1) >= 0 ? input.durationMs : undefined;
  return experienceService.record({
    actor,
    actionType: "EXPORT_CREATED",
    domain: input.moduleId,
    moduleId: input.moduleId,
    projectId: input.projectId,
    artifactId: input.artifactId,
    targetType: "STUDIO_EXPORT",
    targetId: input.artifactId,
    correlationId: input.artifactId,
    metadata: { format, ...(sizeBytes !== undefined ? { sizeBytes } : {}), ...(durationMs !== undefined ? { durationMs } : {}) },
    source: `${input.moduleId}-studio-export`,
    privacyScope: input.projectId ? "PROJECT_SHARED" : "USER_SHARED",
    learningEligible: actor === "USER",
  });
}
