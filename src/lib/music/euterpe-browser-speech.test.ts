import assert from "node:assert/strict";
import { selectEuterpeVoice, speakEuterpeText } from "./euterpe-browser-speech";

const calls: string[] = [];
const spoken: SpeechSynthesisUtterance[] = [];
const fakeSpeech = {
  cancel: () => calls.push("cancel"),
  speak: (utterance: SpeechSynthesisUtterance) => { calls.push("speak"); spoken.push(utterance); },
  getVoices: () => [],
} as Pick<SpeechSynthesis, "speak" | "cancel">;
const utterance = { text: "A música transforma emoções em som.", lang: "", rate: 1, pitch: 1 } as SpeechSynthesisUtterance;

assert.equal(speakEuterpeText(utterance.text, fakeSpeech, () => utterance), utterance);
assert.deepEqual(calls, ["cancel", "speak"]);
assert.equal(spoken[0].lang, "pt-BR");
assert.equal(spoken[0].rate, 0.9);
assert.equal(spoken[0].pitch, 1.08);
assert.equal(spoken[0].text, utterance.text);
const preferred = { name: "Google português do Brasil", lang: "pt-BR", localService: false } as SpeechSynthesisVoice;
const fallback = { name: "English Voice", lang: "en-US", localService: true } as SpeechSynthesisVoice;
assert.equal(selectEuterpeVoice([fallback, preferred]), preferred);
console.log("Euterpe speech cancels overlap, prefers Brazilian voices, and uses a softer speaking profile.");
