import assert from "node:assert/strict";
import { euterpeVoiceProvider } from "./euterpe-voice";

void (async () => {
  assert.equal(euterpeVoiceProvider.available, false);
  assert.equal(euterpeVoiceProvider.id, "unconfigured");
  assert.equal(euterpeVoiceProvider.speechToText.available, false);
  assert.equal(euterpeVoiceProvider.textToSpeech.available, false);
  await assert.rejects(euterpeVoiceProvider.startListening(() => assert.fail("A transcrição não deve ser simulada")), /ainda não está configurad[oa]/);
  await assert.rejects(euterpeVoiceProvider.speak("teste"), /ainda não está configurad[oa]/);
  assert.doesNotThrow(() => euterpeVoiceProvider.stopSpeaking());
  console.log("Euterpe voice contracts remain explicit and do not simulate microphone input or speech.");
})();
