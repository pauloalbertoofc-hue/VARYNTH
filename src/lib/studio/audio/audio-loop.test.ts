import { crossfadeLoopChannels } from "./audio-loop";

const source = Float32Array.from([0, 0.1, 0.2, 0.3, -0.2, -0.1, 0]);
const loop = crossfadeLoopChannels([source], 1000, 2, 7, 2);
if (loop.loopStartFrame !== 4 || loop.loopEndFrame !== 7 || loop.crossfadeFrames !== 2) throw new Error("Crossfade loop bounds were not shifted by the seam length");
if (loop.channels[0][5] !== source[5] || loop.channels[0][6] !== source[3] || loop.channels[0][4] !== source[4]) throw new Error("Equal-power seam endpoints must meet the head/tail source samples");
if (Math.abs(source[5] + 0.1) > 1e-6 || loop.channels[0] === source) throw new Error("Crossfade must not mutate or alias source audio");
const noFade = crossfadeLoopChannels([source], 1000, 2, 7, 0);
if (noFade.loopStartFrame !== 2 || noFade.crossfadeFrames !== 0 || noFade.channels[0][4] !== source[4]) throw new Error("Zero crossfade must preserve legacy loop boundaries and samples");
let invalidRejected = false;
try { crossfadeLoopChannels([source], 1000, 2, 7, 2.6); } catch (error) { invalidRejected = error instanceof Error && error.message.includes("AUDIO_LOOP_CROSSFADE_INVALID"); }
if (!invalidRejected) throw new Error("A crossfade longer than half the loop must fail closed");
console.log("Audio loop tests passed: equal-power seams, exact bounds, source immutability and legacy zero-crossfade behavior.");
