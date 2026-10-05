import type { ExperienceEvent } from "./contracts";
import type { ImageDocumentState } from "@/lib/studio/image/types";
import type { VideoDocumentState } from "@/lib/studio/video/types";
import type { WebFileItem } from "@/lib/studio/web/types";
import { experienceService } from "./experience-service";

export type StructuredStudioModule = "image" | "video" | "web";
export type StudioStructureMetrics = Partial<Record<"layers" | "scenes" | "tracks" | "clips" | "files" | "characters", number>>;

export function collectImageStructureMetrics(state: ImageDocumentState): StudioStructureMetrics {
  return { layers: state.layers.length };
}

export function collectVideoStructureMetrics(state: VideoDocumentState): StudioStructureMetrics {
  return {
    scenes: state.scenes.length,
    tracks: state.tracks.length,
    clips: state.tracks.reduce((total, track) => total + track.clips.length, 0),
  };
}

export function collectWebStructureMetrics(files: readonly WebFileItem[]): StudioStructureMetrics {
  return {
    files: files.length,
    characters: files.reduce((total, file) => total + file.content.length, 0),
  };
}

const METRIC_KEYS: Record<StructuredStudioModule, readonly (keyof StudioStructureMetrics)[]> = {
  image: ["layers"],
  video: ["scenes", "tracks", "clips"],
  web: ["files", "characters"],
};

function sanitizeMetrics(moduleId: StructuredStudioModule, value: StudioStructureMetrics): StudioStructureMetrics {
  const sanitized: StudioStructureMetrics = {};
  for (const key of METRIC_KEYS[moduleId]) {
    const metric = value[key];
    if (typeof metric === "number" && Number.isInteger(metric) && metric >= 0) sanitized[key] = metric;
  }
  return sanitized;
}

export async function recordStudioStructureEdit(input: {
  moduleId: StructuredStudioModule;
  projectId?: string;
  artifactId: string;
  before: StudioStructureMetrics;
  after: StudioStructureMetrics;
  userInitiated?: boolean;
}): Promise<ExperienceEvent> {
  return experienceService.record({
    actor: input.userInitiated === true ? "USER" : "SYSTEM",
    actionType: "MANUAL_EDIT",
    moduleId: input.moduleId,
    domain: input.moduleId,
    projectId: input.projectId,
    artifactId: input.artifactId,
    targetId: input.artifactId,
    before: sanitizeMetrics(input.moduleId, input.before),
    after: sanitizeMetrics(input.moduleId, input.after),
    metadata: { studioAction: "STRUCTURE_EDITED", generatedAutomatically: input.userInitiated !== true },
    source: `${input.moduleId}-studio-learning-adapter`,
    privacyScope: input.projectId ? "PROJECT_SHARED" : "USER_SHARED",
    learningEligible: input.userInitiated === true,
  });
}
