import assert from "node:assert/strict";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import { extractSignal } from "./signals";
import { markEditorEditSaved, recordEditorHistoryAction, resetEditorHistoryTrackingForTests } from "./editor-history-adapter";

async function main() {
  await experienceEventRepository.clear();
  resetEditorHistoryTrackingForTests();
  const context = { moduleId: "image" as const, projectId: "project-a", artifactId: "artifact-a" };
  const delayed = await recordEditorHistoryAction(context, "UNDO", 100_000);
  assert.equal(delayed.actionType, "DELAYED_UNDO", "an undo with no observed recent saved edit is delayed/unknown, never immediate");
  assert.equal(extractSignal(delayed)?.kind, "DELAYED_UNDO");
  assert.equal(extractSignal(delayed)?.strength, "LOW");
  assert.equal(delayed.actor, "USER");
  assert.equal(delayed.learningEligible, true);
  assert.equal(delayed.before, undefined);
  assert.equal(delayed.after, undefined);
  assert.equal(delayed.metadata.preferenceSignal, undefined, "history behavior is not directly converted into a preference");

  markEditorEditSaved(context, 200_000);
  const immediate = await recordEditorHistoryAction(context, "UNDO", 215_000);
  assert.equal(immediate.actionType, "IMMEDIATE_UNDO");
  assert.equal(extractSignal(immediate)?.strength, "HIGH");
  assert.equal(immediate.metadata.elapsedSinceSavedEditMs, 15_000);

  const repeatedUndo = await recordEditorHistoryAction(context, "UNDO", 220_000);
  assert.equal(repeatedUndo.actionType, "IMMEDIATE_UNDO", "consecutive undo actions remain temporally explicit");
  assert.equal(repeatedUndo.metadata.elapsedSinceSavedEditMs, 5_000);

  markEditorEditSaved(context, 300_000);
  const lateUndo = await recordEditorHistoryAction(context, "UNDO", 340_001);
  assert.equal(lateUndo.actionType, "DELAYED_UNDO");
  assert.equal(lateUndo.metadata.elapsedSinceSavedEditMs, 40_001);

  const redo = await recordEditorHistoryAction(context, "REDO", 345_000);
  assert.equal(redo.actionType, "REDO");
  assert.equal(extractSignal(redo)?.kind, "REDO");
  assert.equal(redo.projectId, "project-a");
  assert.equal(redo.artifactId, "artifact-a");
  assert.equal((await experienceEventRepository.getAll()).length, 5);
  console.log("Editor history Experience tests passed: attributed undo/redo, timing, scopes and minimal payload.");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
