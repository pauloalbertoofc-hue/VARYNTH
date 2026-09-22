import assert from "node:assert/strict";
import { createTrackVisualIdentity } from "./visual-identity";
const identity = createTrackVisualIdentity("track-1", "2026-01-01T00:00:00.000Z");
assert.equal(identity.trackId, "track-1"); assert.equal(identity.cover.source, "PROCEDURAL"); assert.equal(identity.background.renderer, "PROCEDURAL"); assert.ok(identity.environment.anchors.length); assert.equal(identity.audioReactive, "NORMAL");
console.log("TrackVisualIdentity separates cover, background, environment, animation and reactivity.");
