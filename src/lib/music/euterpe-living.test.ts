import assert from "node:assert/strict";
import { idlePhase, idleRestPosition, selectRestSpot, detectPlatformCapabilities } from "./euterpe-living";
assert.equal(idlePhase(1_000), "ACTIVE_IDLE"); assert.equal(idlePhase(40_000), "RELAXED_IDLE"); assert.equal(idlePhase(181_000), "REST_ELIGIBLE");
assert.equal(selectRestSpot([{ id: "controls", x: .8, y: .8, posture: "SIT", blocksControls: true }, { id: "safe", x: .2, y: .8, posture: "SIT", blocksControls: false }])?.id, "safe");
assert.deepEqual(idleRestPosition(), { x: .88, y: .57 });
assert.equal(detectPlatformCapabilities().capabilities.visualOverlay, false);
console.log("Euterpe idle phases, rest spot selection and honest platform capabilities passed.");
