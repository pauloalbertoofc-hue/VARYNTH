import assert from "node:assert/strict";
import { getCameraModeProfile } from "./camera-types";

const modes = ["AUTO", "SMART", "PRO", "DOCUMENT", "VIDEO", "STUDIO"] as const;
for (const mode of modes) {
  const profile = getCameraModeProfile(mode);
  assert.equal(profile.mode, mode);
  assert.ok(profile.constraints.video);
}
assert.equal(getCameraModeProfile("VIDEO").constraints.audio, true);
assert.equal(getCameraModeProfile("PRO").requiresHardwareControls, true);
