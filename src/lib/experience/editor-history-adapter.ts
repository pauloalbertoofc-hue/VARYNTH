import type { ExperienceEvent } from "./contracts";
import { experienceService } from "./experience-service";

export type EditorHistoryModule = "audio" | "game" | "image" | "video";

interface EditorHistoryContext {
  moduleId: EditorHistoryModule;
  projectId?: string;
  artifactId: string;
}

const IMMEDIATE_UNDO_WINDOW_MS = 30_000;
const lastSavedEditAt = new Map<string, number>();

function key(context: EditorHistoryContext): string {
  return `${context.moduleId}:${context.artifactId}`;
}

/** Keeps only an in-memory timestamp; document state and edit content are never retained here. */
export function markEditorEditSaved(context: EditorHistoryContext, timestamp = Date.now()): void {
  if (!context.artifactId.trim() || !Number.isFinite(timestamp)) return;
  lastSavedEditAt.set(key(context), timestamp);
}

export async function recordEditorHistoryAction(
  context: EditorHistoryContext,
  action: "UNDO" | "REDO",
  timestamp = Date.now(),
): Promise<ExperienceEvent> {
  const previousEditAt = lastSavedEditAt.get(key(context));
  const elapsedMs = previousEditAt === undefined ? undefined : Math.max(0, timestamp - previousEditAt);
  const immediate = action === "UNDO" && elapsedMs !== undefined && elapsedMs <= IMMEDIATE_UNDO_WINDOW_MS;
  const actionType = action === "REDO" ? "REDO" : immediate ? "IMMEDIATE_UNDO" : "DELAYED_UNDO";
  const event = await experienceService.record({
    actor: "USER",
    actionType,
    moduleId: context.moduleId,
    domain: context.moduleId,
    projectId: context.projectId,
    artifactId: context.artifactId,
    targetId: context.artifactId,
    metadata: {
      historyAction: action,
      ...(elapsedMs === undefined ? {} : { elapsedSinceSavedEditMs: elapsedMs }),
      generatedAutomatically: false,
    },
    source: `${context.moduleId}-editor-history`,
    privacyScope: context.projectId ? "PROJECT_SHARED" : "USER_SHARED",
    learningEligible: true,
  });
  // An explicit history action becomes the new temporal reference. Repeated
  // undo/redo is not repeatedly classified relative to one stale edit.
  lastSavedEditAt.set(key(context), timestamp);
  return event;
}

export function resetEditorHistoryTrackingForTests(): void {
  lastSavedEditAt.clear();
}
