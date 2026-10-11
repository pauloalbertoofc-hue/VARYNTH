import { strict as assert } from "node:assert";
import { getCameraMedia, saveCameraMedia } from "./camera-library";

(async () => {
  assert.equal(await saveCameraMedia("server-test", new Blob(["frame"], { type: "text/plain" })), false);
  assert.equal(await getCameraMedia("server-test"), null);
  console.log("Camera media tests passed: server boundary fails closed without IndexedDB.");
})();
