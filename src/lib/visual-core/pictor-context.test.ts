import assert from "node:assert/strict";
import { sanitizePictorVisualContext } from "./pictor-context";

const result = sanitizePictorVisualContext({ captureId: "  cap-1 ", mode: "DOCUMENT", generated: false, blob: "secret", long: "x".repeat(300) });
assert.deepEqual(result, { captureId: "cap-1", mode: "DOCUMENT", generated: false });
assert.equal(sanitizePictorVisualContext(null), undefined);
console.log("Pictor context contract passed: whitelist and bounds are enforced.");
