import assert from "node:assert/strict";
import { analyzeSections, LocalVisualGenerationProvider, makeMusicDNA, migrateMusicDNA, MUSIC_ANALYSIS_LIMITS, musicSpecialist, spectralFeatures } from "./music-studio";

const silence = spectralFeatures(new Uint8Array(96));
assert.deepEqual(silence, { loudness: 0, bass: 0, mids: 0, treble: 0, centroid: 0, rms: 0 });
const tone = new Uint8Array(96).fill(255);
const features = spectralFeatures(tone);
assert.equal(features.loudness, 1);
assert.ok(features.bass > 0.3 && features.treble > 0.3);
assert.ok(Math.abs(features.centroid - (47.5 / 96)) < 1e-12);

const dna = makeMusicDNA("track-a", 120, [features, silence], "2026-09-13T00:00:00.000Z");
assert.equal(dna?.schemaVersion, 2);
assert.equal(dna?.status, "PARTIAL");
assert.equal(dna?.id, dna?.trackId);
assert.equal(dna?.meanLoudness, 0.5);
assert.equal(dna?.trackId, "track-a");
assert.equal(makeMusicDNA("track-a", 120, []), undefined);
assert.deepEqual(MUSIC_ANALYSIS_LIMITS.fftSize, { low: 512, balanced: 2048, high: 4096 });
assert.equal(MUSIC_ANALYSIS_LIMITS.visualUpdateIntervalMs, 50);
assert.equal(MUSIC_ANALYSIS_LIMITS.maxSectionSamples, 3600);

assert.deepEqual(analyzeSections([], 60), []);
const sections = analyzeSections([0.1, 0.1, 0.8, 0.8, 0.1], 100);
assert.equal(sections[0].label, "INTRO");
assert.ok(sections.length <= 5);
assert.ok(sections.every((section) => section.confidence <= 0.8));
assert.equal(migrateMusicDNA({ id: "old", schemaVersion: 1, trackId: "old", durationSeconds: 30, meanLoudness: 0.4, spectralCentroid: 0.6, bass: 0.5, mids: 0.3, treble: 0.2, updatedAt: "2026-09-13" })?.schemaVersion, 2);

const specialist = musicSpecialist;
assert.ok(!specialist.capabilities.includes("EXECUTE" as never));
assert.match(specialist.suggest({ id: "a", name: "Demo", artist: "", durationMs: 0, mimeType: "audio/wav", sizeBytes: 1, addedAt: "" }), /Demo/);
void (async () => {
  const visual = await new LocalVisualGenerationProvider().generate({ prompt: "noite azul", style: "abstrato", createdAt: "" });
  assert.match(visual.description, /noite azul/);
  console.log("Music DSP, DNA, section heuristic, advisor boundary, and local provider regression passed.");
})();
