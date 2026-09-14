import assert from "node:assert/strict";
import { euterpeVoiceProvider } from "./euterpe-voice";

void (async () => {
  assert.equal(euterpeVoiceProvider.available, false);
  assert.equal(euterpeVoiceProvider.id, "unconfigured");
  await assert.rejects(euterpeVoiceProvider.startListening(() => assert.fail("A transcrição não deve ser simulada")), /ainda não está configurada/);
  console.log("Euterpe voice contract remains explicit and does not simulate microphone input.");
})();
