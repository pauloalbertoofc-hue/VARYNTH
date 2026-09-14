import assert from "node:assert/strict";
import { createMusicAudioAdapters, resolveMusicAudio } from "./audio-source-resolver";
import { UnconfiguredMusicHubProvider, isEligibleForPublicHub } from "./music-hub";
import type { MusicTrack } from "./types";

const track = (storageMode: "device" | "account"): MusicTrack => ({ id: "a", name: "A", artist: "B", durationMs: 1, mimeType: "audio/wav", sizeBytes: 1, addedAt: "", storageMode });
void (async () => {
  const local = new Blob(["local"]); const account = new Blob(["account"]);
  const adapters = createMusicAudioAdapters(async () => local, async () => account);
  assert.equal(await resolveMusicAudio(track("device"), adapters), local);
  assert.equal(await resolveMusicAudio(track("account"), adapters), account);
  await assert.rejects(() => resolveMusicAudio(track("device"), createMusicAudioAdapters(async () => undefined, async () => account)), /indisponível/);
  const hub = new UnconfiguredMusicHubProvider();
  assert.equal(await hub.availability(), "unconfigured"); assert.deepEqual(await hub.search("jazz"), []);
  assert.equal(isEligibleForPublicHub({ id: "x", title: "X", artist: "Y", source: { kind: "account", id: "x", available: true }, attribution: "", license: "", regions: [] }), false);
  console.log("Music source resolution and unconfigured public hub isolation passed.");
})();
