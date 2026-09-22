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
console.log("Account artwork takes precedence across devices and does not restore cleared cloud assets.");
