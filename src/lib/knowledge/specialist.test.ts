import assert from "node:assert/strict";
import { askSpecialist } from "./protocol";

(async () => {
  const response = await askSpecialist({ requester: "justitia", domain: "music", query: "harmony", purpose: "cross-agent technical question" });
  assert.equal(response.specialistAgent, "euterpe");
  assert.equal(response.packet.constraints.includes("O pacote não contém raciocínio interno."), true);
  console.log("Knowledge specialist consultation tests passed");
})();
