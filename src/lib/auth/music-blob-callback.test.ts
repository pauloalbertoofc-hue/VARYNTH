import assert from "node:assert/strict";
import { isMusicBlobCallbackRequest } from "./music-blob-callback";

for (const path of ["/api/music/upload", "/api/music/artwork/upload"]) {
  assert.equal(isMusicBlobCallbackRequest("POST", path, "signed-callback"), true);
  assert.equal(isMusicBlobCallbackRequest("POST", path, null), false);
  assert.equal(isMusicBlobCallbackRequest("POST", path, "  "), false);
  assert.equal(isMusicBlobCallbackRequest("GET", path, "signed-callback"), false);
}

assert.equal(isMusicBlobCallbackRequest("POST", "/api/music/artwork", "signed-callback"), false);
assert.equal(isMusicBlobCallbackRequest("POST", "/api/music/artwork/upload/extra", "signed-callback"), false);
console.log("Only signed POST callbacks for Music audio/artwork uploads bypass browser-session proxy auth.");
