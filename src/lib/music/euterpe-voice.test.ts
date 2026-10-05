import assert from "node:assert/strict";
import { euterpeVoiceProvider } from "./euterpe-voice";

void (async () => {
  assert.equal(euterpeVoiceProvider.available, false);
  assert.equal(euterpeVoiceProvider.id, "browser-voice-pt-BR");
  assert.equal(euterpeVoiceProvider.speechToText.available, false);
  assert.equal(euterpeVoiceProvider.textToSpeech.available, false);
  await assert.rejects(euterpeVoiceProvider.startListening(() => assert.fail("A transcrição não deve ser simulada")), /não está disponível neste navegador/i);
  await assert.rejects(euterpeVoiceProvider.speak("teste"), /não está disponível neste navegador/i);
  assert.doesNotThrow(() => euterpeVoiceProvider.stopSpeaking());
  console.log("Euterpe browser voice reports unavailable capabilities honestly when no browser audio APIs exist.");
})();
