import assert from "node:assert/strict";
import { speakEuterpeText } from "./euterpe-browser-speech";

const calls: string[] = [];
const spoken: SpeechSynthesisUtterance[] = [];
const fakeSpeech = {
  cancel: () => calls.push("cancel"),
  speak: (utterance: SpeechSynthesisUtterance) => { calls.push("speak"); spoken.push(utterance); },
} as Pick<SpeechSynthesis, "speak" | "cancel">;
const utterance = { text: "A música transforma emoções em som.", lang: "", rate: 1, pitch: 1 } as SpeechSynthesisUtterance;

assert.equal(speakEuterpeText(utterance.text, fakeSpeech, () => utterance), utterance);
assert.deepEqual(calls, ["cancel", "speak"]);
assert.equal(spoken[0].lang, "pt-BR");
assert.equal(spoken[0].rate, 0.96);
assert.equal(spoken[0].pitch, 1.04);
assert.equal(spoken[0].text, utterance.text);
console.log("Euterpe speech cancels overlapping playback and requests a Brazilian Portuguese voice.");
