import assert from "node:assert/strict";
import { resolveAccountArtwork } from "./visual-artwork-persistence";

assert.deepEqual(resolveAccountArtwork(
  { cover: "/api/music/tracks/id/artwork?kind=cover" },
  { cover: "/api/music/tracks/id/artwork?kind=cover", background: "data:image/gif;base64,local" },
  { cover: "data:image/svg+xml;base64,new", background: "data:image/svg+xml;base64,new-bg" },
), { cover: "/api/music/tracks/id/artwork?kind=cover", background: "data:image/gif;base64,local" });
assert.deepEqual(resolveAccountArtwork(
  {},
  { cover: "/api/music/tracks/old/artwork?kind=cover" },
  { cover: "data:image/svg+xml;base64,fresh" },
), { cover: "data:image/svg+xml;base64,fresh", background: undefined });
assert.deepEqual(resolveAccountArtwork(
  { coverCleared: true, background: "/api/music/tracks/id/artwork?kind=background" },
  { cover: "data:image/gif;base64,stale-local", background: "data:image/gif;base64,old-background" },
  { cover: "data:image/svg+xml;base64,generated", background: "data:image/svg+xml;base64,generated-background" },
), { cover: undefined, background: "/api/music/tracks/id/artwork?kind=background", coverCleared: true });
assert.deepEqual(resolveAccountArtwork(
  {},
  { cover: "data:image/gif;base64,stale-local", coverCleared: true },
  { cover: "data:image/svg+xml;base64,generated" },
), { cover: undefined, background: undefined, coverCleared: true });
assert.deepEqual(resolveAccountArtwork(
  { cover: "/api/music/tracks/id/artwork?kind=cover" },
  { cover: "data:image/gif;base64,stale-local", coverCleared: true },
), { cover: "/api/music/tracks/id/artwork?kind=cover", background: undefined });
console.log("Account artwork persists clears across devices and lets a replacement cover restore normally.");
