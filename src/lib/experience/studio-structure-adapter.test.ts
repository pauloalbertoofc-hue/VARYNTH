import assert from "node:assert/strict";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import { extractSignal } from "./signals";
import { recordStudioStructureEdit, collectVideoStructureMetrics, collectWebStructureMetrics } from "./studio-structure-adapter";

async function main() {
  await experienceEventRepository.clear();
  const image = await recordStudioStructureEdit({
    moduleId: "image", projectId: "visual-project", artifactId: "image-a", userInitiated: true,
    before: { layers: 2, characters: 700, secret: 1 } as never,
    after: { layers: 3, text: "must not persist" } as never,
  });
  assert.equal(image.actor, "USER");
  assert.equal(image.learningEligible, true);
  assert.deepEqual(image.before, { layers: 2 });
  assert.deepEqual(image.after, { layers: 3 });
  assert.equal(extractSignal(image)?.kind, "DIRECT_EDIT");
  assert.equal(image.metadata.preferenceSignal, undefined, "a single edit is not a preference claim");

  const video = await recordStudioStructureEdit({
    moduleId: "video", artifactId: "video-a", userInitiated: true,
    before: { scenes: 1, tracks: 2, clips: 4, files: 99 },
    after: { scenes: 1, tracks: 3, clips: 5, code: "secret" } as never,
  });
  assert.deepEqual(video.after, { scenes: 1, tracks: 3, clips: 5 });
  const web = await recordStudioStructureEdit({
    moduleId: "web", artifactId: "site-a", userInitiated: true,
    before: { files: 2, characters: 100, layers: 50 },
    after: { files: 3, characters: 140, source: "private code" } as never,
  });
  assert.deepEqual(web.before, { files: 2, characters: 100 });
  assert.deepEqual(web.after, { files: 3, characters: 140 });

  const unattributed = await recordStudioStructureEdit({
    moduleId: "web", artifactId: "site-b", before: { files: 0 }, after: { files: 1 },
  });
  assert.equal(unattributed.actor, "SYSTEM");
  assert.equal(unattributed.learningEligible, false);
  assert.equal((await experienceEventRepository.getAll()).length, 4);

  assert.deepEqual(collectVideoStructureMetrics({ scenes: [{}], tracks: [{ clips: [{}, {}] }, { clips: [{}] }] } as never), { scenes: 1, tracks: 2, clips: 3 });
  assert.deepEqual(collectWebStructureMetrics([{ content: "abcd" }, { content: "ef" }] as never), { files: 2, characters: 6 });
  console.log("Image/Video/Web structure Experience adapter tests passed: attributed saves and strict content allowlists.");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
